#!/usr/bin/env python3
import os
import asyncio
import grpc
from concurrent import futures
try:
    from openai import AsyncOpenAI
except Exception:
    from openai import OpenAI as AsyncOpenAI  # type: ignore
import ai_pb2
import ai_pb2_grpc
import redis.asyncio as redis
import psycopg
from datetime import datetime, timedelta
import json
import base64
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

class AIService(ai_pb2_grpc.AIServiceServicer):
    def __init__(self):
        # PAT token from GitHub Models (or any OpenAI-compatible endpoint)
        self.token = os.getenv("PAT_TOKEN") or os.getenv("GITHUB_TOKEN")
        if not self.token:
            raise ValueError("PAT_TOKEN/GITHUB_TOKEN not found in environment variables")

        # Base URL for the GitHub Models inference endpoint.
        # You can override via env GITHUB_MODELS_BASE_URL.
        # Default here chosen to match common GitHub Models docs, change if your provider requires another host.
        self.base_url = os.getenv("GITHUB_MODELS_BASE_URL", "https://models.github.ai/inference")
        # Model name -- set to the model you have access to via GitHub Models
        self.model = os.getenv("MODEL_NAME", "gpt-5")

        # Initialize AsyncOpenAI client pointed at base_url so it talks to GitHub Models
        try:
            self.client = AsyncOpenAI(api_key=self.token, base_url=self.base_url)
        except TypeError:
            self.client = AsyncOpenAI(api_key=self.token)
            # Note: if your client does not support base_url param, set environment OPENAI_API_BASE or use another client wrapper.

        self.redis_client = None
        self.cache_ttl = int(os.getenv("CACHE_TTL", "300"))
        self.pg_conn = None

    async def initialize(self):
        """Initialize async connections"""
        # Redis
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self.redis_client = await redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            print("✓ Redis connected")
        except Exception as e:
            print(f"⚠ Redis connection failed: {e}")
            self.redis_client = None

        # Postgres (psycopg async)
        try:
            pg_dsn = os.getenv("POSTGRES_DSN", "postgresql://liora: naruyaizumi@localhost:5432/ai")
            self.pg_conn = await psycopg.AsyncConnection.connect(pg_dsn, autocommit=True)
            print("✓ PostgreSQL connected")
            await self._create_tables()
        except Exception as e:
            print(f"⚠ PostgreSQL connection failed: {e}")
            self.pg_conn = None

    async def _create_tables(self):
        """Create necessary database tables"""
        if not self.pg_conn:
            return

        async with self.pg_conn.cursor() as cur:
            await cur.execute("""
                CREATE TABLE IF NOT EXISTS chat_history (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(100) NOT NULL,
                    chat_id VARCHAR(100) NOT NULL,
                    role VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    model VARCHAR(50),
                    tokens_used INTEGER
                );
            """)
            await cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_chat_history_user 
                ON chat_history(user_id, timestamp DESC);
            """)

            # Attempt to enable pgvector (optional)
            try:
                await cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                await cur.execute("""
                    CREATE TABLE IF NOT EXISTS embeddings (
                        id SERIAL PRIMARY KEY,
                        user_id VARCHAR(100) NOT NULL,
                        content TEXT NOT NULL,
                        embedding vector(1536),
                        metadata JSONB,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                await cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_embeddings_user 
                    ON embeddings(user_id);
                """)
                print("✓ pgvector enabled for RAG (if available)")
            except Exception as e:
                print(f"⚠ pgvector not available or failed to create embeddings table: {e}")

    async def _get_cache_key(self, user_id: str, query: str) -> str:
        """Generate cache key"""
        return f"ai:cache:{user_id}:{abs(hash(query))}"

    async def _get_cached_response(self, cache_key: str) -> Optional[str]:
        """Get cached response from Redis"""
        if not self.redis_client:
            return None
        try:
            cached = await self.redis_client.get(cache_key)
            return cached
        except Exception as e:
            print(f"Cache read error: {e}")
            return None

    async def _set_cached_response(self, cache_key: str, response: str):
        """Cache response in Redis"""
        if not self.redis_client:
            return
        try:
            await self.redis_client.setex(cache_key, self.cache_ttl, response)
        except Exception as e:
            print(f"Cache write error: {e}")

    async def _get_conversation_history(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Retrieve conversation history from PostgreSQL"""
        if not self.pg_conn:
            return []
        try:
            async with self.pg_conn.cursor() as cur:
                await cur.execute("""
                    SELECT role, content, timestamp 
                    FROM chat_history 
                    WHERE user_id = %s 
                    ORDER BY timestamp DESC 
                    LIMIT %s
                """, (user_id, limit))
                rows = await cur.fetchall()
                history = [{"role": row[0], "content": row[1]} for row in reversed(rows)]
                return history
        except Exception as e:
            print(f"History retrieval error: {e}")
            return []

    async def _save_to_history(self, user_id: str, chat_id: str, role: str, content: str, model: str, tokens_used: int = 0):
        """Save message to PostgreSQL"""
        if not self.pg_conn:
            return
        try:
            async with self.pg_conn.cursor() as cur:
                await cur.execute("""
                    INSERT INTO chat_history 
                    (user_id, chat_id, role, content, model, tokens_used)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (user_id, chat_id, role, content, model, tokens_used))
        except Exception as e:
            print(f"History save error: {e}")

    async def _check_rate_limit(self, user_id: str) -> bool:
        """Check rate limit using Redis"""
        if not self.redis_client:
            return True
        try:
            key = f"ratelimit:{user_id}"
            count = await self.redis_client.incr(key)
            if count == 1:
                await self.redis_client.expire(key, 60)
            # Allow <= 20 requests per minute by default
            return count <= int(os.getenv("RATE_LIMIT_PER_MIN", "20"))
        except Exception as e:
            print(f"Rate limit check error: {e}")
            return True

    async def Chat(self, request, context):
        """Handle chat completion request (supports optional media bytes)"""
        try:
            if not await self._check_rate_limit(request.user_id):
                return ai_pb2.ChatResponse(
                    success=False,
                    message="Rate limit exceeded. Please wait a moment.",
                    tokens_used=0
                )

            cache_key = await self._get_cache_key(request.user_id, request.message or "")
            cached_response = await self._get_cached_response(cache_key)
            if cached_response:
                return ai_pb2.ChatResponse(
                    success=True,
                    message=cached_response,
                    tokens_used=0,
                    from_cache=True
                )

            # Build message payload for Responses API (OpenAI-compatible / GitHub Models)
            # We'll structure messages as a list of role/content objects, each content is a dict with type/input_text.
            messages_payload = []

            system_message = request.system_message or (
                "You are a helpful AI assistant integrated into a WhatsApp bot. "
                "Provide concise, accurate, and friendly responses. "
                "Keep answers clear and to the point."
            )
            messages_payload.append({
                "role": "system",
                "content": [{"type": "input_text", "text": system_message}]
            })

            if request.include_history:
                history = await self._get_conversation_history(request.user_id, limit=10)
                for h in history:
                    messages_payload.append({
                        "role": h.get("role", "user"),
                        "content": [{"type": "input_text", "text": h.get("content", "")}]
                    })

            user_content = [{"type": "input_text", "text": request.message or ""}]

            if getattr(request, "media", None):
                try:
                    b64 = base64.b64encode(request.media).decode("utf-8")
                    mime = request.media_mime or "application/octet-stream"
                    data_uri = f"data:{mime};base64,{b64}"
                    user_content.append({"type": "input_image", "image_url": data_uri})
                except Exception as e:
                    print(f"Media processing error: {e}")

            messages_payload.append({
                "role": "user",
                "content": user_content
            })

            await self._save_to_history(
                request.user_id,
                request.chat_id,
                "user",
                request.message or "",
                self.model
            )

            # Call the Responses API via AsyncOpenAI client (GitHub Models-compatible base_url)
            # Note: Some OpenAI client versions use positional args or different kwargs. This is a generally compatible call.
            response = await self.client.responses.create(
                model=self.model,
                input=messages_payload,
                max_output_tokens=int(request.max_tokens or 1000),
                temperature=float(request.temperature or 0.7)
            )

            assistant_message = None
            assistant_message = getattr(response, "output_text", None)
            if not assistant_message:
                parts = []
                for item in getattr(response, "output", []) or []:
                    # item may be a dict-like object with 'type' == 'message'
                    try:
                        if item.get("type") == "message":
                            for c in item.get("content", []):
                                if c.get("type") in ("output_text", "text"):
                                    parts.append(c.get("text", ""))
                    except Exception:
                        # Some SDKs return objects not dicts; try attribute access
                        try:
                            if item.type == "message":
                                for c in item.content:
                                    if c.type in ("output_text", "text"):
                                        parts.append(c.text)
                        except Exception:
                            pass
                assistant_message = "\n".join(parts).strip()

            if not assistant_message:
                assistant_message = "[no text output from model]"

            tokens_used = 0
            try:
                usage = getattr(response, "usage", None) or {}
                if isinstance(usage, dict):
                    tokens_used = int(usage.get("total_tokens") or usage.get("prompt_tokens", 0) + usage.get("completion_tokens", 0))
                else:
                    tokens_used = int(getattr(usage, "total_tokens", 0) or 0)
            except Exception:
                tokens_used = 0

            await self._save_to_history(
                request.user_id,
                request.chat_id,
                "assistant",
                assistant_message,
                self.model,
                tokens_used
            )

            # cache
            await self._set_cached_response(cache_key, assistant_message)

            return ai_pb2.ChatResponse(
                success=True,
                message=assistant_message,
                tokens_used=tokens_used,
                from_cache=False
            )

        except Exception as e:
            print(f"Chat error: {e}")
            return ai_pb2.ChatResponse(
                success=False,
                message=f"Error: {str(e)}",
                tokens_used=0
            )

    async def GetHistory(self, request, context):
        """Retrieve conversation history"""
        try:
            history = await self._get_conversation_history(request.user_id, limit=request.limit or 50)
            history_items = [ai_pb2.HistoryItem(role=item["role"], content=item["content"]) for item in history]
            return ai_pb2.HistoryResponse(success=True, history=history_items)
        except Exception as e:
            print(f"History retrieval error: {e}")
            return ai_pb2.HistoryResponse(success=False, history=[])

    async def ClearHistory(self, request, context):
        """Clear conversation history"""
        if not self.pg_conn:
            return ai_pb2.ClearResponse(success=False, message="Database not available")
        try:
            async with self.pg_conn.cursor() as cur:
                await cur.execute("DELETE FROM chat_history WHERE user_id = %s", (request.user_id,))
            return ai_pb2.ClearResponse(success=True, message="History cleared successfully")
        except Exception as e:
            print(f"Clear history error: {e}")
            return ai_pb2.ClearResponse(success=False, message=f"Error: {str(e)}")


async def serve():
    """Start gRPC server"""
    service = AIService()
    await service.initialize()

    server = grpc.aio.server(
        futures.ThreadPoolExecutor(max_workers=int(os.getenv("GRPC_MAX_WORKERS", "10"))),
        options=[
            ('grpc.max_send_message_length', 50 * 1024 * 1024),
            ('grpc.max_receive_message_length', 50 * 1024 * 1024),
        ]
    )

    ai_pb2_grpc.add_AIServiceServicer_to_server(service, server)

    listen_addr = os.getenv("GRPC_LISTEN", "127.0.0.1:50051")
    server.add_insecure_port(listen_addr)

    print(f"🚀 AI Service starting on {listen_addr}")
    print(f"📦 Model: {service.model}")
    print(f"🔗 Endpoint: {service.base_url}")

    await server.start()
    await server.wait_for_termination()


if __name__ == '__main__':
    asyncio.run(serve())
