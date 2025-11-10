// src/index.ts
import { Hookified } from "hookified";

// src/memory/message.ts
var defaultMemoryId = "@qified/memory";
var MemoryMessageProvider = class {
    _subscriptions;
    _id;
    /**
     * Creates an instance of MemoryMessageProvider.
     * @param {MemoryMessageProviderOptions} options - Optional configuration for the provider.
     */
    constructor(options) {
        this._subscriptions = /* @__PURE__ */ new Map();
        this._id = options?.id ?? defaultMemoryId;
    }
    /**
     * Gets the provider ID for the memory message provider.
     * @returns {string} The provider ID.
     */
    get id() {
        return this._id;
    }
    /**
     * Sets the provider ID for the memory message provider.
     * @param {string} id The new provider ID.
     */
    set id(id) {
        this._id = id;
    }
    /**
     * Gets the subscriptions map for all topics.
     * @returns {Map<string, TopicHandler[]>} The subscriptions map.
     */
    get subscriptions() {
        return this._subscriptions;
    }
    /**
     * Sets the subscriptions map.
     * @param {Map<string, TopicHandler[]>} value The new subscriptions map.
     */
    set subscriptions(value) {
        this._subscriptions = value;
    }
    /**
     * Publishes a message to a specified topic.
     * All handlers subscribed to the topic will be called synchronously in order.
     * @param {string} topic The topic to publish the message to.
     * @param {Message} message The message to publish.
     * @returns {Promise<void>} A promise that resolves when all handlers have been called.
     */
    async publish(topic, message) {
        const messageWithProvider = {
            ...message,
            providerId: this._id,
        };
        const subscriptions = this._subscriptions.get(topic) ?? [];
        for (const subscription of subscriptions) {
            await subscription.handler(messageWithProvider);
        }
    }
    /**
     * Subscribes to a specified topic.
     * @param {string} topic The topic to subscribe to.
     * @param {TopicHandler} handler The handler to process incoming messages.
     * @returns {Promise<void>} A promise that resolves when the subscription is complete.
     */
    async subscribe(topic, handler) {
        if (!this._subscriptions.has(topic)) {
            this._subscriptions.set(topic, []);
        }
        this._subscriptions.get(topic)?.push(handler);
    }
    /**
     * Unsubscribes from a specified topic.
     * If an ID is provided, only the handler with that ID is removed.
     * If no ID is provided, all handlers for the topic are removed.
     * @param {string} topic The topic to unsubscribe from.
     * @param {string} [id] Optional identifier for the subscription to remove.
     * @returns {Promise<void>} A promise that resolves when the unsubscription is complete.
     */
    async unsubscribe(topic, id) {
        if (id) {
            const subscriptions = this._subscriptions.get(topic);
            if (subscriptions) {
                this._subscriptions.set(
                    topic,
                    subscriptions.filter((sub) => sub.id !== id)
                );
            }
        } else {
            this._subscriptions.delete(topic);
        }
    }
    /**
     * Disconnects and clears all subscriptions.
     * @returns {Promise<void>} A promise that resolves when the disconnection is complete.
     */
    async disconnect() {
        this._subscriptions.clear();
    }
};

// src/index.ts
var QifiedEvents = /* @__PURE__ */ ((QifiedEvents2) => {
    QifiedEvents2["error"] = "error";
    QifiedEvents2["info"] = "info";
    QifiedEvents2["warn"] = "warn";
    QifiedEvents2["publish"] = "publish";
    QifiedEvents2["subscribe"] = "subscribe";
    QifiedEvents2["unsubscribe"] = "unsubscribe";
    QifiedEvents2["disconnect"] = "disconnect";
    return QifiedEvents2;
})(QifiedEvents || {});
var Qified = class extends Hookified {
    _messageProviders = [];
    /**
     * Creates an instance of Qified.
     * @param {QifiedOptions} options - Optional configuration for Qified.
     */
    constructor(options) {
        super(options);
        if (options?.messageProviders) {
            if (Array.isArray(options?.messageProviders)) {
                this._messageProviders = options.messageProviders;
            } else {
                this._messageProviders = [options?.messageProviders];
            }
        }
    }
    /**
     * Gets or sets the message providers.
     * @returns {MessageProvider[]} The array of message providers.
     */
    get messageProviders() {
        return this._messageProviders;
    }
    /**
     * Sets the message providers.
     * @param {MessageProvider[]} providers - The array of message providers to set.
     */
    set messageProviders(providers) {
        this._messageProviders = providers;
    }
    /**
     * Subscribes to a topic. If you have multiple message providers, it will subscribe to the topic on all of them.
     * @param {string} topic - The topic to subscribe to.
     * @param {TopicHandler} handler - The handler to call when a message is published to the topic.
     */
    async subscribe(topic, handler) {
        try {
            const promises = this._messageProviders.map(async (provider) =>
                provider.subscribe(topic, handler)
            );
            await Promise.all(promises);
            this.emit("subscribe" /* subscribe */, { topic, handler });
        } catch (error) {
            this.emit("error" /* error */, error);
        }
    }
    /**
     * Publishes a message to a topic. If you have multiple message providers, it will publish the message to all of them.
     * @param {string} topic - The topic to publish to.
     * @param {Message} message - The message to publish.
     */
    async publish(topic, message) {
        try {
            const promises = this._messageProviders.map(async (provider) =>
                provider.publish(topic, message)
            );
            await Promise.all(promises);
            this.emit("publish" /* publish */, { topic, message });
        } catch (error) {
            this.emit("error" /* error */, error);
        }
    }
    /**
     * Unsubscribes from a topic. If you have multiple message providers, it will unsubscribe from the topic on all of them.
     * If an ID is provided, it will unsubscribe only that handler. If no ID is provided, it will unsubscribe all handlers for the topic.
     * @param topic - The topic to unsubscribe from.
     * @param id - The optional ID of the handler to unsubscribe. If not provided, all handlers for the topic will be unsubscribed.
     */
    async unsubscribe(topic, id) {
        try {
            const promises = this._messageProviders.map(async (provider) =>
                provider.unsubscribe(topic, id)
            );
            await Promise.all(promises);
            this.emit("unsubscribe" /* unsubscribe */, { topic, id });
        } catch (error) {
            this.emit("error" /* error */, error);
        }
    }
    /**
     * Disconnects from all providers.
     * This method will call the `disconnect` method on each message provider.
     */
    async disconnect() {
        try {
            const promises = this._messageProviders.map(async (provider) => provider.disconnect());
            await Promise.all(promises);
            this._messageProviders = [];
            this.emit("disconnect" /* disconnect */);
        } catch (error) {
            this.emit("error" /* error */, error);
        }
    }
};
export { MemoryMessageProvider, Qified, QifiedEvents };
