package internal

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"go.uber.org/zap"
)

type Client struct {
	client *anthropic.Client
	cfg *config.Config
	logger *zap.Logger
}

type Message struct {
	Role string
	Content []ContentBlock
}

type ContentBlock struct {
	Type string
	Text string
	ImageData []byte
	MediaType string
}

type ChatRequest struct {
	Messages []Message
	SystemMessage string
	MaxTokens int
	Temperature float32
	Model string
}

type ChatResponse struct {
	Content string
	StopReason string
	InputTokens int
	OutputTokens int
	TotalTokens  int
}

func NewClient(cfg *config.Config, logger *zap.Logger) *Client {
	client := anthropic.NewClient(
		anthropic.WithAPIKey(cfg.AnthropicAPIKey),
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
		content := make([]anthropic.ContentBlockParamUnion, 0)
		
		for _, block := range msg.Content {
			if block.Type == "text" {
				content = append(content, anthropic.NewTextBlock(block.Text))
			} else if block.Type == "image" && len(block.ImageData) > 0 {
				encoded := base64.StdEncoding.EncodeToString(block.ImageData)
				content = append(content, anthropic.NewImageBlockParam(
					anthropic.ImageBlockParamSourceBase64{
						Type:      anthropic.F(anthropic.ImageBlockParamSourceBase64TypeBase64),
						MediaType: anthropic.F(anthropic.ImageBlockParamSourceBase64MediaType(block.MediaType)),
						Data:      anthropic.F(encoded),
					},
				))
			} else if block.Type == "document" && len(block.ImageData) > 0 {
				encoded := base64.StdEncoding.EncodeToString(block.ImageData)
				content = append(content, anthropic.NewDocumentBlockParam(
					anthropic.DocumentBlockParamSourceBase64{
						Type:      anthropic.F(anthropic.DocumentBlockParamSourceBase64TypeBase64),
						MediaType: anthropic.F(anthropic.DocumentBlockParamSourceBase64MediaType(block.MediaType)),
						Data:      anthropic.F(encoded),
					},
				))
			}
		}

		messages = append(messages, anthropic.NewUserMessage(content...))
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
		switch v := block.(type) {
		case anthropic.ContentBlockText:
			content.WriteString(v.Text)
		}
	}

	return &ChatResponse{
		Content: content.String(),
		StopReason: string(response.StopReason),
		InputTokens: int(response.Usage.InputTokens),
		OutputTokens: int(response.Usage.OutputTokens),
		TotalTokens: int(response.Usage.InputTokens + response.Usage.OutputTokens),
	}, nil
}

func (c *Client) ProcessMediaBuffer(buffer []byte, mimeType string) (ContentBlock, error) {
	if len(buffer) == 0 {
		return ContentBlock{}, fmt.Errorf("empty buffer")
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
		if !isValidImageType(mimeType) {
			return ContentBlock{}, fmt.Errorf("unsupported image type: %s", mimeType)
		}
		return ContentBlock{
			Type: "image",
			ImageData: buffer,
			MediaType: mimeType,
		}, nil
	case "application":
		if mimeType == "application/pdf" {
			return ContentBlock{
				Type: "document",
				ImageData: buffer,
				MediaType: mimeType,
			}, nil
		}
		return ContentBlock{}, fmt.Errorf("unsupported application type: %s", mimeType)
	default:
		return ContentBlock{}, fmt.Errorf("unsupported media type: %s", mimeType)
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

func isValidImageType(mimeType string) bool {
	validTypes := []string{"image/jpeg", "image/png", "image/gif", "image/webp"}
	for _, t := range validTypes {
		if t == mimeType {
			return true
		}
	}
	return false
}

func (c *Client) Close() error {
	c.logger.Info("Claude client closed")
	return nil
}