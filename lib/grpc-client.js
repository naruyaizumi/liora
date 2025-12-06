import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { join } from 'path';

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
      const PROTO_PATH = join(process.cwd(), 'lib/protos/ai.proto');

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
      console.log('✓ gRPC AI Client connected');

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

  async chat(options = {}) {
    if (!this.isConnected) {
      throw new Error('AI service not connected');
    }

    const {
      userId,
      chatId,
      message,
      systemMessage = null,
      includeHistory = true,
      maxTokens = 1000,
      temperature = 0.7,
      mediaBuffer = null,
      mediaMime = null
    } = options;

    if (!userId || !chatId || !message) {
      throw new Error('userId, chatId, and message are required');
    }

    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 60);

      const payload = {
        user_id: userId,
        chat_id: chatId,
        message: message,
        system_message: systemMessage,
        include_history: includeHistory,
        max_tokens: maxTokens,
        temperature: temperature
      };

      if (mediaBuffer) {
        payload.media = mediaBuffer;
        if (mediaMime) payload.media_mime = mediaMime;
      }

      this.client.Chat(payload, { deadline }, (error, response) => {
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
      });
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
