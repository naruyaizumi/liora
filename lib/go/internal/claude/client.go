package claude

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"path/filepath"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/liora/ai/internal/config"
	"go.uber.org/zap"
)

type Client struct {
	client *anthropic.Client
	cfg    *config.Config
	logger *zap.Logger
}

type Message struct {
	Role    string
	Content []anthropic.MessageParamContentUnion
}

type ChatRequest struct {
	Messages      []Message
	SystemMessage string
	MaxTokens     int
	Temperature   float32
	Model         string
}

type ChatResponse struct {
	Content     string
	StopReason  string
	InputTokens int
	OutputTokens int
	TotalTokens int
}

func NewClient(cfg *config.Config, logger *zap.Logger) *Client {
	client := anthropic.NewClient(
		option.WithAPIKey(cfg.AnthropicAPIKey),
	)

	return &Client{
		client: client,
		cfg:    cfg,
		logger: logger,
	}
}

func (c *Client) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	if req.MaxTokens == 0 {
		req.MaxTokens = c.cfg.MaxTokens
	}
	if req.Temperature == 0 {
		req.Temperature = c.cfg.Temperature
	}
	if req.Model == "" {
		req.Model = "claude-opus-4-20250514"
	}

	messages := make([]anthropic.MessageParam, 0, len(req.Messages))
	for _, msg := range req.Messages {
		messages = append(messages, anthropic.MessageParam{
			Role:    anthropic.F(anthropic.MessageParamRole(msg.Role)),
			Content: anthropic.F(msg.Content),
		})
	}

	params := anthropic.MessageNewParams{
		Model: anthropic.F(req.Model),
		MaxTokens: anthropic.Int(int64(req.MaxTokens)),
		Messages: anthropic.F(messages),
	}

	if req.SystemMessage != "" {
		params.System = anthropic.F([]anthropic.TextBlockParam{
			anthropic.NewTextBlock(req.SystemMessage),
		})
	}

	if req.Temperature != 0.7 {
		params.Temperature = anthropic.Float(float64(req.Temperature))
	}

	response, err := c.client.Messages.New(ctx, params)
	if err != nil {
		c.logger.Error("Claude API error", zap.Error(err))
		return nil, fmt.Errorf("claude api error: %w", err)
	}

	var content strings.Builder
	for _, block := range response.Content {
		if textBlock, ok := block.AsUnion().(anthropic.TextBlock); ok {
			content.WriteString(textBlock.Text)
		}
	}

	return &ChatResponse{
		Content:      content.String(),
		StopReason:   string(response.StopReason),
		InputTokens:  int(response.Usage.InputTokens),
		OutputTokens: int(response.Usage.OutputTokens),
		TotalTokens:  int(response.Usage.InputTokens + response.Usage.OutputTokens),
	}, nil
}

func (c *Client) CreateTextContent(text string) anthropic.MessageParamContentUnion {
	return anthropic.NewTextBlock(text)
}

func (c *Client) CreateImageContent(imageData []byte, mediaType string) (anthropic.MessageParamContentUnion, error) {
	if mediaType == "" {
		mediaType = "image/jpeg"
	}
	
	supportedTypes := []string{
		"image/jpeg", "image/png", "image/gif", "image/webp",
	}
	isSupported := false
	for _, t := range supportedTypes {
		if t == mediaType {
			isSupported = true
			break
		}
	}
	if !isSupported {
		return nil, fmt.Errorf("unsupported image type: %s", mediaType)
	}

	encoded := base64.StdEncoding.EncodeToString(imageData)

	return anthropic.NewImageBlockBase64(mediaType, encoded), nil
}

func (c *Client) CreateDocumentContent(docData []byte, mediaType string) (anthropic.MessageParamContentUnion, error) {
	if mediaType == "" {
		mediaType = "application/pdf"
	}

	if mediaType != "application/pdf" {
		return nil, fmt.Errorf("only PDF documents are supported, got: %s", mediaType)
	}

	encoded := base64.StdEncoding.EncodeToString(docData)

	return anthropic.NewDocumentBlockBase64(mediaType, encoded), nil
}

func (c *Client) ProcessMediaBuffer(buffer []byte, mimeType string) (anthropic.MessageParamContentUnion, error) {
	if len(buffer) == 0 {
		return nil, fmt.Errorf("empty buffer")
	}

	if mimeType == "" {
		mimeType = c.detectMimeType(buffer)
	}

	c.logger.Info("Processing media", 
		zap.String("mime_type", mimeType),
		zap.Int("size", len(buffer)),
	)

	mainType := strings.Split(mimeType, "/")[0]
	
	switch mainType {
	case "image":
		return c.CreateImageContent(buffer, mimeType)
	case "application":
		if mimeType == "application/pdf" {
			return c.CreateDocumentContent(buffer, mimeType)
		}
		return nil, fmt.Errorf("unsupported application type: %s", mimeType)
	default:
		return nil, fmt.Errorf("unsupported media type: %s", mimeType)
	}
}

func (c *Client) detectMimeType(buffer []byte) string {
	if len(buffer) < 4 {
		return "application/octet-stream"
	}

	if buffer[0] == 0x89 && buffer[1] == 0x50 && buffer[2] == 0x4E && buffer[3] == 0x47 {
		return "image/png"
	}

	if buffer[0] == 0xFF && buffer[1] == 0xD8 && buffer[2] == 0xFF {
		return "image/jpeg"
	}

	if buffer[0] == 0x47 && buffer[1] == 0x49 && buffer[2] == 0x46 {
		return "image/gif"
	}

	if len(buffer) >= 12 && string(buffer[0:4]) == "RIFF" && string(buffer[8:12]) == "WEBP" {
		return "image/webp"
	}

	if len(buffer) >= 5 && string(buffer[0:5]) == "%PDF-" {
		return "application/pdf"
	}

	return "application/octet-stream"
}

func (c *Client) GetMimeTypeFromFilename(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		return "application/octet-stream"
	}
	return mimeType
}

func (c *Client) ValidateMediaSize(size int) error {
	const maxSize = 32 * 1024 * 1024
	if size > maxSize {
		return fmt.Errorf("media size %d exceeds maximum %d bytes", size, maxSize)
	}
	return nil
}

func (c *Client) CountTokens(ctx context.Context, messages []Message, systemMessage string) (int, error) {
	msgParams := make([]anthropic.MessageParam, 0, len(messages))
	for _, msg := range messages {
		msgParams = append(msgParams, anthropic.MessageParam{
			Role:    anthropic.F(anthropic.MessageParamRole(msg.Role)),
			Content: anthropic.F(msg.Content),
		})
	}

	params := anthropic.MessageCountTokensParams{
		Model:    anthropic.F("claude-opus-4-20250514"),
		Messages: anthropic.F(msgParams),
	}

	if systemMessage != "" {
		params.System = anthropic.F([]anthropic.TextBlockParam{
			anthropic.NewTextBlock(systemMessage),
		})
	}

	response, err := c.client.Messages.CountTokens(ctx, params)
	if err != nil {
		return 0, fmt.Errorf("token count error: %w", err)
	}

	return int(response.InputTokens), nil
}

func (c *Client) Close() error {
	c.logger.Info("Claude client closed")
	return nil
}