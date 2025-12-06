package database

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/liora/lib/go/internal"
	"go.uber.org/zap"
)

type DB struct {
	pool   *pgxpool.Pool
	logger *zap.Logger
}

type ChatHistory struct {
	ID int64 `json:"id"`
	UserID string `json:"user_id"`
	ChatID string `json:"chat_id"`
	Role string `json:"role"`
	Content string `json:"content"`
	Timestamp time.Time `json:"timestamp"`
	Model string `json:"model"`
	TokensUsed int `json:"tokens_used"`
	MediaType string `json:"media_type,omitempty"`
}

func NewDB(cfg *config.Config, logger *zap.Logger) (*DB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	poolConfig, err := pgxpool.ParseConfig(cfg.PostgresDSN())
	if err != nil {
		return nil, fmt.Errorf("unable to parse database config: %w", err)
	}

	poolConfig.MaxConns = 20
	poolConfig.MinConns = 5
	poolConfig.MaxConnLifetime = time.Hour
	poolConfig.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	db := &DB{
		pool:   pool,
		logger: logger,
	}

	if err := db.createTables(ctx); err != nil {
		return nil, fmt.Errorf("unable to create tables: %w", err)
	}

	logger.Info("✓ PostgreSQL connected and tables created")
	return db, nil
}

func (db *DB) createTables(ctx context.Context) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS chat_history (
			id SERIAL PRIMARY KEY,
			user_id VARCHAR(100) NOT NULL,
			chat_id VARCHAR(100) NOT NULL,
			role VARCHAR(20) NOT NULL,
			content TEXT NOT NULL,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			model VARCHAR(50),
			tokens_used INTEGER DEFAULT 0,
			media_type VARCHAR(50),
			metadata JSONB
		)`,
		`CREATE INDEX IF NOT EXISTS idx_chat_history_user 
		 ON chat_history(user_id, timestamp DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_chat_history_chat 
		 ON chat_history(chat_id, timestamp ASC)`,
	}

	for _, query := range queries {
		if _, err := db.pool.Exec(ctx, query); err != nil {
			return fmt.Errorf("failed to execute query: %w", err)
		}
	}

	if _, err := db.pool.Exec(ctx, "CREATE EXTENSION IF NOT EXISTS vector"); err != nil {
		db.logger.Warn("pgvector extension not available", zap.Error(err))
	} else {
		embedQuery := `CREATE TABLE IF NOT EXISTS embeddings (
			id SERIAL PRIMARY KEY,
			user_id VARCHAR(100) NOT NULL,
			content TEXT NOT NULL,
			embedding vector(1536),
			metadata JSONB,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`
		if _, err := db.pool.Exec(ctx, embedQuery); err != nil {
			db.logger.Warn("failed to create embeddings table", zap.Error(err))
		} else {
			db.logger.Info("✓ pgvector enabled for RAG")
		}
	}

	return nil
}

func (db *DB) SaveMessage(ctx context.Context, msg *ChatHistory) error {
	query := `
		INSERT INTO chat_history (user_id, chat_id, role, content, model, tokens_used, media_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, timestamp
	`

	err := db.pool.QueryRow(
		ctx, query,
		msg.UserID, msg.ChatID, msg.Role, msg.Content,
		msg.Model, msg.TokensUsed, msg.MediaType,
	).Scan(&msg.ID, &msg.Timestamp)

	if err != nil {
		db.logger.Error("failed to save message", zap.Error(err))
		return fmt.Errorf("failed to save message: %w", err)
	}

	return nil
}

func (db *DB) GetHistory(ctx context.Context, userID string, limit int) ([]ChatHistory, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT id, user_id, chat_id, role, content, timestamp, 
		       COALESCE(model, '') as model, 
		       COALESCE(tokens_used, 0) as tokens_used,
		       COALESCE(media_type, '') as media_type
		FROM chat_history
		WHERE user_id = $1
		ORDER BY timestamp DESC
		LIMIT $2
	`

	rows, err := db.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query history: %w", err)
	}
	defer rows.Close()

	var history []ChatHistory
	for rows.Next() {
		var msg ChatHistory
		err := rows.Scan(
			&msg.ID, &msg.UserID, &msg.ChatID, &msg.Role,
			&msg.Content, &msg.Timestamp, &msg.Model,
			&msg.TokensUsed, &msg.MediaType,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}
		history = append(history, msg)
	}

	for i, j := 0, len(history)-1; i < j; i, j = i+1, j-1 {
		history[i], history[j] = history[j], history[i]
	}

	return history, nil
}

func (db *DB) GetChatHistory(ctx context.Context, chatID string, limit int) ([]ChatHistory, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, user_id, chat_id, role, content, timestamp, 
		       COALESCE(model, '') as model, 
		       COALESCE(tokens_used, 0) as tokens_used,
		       COALESCE(media_type, '') as media_type
		FROM chat_history
		WHERE chat_id = $1
		ORDER BY timestamp ASC
		LIMIT $2
	`

	rows, err := db.pool.Query(ctx, query, chatID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query chat history: %w", err)
	}
	defer rows.Close()

	var history []ChatHistory
	for rows.Next() {
		var msg ChatHistory
		err := rows.Scan(
			&msg.ID, &msg.UserID, &msg.ChatID, &msg.Role,
			&msg.Content, &msg.Timestamp, &msg.Model,
			&msg.TokensUsed, &msg.MediaType,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}
		history = append(history, msg)
	}

	return history, nil
}

func (db *DB) ClearHistory(ctx context.Context, userID string) error {
	query := `DELETE FROM chat_history WHERE user_id = $1`
	
	result, err := db.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to clear history: %w", err)
	}

	rowsAffected := result.RowsAffected()
	db.logger.Info("history cleared",
		zap.String("user_id", userID),
		zap.Int64("rows_deleted", rowsAffected),
	)

	return nil
}

func (db *DB) GetStats(ctx context.Context, userID string) (map[string]interface{}, error) {
	query := `
		SELECT 
			COUNT(*) as total_messages,
			COUNT(DISTINCT chat_id) as total_chats,
			SUM(COALESCE(tokens_used, 0)) as total_tokens,
			MAX(timestamp) as last_message
		FROM chat_history
		WHERE user_id = $1
	`

	var stats struct {
		TotalMessages int64
		TotalChats    int64
		TotalTokens   int64
		LastMessage   time.Time
	}

	err := db.pool.QueryRow(ctx, query, userID).Scan(
		&stats.TotalMessages,
		&stats.TotalChats,
		&stats.TotalTokens,
		&stats.LastMessage,
	)

	if err != nil && err != pgx.ErrNoRows {
		return nil, fmt.Errorf("failed to get stats: %w", err)
	}

	return map[string]interface{}{
		"total_messages": stats.TotalMessages,
		"total_chats":    stats.TotalChats,
		"total_tokens":   stats.TotalTokens,
		"last_message":   stats.LastMessage,
	}, nil
}

func (db *DB) Close() {
	db.pool.Close()
	db.logger.Info("✓ PostgreSQL connection closed")
}