[![logo.svg](https://qified.org/logo.svg)](https://qified.org)

[![tests](https://github.com/jaredwray/qified/actions/workflows/tests.yaml/badge.svg)](https://github.com/jaredwray/qified/actions/workflows/tests.yaml)
[![GitHub license](https://img.shields.io/github/license/jaredwray/qified)](https://github.com/jaredwray/qified/blob/master/LICENSE)
[![codecov](https://codecov.io/gh/jaredwray/qified/graph/badge.svg?token=jcRdy8SkOG)](https://codecov.io/gh/jaredwray/qified)
[![npm](https://img.shields.io/npm/dm/qified)](https://npmjs.com/package/qified)
[![npm](https://img.shields.io/npm/v/qified)](https://npmjs.com/package/qified)

# qified

Task and Message Queues with Multiple Providers

## NOTE: This is a work in progress and not ready for production use. Please wait till v1.0.0 is released.

# Features

- Simple Message Queue for Processing Messages
- Simple Message Format `Message`
- Easily Send a Message `publish()`
- Easily Subscribe to a message Queue `subscribe()`
- Simple Task Format `Task` (Coming in v1.0.0)
- Easily Send a Task `enqueue()` (Coming in v1.0.0)
- Easily Subscribe to a Task Queue `dequeue()` (Coming in v1.0.0)
- Simple Acknowledge `Acknowledge()` in handler (Coming in v1.0.0)
- Async/Await Built In By Default
- Written in Typescript, Nodejs Last Two Versions, ESM and CJS
- Events and Hooks for all major actions via [Hookified](https://hookified.org)
- Customizable Serialize / Deserialize Handlers (Coming in v1.0.0)
- Customizable Compress / Decompress Handlers (Coming in v1.0.0)
- Provider Fail Over Support

# Installation

```bash
pnpm add qified
```

# Quick Start

```js
import { Qified, MemoryMessageProvider } from "qified";

// Create a new Qified instance with a memory provider
const qified = new Qified({
    messageProviders: new MemoryMessageProvider(),
});

// Subscribe to a topic
await qified.subscribe("notifications", {
    id: "notificationHandler",
    handler: async (message) => {
        console.log("Received:", message.data);
    },
});

// Publish a message
await qified.publish("notifications", {
    id: "msg-1",
    data: { text: "Hello, World!" },
});

// Clean up
await qified.disconnect();
```

# Constructor

```js
new Qified(options?: QifiedOptions)
```

**Options:**

- `messageProviders?: MessageProvider | MessageProvider[]` - a provider or Array of message providers to use
- `taskProviders?: TaskProvider[]` - Array of task providers to use

**Example:**

```js
import { Qified, MemoryMessageProvider } from "qified";

const qified = new Qified({
    messageProviders: new MemoryMessageProvider(),
});
```

# Properties

### `messageProviders: MessageProvider[]`

Get or set the array of message providers. This property allows you to dynamically manage which message providers are active in your Qified instance.

**Type:** `MessageProvider[]`

**Access:** Read/Write

**Description:**

- **Getter**: Returns the current array of message providers being used
- **Setter**: Replaces all current message providers with a new array

**Use Cases:**

- Inspect which providers are currently configured
- Add or remove providers dynamically at runtime
- Replace all providers with a new set
- Migrate from one provider to another

**Example:**

```typescript
import { Qified, MemoryMessageProvider } from "qified";
import { NatsMessageProvider } from "@qified/nats";
import { RedisMessageProvider } from "@qified/redis";

const qified = new Qified({
    messageProviders: new MemoryMessageProvider(),
});

// Get current providers
const providers = qified.messageProviders;
console.log(`Currently using ${providers.length} provider(s)`);

// Add another provider
qified.messageProviders = [new MemoryMessageProvider(), new NatsMessageProvider()];

// Replace all providers
qified.messageProviders = [new RedisMessageProvider({ uri: "redis://localhost:6379" })];

// Access provider properties
qified.messageProviders.forEach((provider) => {
    console.log("Provider ID:", provider.id);
});
```

**Important Notes:**

- Setting this property does **not** automatically disconnect existing providers
- You should call `disconnect()` on old providers before replacing them to clean up resources
- All operations (`subscribe`, `publish`, `unsubscribe`) will execute across all providers in this array

# Methods

## subscribe

Subscribe to a topic to receive messages. If multiple message providers are configured, this will subscribe on all of them.

**Parameters:**

- `topic: string` - The topic to subscribe to
- `handler: TopicHandler` - Object containing an optional `id` and a `handler` function

**Example:**

```js
await qified.subscribe("user-events", {
    id: "userEventHandler",
    handler: async (message) => {
        console.log("User event:", message.data);
    },
});
```

## publish

Publish a message to a topic. If multiple message providers are configured, this will publish to all of them.

**Parameters:**

- `topic: string` - The topic to publish to
- `message: Message` - The message object to publish

**Example:**

```js
await qified.publish("user-events", {
    id: "evt-123",
    data: {
        userId: "user-456",
        action: "login",
        timestamp: Date.now(),
    },
    headers: {
        "content-type": "application/json",
    },
});
```

## unsubscribe

Unsubscribe from a topic. If an `id` is provided, only that handler is unsubscribed. Otherwise, all handlers for the topic are unsubscribed.

**Parameters:**

- `topic: string` - The topic to unsubscribe from
- `id?: string` - Optional handler ID. If not provided, all handlers are unsubscribed

**Example:**

```js
// Unsubscribe a specific handler
await qified.unsubscribe("user-events", "userEventHandler");

// Unsubscribe all handlers for a topic
await qified.unsubscribe("user-events");
```

## disconnect`

Disconnect from all providers and clean up resources.

**Example:**

```js
await qified.disconnect();
```

# Events

Qified extends [Hookified](https://hookified.org) and emits events for all major operations. You can listen to these events to add custom logging, monitoring, or error handling.

# Available Events

The following events are available via the `QifiedEvents` enum:

- `QifiedEvents.publish` - Emitted after a message is successfully published
- `QifiedEvents.subscribe` - Emitted after successfully subscribing to a topic
- `QifiedEvents.unsubscribe` - Emitted after successfully unsubscribing from a topic
- `QifiedEvents.disconnect` - Emitted after successfully disconnecting from all providers
- `QifiedEvents.error` - Emitted when an error occurs during any operation
- `QifiedEvents.info` - Emitted for informational messages
- `QifiedEvents.warn` - Emitted for warning messages

# Listening to Events

Use the `on()` method to listen to events:

```js
import { Qified, MemoryMessageProvider, QifiedEvents } from "qified";

const qified = new Qified({
    messageProviders: new MemoryMessageProvider(),
});

// Listen for publish events
await qified.on(QifiedEvents.publish, async (data) => {
    console.log("Message published to topic:", data.topic);
    console.log("Message:", data.message);
});

// Listen for subscribe events
await qified.on(QifiedEvents.subscribe, async (data) => {
    console.log("Subscribed to topic:", data.topic);
    console.log("Handler ID:", data.handler.id);
});

// Listen for unsubscribe events
await qified.on(QifiedEvents.unsubscribe, async (data) => {
    console.log("Unsubscribed from topic:", data.topic);
    if (data.id) {
        console.log("Handler ID:", data.id);
    }
});

// Listen for disconnect events
await qified.on(QifiedEvents.disconnect, async () => {
    console.log("Disconnected from all providers");
});

// Listen for errors
await qified.on(QifiedEvents.error, async (error) => {
    console.error("Error occurred:", error);
});

// Now perform operations
await qified.subscribe("events", {
    id: "handler1",
    handler: async (message) => {
        console.log("Received:", message.data);
    },
});

await qified.publish("events", {
    id: "msg-1",
    data: { text: "Hello!" },
});

await qified.unsubscribe("events", "handler1");
await qified.disconnect();
```

### Error Handling with Events

Events provide a centralized way to handle errors across all operations:

```js
import { Qified, QifiedEvents } from "qified";
import { NatsMessageProvider } from "@qified/nats";

const qified = new Qified({
    messageProviders: new NatsMessageProvider(),
});

// Centralized error handler
await qified.on(QifiedEvents.error, async (error) => {
    console.error("Qified error:", error.message);
    // Send to error tracking service
    // Log to file
    // Send alert
});

// Errors from publish, subscribe, etc. will be caught and emitted
await qified.publish("topic", { id: "1", data: { test: true } });
```

# Providers

There are multiple providers available to use:

- Memory - this is built into the current `qified` library as `MemoryMessageProvider`.
- [@qified/redis](packages/redis/README.md) - Redis Provider
- [@qified/rabbitmq](packages/rabbitmq/README.md) - RabbitMQ Provider
- [@qified/nats](packages/nats/README.md) - NATS Provider
- [@qified/zeromq](packages/zeromq/README.md) - ZeroMQ Provider

# Development and Testing

Qified is written in TypeScript and tests are written in `vitest`. To run the tests, use the following command:

1. `pnpm install` - This will install all the dependencies
2. `pnpm test:services:start` - This will start the services needed for testing (Redis, RabbitMQ, etc)
3. `pnpm test` - This will run the tests

To contribute follow the [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

# License

[MIT & © Jared Wray](LICENSE)
