package internal

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
	pb "liora-ai/pb"
)

type AIServer struct {
	pb.UnimplementedAIServiceServer
	claude *claude.Client
	db *database.DB
	cache *cache.Cache
	cfg *config.Config
	logger *zap.Logger
}

func NewAIServer(
	claudeClient *claude.Client,
	db *database.DB,
	cache *cache.Cache,
	cfg *config.Config,
	logger *zap.Logger,
) *AIServer {
	return &AIServer{
		claude: claudeClient,
		db: db,
		cache: cache,
		cfg: cfg,
		logger: logger,
	}
}

func (s *AIServer) Chat(ctx context.Context, req *pb.ChatRequest) (*pb.ChatResponse, error) {
	startTime := time.Now()
	s.logger.Info("chat request received",
		zap.String("user_id", req.UserId),
		zap.String("chat_id", req.ChatId),
		zap.Int("message_length", len(req.Message)),
	)

	if req.UserId == "" || req.ChatId == "" || req.Message == "" {
		return &pb.ChatResponse{
			Success: false,
			Message: "user_id, chat_id, and message are required",
		}, nil
	}

	allowed, err := s.cache.CheckRateLimit(ctx, req.UserId, s.cfg.RateLimit, time.Minute)
	if err != nil {
		s.logger.Error("rate limit check failed", zap.Error(err))
	}
	if !allowed {
		return &pb.ChatResponse{
			Success: false,
			Message: "Rate limit exceeded. Please wait a moment.",
		}, nil
	}

	cachedResponse, found, err := s.cache.Get(ctx, req.UserId, req.Message)
	if err != nil {
		s.logger.Warn("cache get failed", zap.Error(err))
	}
	if found && cachedResponse != "" {
		s.logger.Info("cache hit", zap.String("user_id", req.UserId))
		return &pb.ChatResponse{
			Success:   true,
			Message:   cachedResponse,
			FromCache: true,
		}, nil
	}

	messages := []claude.Message{}

	if req.IncludeHistory {
		history, err := s.db.GetChatHistory(ctx, req.ChatId, 10)
		if err != nil {
			s.logger.Warn("failed to get history", zap.Error(err))
		} else {
			for _, h := range history {
				if h.MediaType == "" {
					messages = append(messages, claude.Message{
						Role: h.Role,
						Content: []claude.ContentBlock{
							{Type: "text", Text: h.Content},
						},
					})
				}
			}
		}
	}

	currentContent := []claude.ContentBlock{
		{Type: "text", Text: req.Message},
	}

	if len(req.MediaData) > 0 {
		mediaBlock, err := s.claude.ProcessMediaBuffer(req.MediaData, req.MediaType)
		if err != nil {
			s.logger.Error("failed to process media", zap.Error(err))
			return &pb.ChatResponse{
				Success: false,
				Message: fmt.Sprintf("Failed to process media: %v", err),
			}, nil
		}
		currentContent = append(currentContent, mediaBlock)
		s.logger.Info("media processed",
			zap.String("media_type", req.MediaType),
			zap.Int("size", len(req.MediaData)),
		)
	}

	messages = append(messages, claude.Message{
		Role: "user",
		Content: currentContent,
	})

	userMsg := &database.ChatHistory{
		UserID: req.UserId,
		ChatID: req.ChatId,
		Role: "user",
		Content: req.Message,
		Model: "claude-opus-4-20250514",
		MediaType: req.MediaType,
	}
	if err := s.db.SaveMessage(ctx, userMsg); err != nil {
		s.logger.Warn("failed to save user message", zap.Error(err))
	}

	maxTokens := int(req.MaxTokens)
	if maxTokens == 0 {
		maxTokens = s.cfg.MaxTokens
	}

	temperature := req.Temperature
	if temperature == 0 {
		temperature = s.cfg.Temperature
	}

	chatReq := claude.ChatRequest{
		Messages: messages,
		SystemMessage: req.SystemMessage,
		MaxTokens: maxTokens,
		Temperature: temperature,
		Model: "claude-opus-4-20250514",
	}

	response, err := s.claude.Chat(ctx, chatReq)
	if err != nil {
		s.logger.Error("claude api error", zap.Error(err))
		return &pb.ChatResponse{
			Success: false,
			Message: fmt.Sprintf("AI service error: %v", err),
		}, nil
	}

	assistantMsg := &database.ChatHistory{
		UserID: req.UserId,
		ChatID: req.ChatId,
		Role: "assistant",
		Content: response.Content,
		Model: "claude-opus-4-20250514",
		TokensUsed: response.TotalTokens,
	}
	if err := s.db.SaveMessage(ctx, assistantMsg); err != nil {
		s.logger.Warn("failed to save assistant message", zap.Error(err))
	}

	if len(req.MediaData) == 0 {
		if err := s.cache.Set(ctx, req.UserId, req.Message, response.Content); err != nil {
			s.logger.Warn("failed to cache response", zap.Error(err))
		}
	}

	duration := time.Since(startTime)
	s.logger.Info("chat completed",
		zap.String("user_id", req.UserId),
		zap.Int("tokens", response.TotalTokens),
		zap.Duration("duration", duration),
	)

	return &pb.ChatResponse{
		Success: true,
		Message: response.Content,
		TokensUsed: int32(response.TotalTokens),
		FromCache:  false,
	}, nil
}

func (s *AIServer) GetHistory(ctx context.Context, req *pb.HistoryRequest) (*pb.HistoryResponse, error) {
	if req.UserId == "" {
		return &pb.HistoryResponse{Success: false}, nil
	}

	limit := int(req.Limit)
	if limit <= 0 {
		limit = 50
	}

	history, err := s.db.GetHistory(ctx, req.UserId, limit)
	if err != nil {
		s.logger.Error("failed to get history", zap.Error(err))
		return &pb.HistoryResponse{Success: false}, nil
	}

	items := make([]*pb.HistoryItem, len(history))
	for i, h := range history {
		items[i] = &pb.HistoryItem{
			Role: h.Role,
			Content: h.Content,
		}
	}

	return &pb.HistoryResponse{
		Success: true,
		History: items,
	}, nil
}

func (s *AIServer) ClearHistory(ctx context.Context, req *pb.ClearRequest) (*pb.ClearResponse, error) {
	if req.UserId == "" {
		return &pb.ClearResponse{
			Success: false,
			Message: "user_id is required",
		}, nil
	}

	if err := s.db.ClearHistory(ctx, req.UserId); err != nil {
		s.logger.Error("failed to clear history", zap.Error(err))
		return &pb.ClearResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to clear history: %v", err),
		}, nil
	}

	if err := s.cache.ClearUserCache(ctx, req.UserId); err != nil {
		s.logger.Warn("failed to clear cache", zap.Error(err))
	}

	return &pb.ClearResponse{
		Success: true,
		Message: "History cleared successfully",
	}, nil
}

func (s *AIServer) HealthCheck(ctx context.Context) error {
	_, err := s.db.GetStats(ctx, "healthcheck")
	if err != nil {
		return fmt.Errorf("database health check failed: %w", err)
	}

	if err := s.cache.Ping(ctx); err != nil {
		s.logger.Warn("cache health check failed", zap.Error(err))
	}

	return nil
}