package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AnthropicAPIKey string
	AdminKey string

	GRPCPort string
	GRPCHost string

	PostgresHost string
	PostgresPort string
	PostgresDB string
	PostgresUser string
	PostgresPassword string

	RedisHost string
	RedisPort string
	RedisPassword string
	RedisDB int

	MaxTokens int
	Temperature float32
	CacheTTL int
	RateLimit int

	LogLevel string
}

func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		fmt.Println("Warning: .env file not found, using environment variables")
	}

	cacheTTL, _ := strconv.Atoi(getEnv("CACHE_TTL", "300"))
	maxTokens, _ := strconv.Atoi(getEnv("MAX_TOKENS", "4096"))
	rateLimit, _ := strconv.Atoi(getEnv("RATE_LIMIT", "20"))
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))
	temp, _ := strconv.ParseFloat(getEnv("TEMPERATURE", "0.7"), 32)

	cfg := &Config{
		AnthropicAPIKey: getEnv("ANTHROPIC_API_KEY", ""),
		AdminKey: getEnv("ADMIN_KEY", ""),

		GRPCPort: getEnv("GRPC_PORT", "50051"),
		GRPCHost: getEnv("GRPC_HOST", "127.0.0.1"),

		PostgresHost: getEnv("POSTGRES_HOST", "localhost"),
		PostgresPort: getEnv("POSTGRES_PORT", "5432"),
		PostgresDB: getEnv("POSTGRES_DB", "ai"),
		PostgresUser: getEnv("POSTGRES_USER", "liora"),
		PostgresPassword: getEnv("POSTGRES_PASSWORD", "naruyaizumi"),

		RedisHost: getEnv("REDIS_HOST", "localhost"),
		RedisPort: getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB: redisDB,

		MaxTokens:   maxTokens,
		Temperature: float32(temp),
		CacheTTL:    cacheTTL,
		RateLimit:   rateLimit,

		LogLevel: getEnv("LOG_LEVEL", "info"),
	}

	if cfg.AnthropicAPIKey == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY is required")
	}

	return cfg, nil
}

func (c *Config) PostgresDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		c.PostgresHost, c.PostgresPort, c.PostgresUser, c.PostgresPassword, c.PostgresDB,
	)
}

func (c *Config) RedisAddr() string {
	return fmt.Sprintf("%s:%s", c.RedisHost, c.RedisPort)
}

func (c *Config) GRPCAddr() string {
	return fmt.Sprintf("%s:%s", c.GRPCHost, c.GRPCPort)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}