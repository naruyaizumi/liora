import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AIClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }

  async connect() {
    try {
      const PROTO_PATH = join(__dirname, 'protos', 'ai.proto');
      
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      });

      const aiProto = grpc.loadPackageDefinition(packageDefinition).ai;

      this.client = new aiProto.AIService(
        '127.0.0.1:50051',
        grpc.credentials.createInsecure(),
        {
          'grpc.max_send_message_length': 50 * 1024 * 1024,
          'grpc.max_receive_message_length': 50 * 1024 * 1024,
        }
      );

      await this._testConnection();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✓ gRPC AI Client connected (Claude Opus 4.5)');
      
      return true;
    } catch (error) {
      console.error('✗ gRPC connection failed:', error.message);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Retrying connection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        return this.connect();
      }
      
      throw new Error('Failed to connect to AI service after multiple attempts');
    }
  }

  async _testConnection() {
    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 5);

      this.client.Chat(
        {
          user_id: 'test',
          chat_id: 'test',
          message: 'ping',
          include_history: false,
          max_tokens: 10,
          temperature: 0.1
        },
        { deadline },
        (error) => {
          if (error && error.code === grpc.status.DEADLINE_EXCEEDED) {
            reject(new Error('Connection timeout'));
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Chat with Claude AI
   * @param {Object} options - Chat options
   * @param {string} options.userId - User ID
   * @param {string} options.chatId - Chat/Group ID
   * @param {string} options.message - Text message
   * @param {Buffer} [options.mediaBuffer] - Media buffer (image/pdf)
   * @param {string} [options.mimeType] - MIME type of media
   * @param {string} [options.systemMessage] - System prompt
   * @param {boolean} [options.includeHistory=true] - Include conversation history
   * @param {number} [options.maxTokens=4096] - Max tokens in response
   * @param {number} [options.temperature=0.7] - Temperature (0-1)
   * @returns {Promise<Object>} Response object
   */
  async chat(options = {}) {
    if (!this.isConnected) {
      throw new Error('AI service not connected');
    }

    const {
      userId,
      chatId,
      message,
      mediaBuffer = null,
      mimeType = '',
      systemMessage = null,
      includeHistory = true,
      maxTokens = 4096,
      temperature = 0.7
    } = options;

    if (!userId || !chatId || !message) {
      throw new Error('userId, chatId, and message are required');
    }

    if (mediaBuffer && mediaBuffer.length > 32 * 1024 * 1024) {
      throw new Error('Media size exceeds 32MB limit');
    }

    const request = {
      user_id: userId,
      chat_id: chatId,
      message: message,
      system_message: systemMessage,
      include_history: includeHistory,
      max_tokens: maxTokens,
      temperature: temperature
    };

    if (mediaBuffer && Buffer.isBuffer(mediaBuffer)) {
      request.media_data = mediaBuffer;
      request.media_type = mimeType;
      console.log(`📎 Sending media: ${mimeType} (${mediaBuffer.length} bytes)`);
    }

    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 120);

      this.client.Chat(
        request,
        { deadline },
        (error, response) => {
          if (error) {
            console.error('gRPC Chat error:', error);
            reject(error);
          } else {
            resolve({
              success: response.success,
              message: response.message,
              tokensUsed: response.tokens_used,
              fromCache: response.from_cache || false
            });
          }
        }
      );
    });
  }

  async getHistory(userId, limit = 50) {
    if (!this.isConnected) {
      throw new Error('AI service not connected');
    }

    return new Promise((resolve, reject) => {
      this.client.GetHistory(
        {
          user_id: userId,
          limit: limit
        },
        (error, response) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              success: response.success,
              history: response.history
            });
          }
        }
      );
    });
  }

  async clearHistory(userId) {
    if (!this.isConnected) {
      throw new Error('AI service not connected');
    }

    return new Promise((resolve, reject) => {
      this.client.ClearHistory(
        {
          user_id: userId
        },
        (error, response) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              success: response.success,
              message: response.message
            });
          }
        }
      );
    });
  }

  disconnect() {
    if (this.client) {
      grpc.closeClient(this.client);
      this.isConnected = false;
      console.log('✓ gRPC AI Client disconnected');
    }
  }
}

let aiClientInstance = null;

export async function getAIClient() {
  if (!aiClientInstance) {
    aiClientInstance = new AIClient();
    await aiClientInstance.connect();
  }
  return aiClientInstance;
}

export default AIClient;