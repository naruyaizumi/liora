/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import path from "path";
import { BufferJSON } from "baileys";
import pino from "pino";

export const DEFAULT_DB = path.join(process.cwd(), "database", "auth.db");

export const logger = pino({
    level: "debug",
    base: { module: "AUTH SESSION" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

export const stringify = (obj) => JSON.stringify(obj, BufferJSON.replacer);

export const parse = (str) => {
    if (!str) return null;
    try {
        return JSON.parse(str, BufferJSON.reviver);
    } catch (e) {
        logger.error(e.message);
        return null;
    }
};

export const makeKey = (type, id) => `${type}-${id}`;
