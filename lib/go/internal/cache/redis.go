package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/liora/lib/go/internal/config"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type Cache struct {
	client *redis.Client
	ttl    time.Duration
	logger *zap.Logger
}

func NewCache(cfg *config.Config, logger *zap.Logger) (*Cache, error) {
	client := redis.NewClient(&redis.Options{
		Addr: cfg.RedisAddr(),
		Password: cfg.RedisPassword,
		DB: cfg.RedisDB,
		DialTimeout: 5 * time.Second,
		ReadTimeout: 3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolSize: 10,
		MinIdleConns: 5,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		logger.Warn("Redis connection failed, caching disabled", zap.Error(err))
		return &Cache{
			client: nil,
			ttl: time.Duration(cfg.CacheTTL) * time.Second,
			logger: logger,
		}, nil
	}

	logger.Info("✓ Redis connected")
	return &Cache{
		client: client,
		ttl: time.Duration(cfg.CacheTTL) * time.Second,
		logger: logger,
	}, nil
}

func (c *Cache) generateKey(userID, query string) string {
	data := fmt.Sprintf("%s:%s", userID, query)
	hash := sha256.Sum256([]byte(data))
	return fmt.Sprintf("ai:cache:%s", hex.EncodeToString(hash[:]))
}

func (c *Cache) Get(ctx context.Context, userID, query string) (string, bool, error) {
	if c.client == nil {
		return "", false, nil
	}

	key := c.generateKey(userID, query)
	
	val, err := c.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", false, nil
	}
	if err != nil {
		c.logger.Error("cache get error", zap.Error(err))
		return "", false, err
	}

	c.logger.Debug("cache hit", zap.String("key", key))
	return val, true, nil
}

func (c *Cache) Set(ctx context.Context, userID, query, response string) error {
	if c.client == nil {
		return nil
	}

	key := c.generateKey(userID, query)
	
	err := c.client.Set(ctx, key, response, c.ttl).Err()
	if err != nil {
		c.logger.Error("cache set error", zap.Error(err))
		return err
	}

	c.logger.Debug("cache set", zap.String("key", key))
	return nil
}

func (c *Cache) Delete(ctx context.Context, userID, query string) error {
	if c.client == nil {
		return nil
	}

	key := c.generateKey(userID, query)
	return c.client.Del(ctx, key).Err()
}

func (c *Cache) CheckRateLimit(ctx context.Context, userID string, limit int, window time.Duration) (bool, error) {
	if c.client == nil {
		return true, nil
	}

	key := fmt.Sprintf("ratelimit:%s", userID)
	
	count, err := c.client.Incr(ctx, key).Result()
	if err != nil {
		c.logger.Error("rate limit check error", zap.Error(err))
		return true, nil
	}

	if count == 1 {
		c.client.Expire(ctx, key, window)
	}

	allowed := count <= int64(limit)
	if !allowed {
		c.logger.Warn("rate limit exceeded",
			zap.String("user_id", userID),
			zap.Int64("count", count),
			zap.Int("limit", limit),
		)
	}

	return allowed, nil
}

func (c *Cache) GetRateLimitInfo(ctx context.Context, userID string) (current int64, ttl time.Duration, err error) {
	if c.client == nil {
		return 0, 0, nil
	}

	key := fmt.Sprintf("ratelimit:%s", userID)
	
	pipe := c.client.Pipeline()
	countCmd := pipe.Get(ctx, key)
	ttlCmd := pipe.TTL(ctx, key)
	
	_, err = pipe.Exec(ctx)
	if err != nil && err != redis.Nil {
		return 0, 0, err
	}

	count, _ := countCmd.Int64()
	ttlVal := ttlCmd.Val()
	
	return count, ttlVal, nil
}

func (c *Cache) ClearUserCache(ctx context.Context, userID string) error {
	if c.client == nil {
		return nil
	}

	pattern := fmt.Sprintf("ai:cache:*%s*", userID)
	
	iter := c.client.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		if err := c.client.Del(ctx, iter.Val()).Err(); err != nil {
			c.logger.Error("failed to delete cache key", zap.Error(err))
		}
	}
	
	if err := iter.Err(); err != nil {
		return fmt.Errorf("cache scan error: %w", err)
	}

	c.logger.Info("user cache cleared", zap.String("user_id", userID))
	return nil
}

func (c *Cache) GetStats(ctx context.Context) (map[string]interface{}, error) {
	if c.client == nil {
		return map[string]interface{}{
			"enabled": false,
		}, nil
	}

	info, err := c.client.Info(ctx, "stats").Result()
	if err != nil {
		return nil, err
	}

	dbSize, err := c.client.DBSize(ctx).Result()
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"enabled": true,
		"db_size": dbSize,
		"info": info,
		"ttl": c.ttl.String(),
	}, nil
}

func (c *Cache) Ping(ctx context.Context) error {
	if c.client == nil {
		return fmt.Errorf("redis client not initialized")
	}
	return c.client.Ping(ctx).Err()
}

func (c *Cache) Close() error {
	if c.client != nil {
		if err := c.client.Close(); err != nil {
			return err
		}
		c.logger.Info("✓ Redis connection closed")
	}
	return nil
}