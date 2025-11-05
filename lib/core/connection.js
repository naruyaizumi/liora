/* global conn */
async function DisconnectReason(update) {
    global.__reconnect ??= {
        attempts: 0, // Number of consecutive reconnection attempts
        lastAt: 0, // Timestamp of last reconnection attempt
        cooldownUntil: 0, // Timestamp until which reconnections are blocked
        inflight: false, // Flag to prevent concurrent reconnection attempts
        timer: null, // Active reconnection timer reference
        keepAliveTimer: null, // Keep-alive heartbeat timer reference
    };

    /**
     * @param {number} baseMs - Base delay in milliseconds
     * @param {number} factor - Exponential growth factor
     * @param {number} maxMs - Maximum delay cap
     * @returns {number} Calculated delay with randomized jitter
     */
    const backoff = (baseMs, factor = 1.8, maxMs = 60_000) => {
        // Calculate exponential delay: baseMs * factor^(attempts-1)
        const n = Math.max(0, global.__reconnect.attempts - 1);
        const raw = Math.min(maxMs, Math.round(baseMs * Math.pow(factor, n)));

        // Add random jitter (20-50% of delay) to avoid synchronized reconnections
        const jitter = raw * (0.2 + Math.random() * 0.3);
        return Math.max(500, raw + Math.round((Math.random() < 0.5 ? -1 : 1) * jitter));
    };

    const dcReason = (() => {
        const e = lastDisconnect?.error;
        const raw =
            e?.output?.statusCode ?? // Boom error format
            e?.statusCode ?? // Standard HTTP status
            e?.code ?? // System/Node.js error code
            e?.errno ?? // Numeric error code
            (typeof e?.message === "string" && e.message.match(/\b\d{3,4}\b/)?.[0]) ??
            0;

        const code = String(raw).toUpperCase();
        switch (code) {
            case "1000":
                return "normal_closure"; // Clean connection close
            case "1001":
                return "server_going_away"; // Server shutdown/restart
            case "1002":
                return "protocol_error"; // WebSocket protocol violation
            case "1003":
                return "unsupported_data"; // Received unsupported data type
            case "1005":
                return "no_status_received"; // Expected status code missing
            case "1006":
                return "abnormal_closure"; // Connection lost without close frame
            case "1007":
                return "invalid_frame_payload"; // Data inconsistent with message type
            case "1008":
                return "policy_violation"; // Generic policy violation
            case "1009":
                return "message_too_big"; // Message exceeds size limit
            case "1010":
                return "mandatory_extension"; // Client requires unsupported extension
            case "1011":
                return "internal_error"; // Server encountered unexpected condition
            case "1012":
                return "service_restart"; // Server restarting
            case "1013":
                return "try_again_later"; // Temporary overload
            case "1014":
                return "bad_gateway"; // Gateway/proxy error
            case "1015":
                return "tls_handshake_failure"; // TLS handshake failed
            case "400":
                return "bad_request"; // Malformed request
            case "401":
                return "unauthorized"; // Authentication required
            case "403":
                return "forbidden"; // Access denied
            case "404":
                return "not_found"; // Resource not found
            case "405":
                return "method_not_allowed"; // HTTP method not supported
            case "408":
                return "request_timeout"; // Request took too long
            case "409":
                return "conflict"; // Resource state conflict
            case "410":
                return "gone"; // Resource permanently removed
            case "412":
                return "precondition_failed"; // Conditional request failed
            case "413":
                return "payload_too_large"; // Request body too large
            case "415":
                return "unsupported_media_type"; // Content-Type not supported
            case "418":
                return "i_am_a_teapot"; // Easter egg / mock response
            case "421":
                return "misdirected_request"; // Request sent to wrong server
            case "425":
                return "too_early"; // Request sent before ready
            case "426":
                return "upgrade_required"; // Protocol upgrade needed
            case "428":
                return "replaced_by_another_session"; // Session taken over elsewhere
            case "429":
                return "rate_limited"; // Too many requests
            case "440":
                return "multi_device_migration"; // Multi-device setup change
            case "460":
                return "pairing_required"; // Device needs re-pairing
            case "463":
                return "device_removed"; // Device unlinked from account
            case "470":
                return "bad_provisioning"; // Invalid device provisioning
            case "471":
                return "stale_session"; // Session expired/outdated
            case "472":
                return "stale_socket"; // Socket connection outdated
            case "480":
                return "temporarily_unavailable"; // Service temporarily down
            case "481":
                return "transaction_does_not_exist"; // Invalid transaction ID
            case "482":
                return "loop_detected"; // Request loop detected
            case "488":
                return "not_acceptable_here"; // Request not acceptable
            case "489":
                return "bad_event"; // Invalid event data
            case "490":
                return "request_terminated"; // Request cancelled
            case "491":
                return "request_pending"; // Duplicate pending request
            case "495":
                return "invalid_ssl_cert"; // SSL certificate invalid
            case "496":
                return "ssl_cert_required"; // SSL certificate required
            case "497":
                return "http_to_https"; // HTTP used instead of HTTPS
            case "498":
                return "token_expired"; // Authentication token expired
            case "499":
                return "device_unpaired"; // Device no longer paired

            case "500":
                return "internal_server_error"; // Server-side error
            case "501":
                return "not_implemented"; // Feature not implemented
            case "502":
                return "bad_gateway"; // Invalid upstream response
            case "503":
                return "service_unavailable"; // Server overloaded/maintenance
            case "504":
                return "gateway_timeout"; // Upstream timeout
            case "505":
                return "http_version_not_supported"; // HTTP version not supported
            case "507":
                return "insufficient_storage"; // Server storage full
            case "511":
                return "network_authentication_required"; // Network auth needed

            case "515":
                return "protocol_violation"; // Protocol rules violated
            case "518":
                return "connection_replaced"; // Connection replaced by newer one
            case "540":
                return "too_many_sessions"; // Too many active sessions

            case "600":
                return "restart_required"; // App restart needed
            case "700":
                return "outdated_version"; // Client version too old

            case "ENOTFOUND":
                return "dns_error"; // Domain name not found
            case "EAI_AGAIN":
                return "dns_retry"; // DNS lookup timeout, retry

            case "ECONNRESET":
                return "connection_reset"; // Connection reset by peer
            case "ECONNREFUSED":
                return "connection_refused"; // Connection actively refused
            case "EHOSTUNREACH":
                return "host_unreachable"; // No route to host
            case "ENETUNREACH":
                return "network_unreachable"; // Network is unreachable
            case "EPIPE":
                return "broken_pipe"; // Write to closed pipe/socket
            case "EIO":
                return "io_failure"; // Input/output error
            case "ETIMEDOUT":
                return "network_timeout"; // Connection timeout

            case "EBUSY":
                return "resource_busy"; // Resource busy/locked
            case "EMFILE":
                return "too_many_open_files"; // Process file descriptor limit
            case "ENOSPC":
                return "no_space_left"; // Disk space exhausted
            case "EADDRINUSE":
                return "address_in_use"; // Port/address already in use
            case "EADDRNOTAVAIL":
                return "address_not_available"; // Address not available

            case "ERR_STREAM_DESTROYED":
                return "stream_destroyed"; // Stream already destroyed
            case "ERR_SOCKET_CLOSED":
                return "socket_closed"; // Socket already closed

            case "ERR_HTTP2_GOAWAY_SESSION":
                return "http2_goaway"; // HTTP/2 GOAWAY frame received

            case "ERR_SSL_WRONG_VERSION_NUMBER":
                return "tls_version_mismatch"; // TLS version incompatibility
            case "ERR_TLS_CERT_ALTNAME_INVALID":
                return "tls_cert_invalid"; // Certificate name mismatch
            case "ERR_TLS_HANDSHAKE_TIMEOUT":
                return "tls_handshake_timeout"; // TLS handshake timed out
            case "ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC":
                return "tls_decryption_failed"; // TLS decryption error
            case "ERR_SSL_EOF_IN_RECORD":
                return "tls_eof"; // Unexpected EOF in TLS record

            case "ERR_HTTP_HEADERS_SENT":
                return "headers_already_sent"; // Headers already sent
            case "ERR_HTTP_INVALID_HEADER_VALUE":
                return "invalid_http_header"; // Invalid HTTP header value

            default: {
                const msg = (e?.message || "").toLowerCase();
                if (!msg) return "unknown";
                if (msg.includes("logged out")) return "logged_out";
                if (msg.includes("replaced") && msg.includes("session"))
                    return "connection_replaced";
                if (msg.includes("connection closed")) return "connection_closed";
                if (msg.includes("timeout")) return "timeout";
                if (msg.includes("reset")) return "connection_reset";
                if (msg.includes("hang up")) return "socket_hangup";
                if (msg.includes("dns")) return "dns_error";
                if (msg.includes("ssl") || msg.includes("tls")) return "tls_error";
                if (msg.includes("unavailable")) return "server_unavailable";
                if (msg.includes("too many")) return "too_many_sessions";
                if (msg.includes("unauthoriz") || msg.includes("forbidden")) return "forbidden";
                if (msg.includes("unpaired")) return "device_unpaired";
                if (msg.includes("restart")) return "restart_required";
                if (msg.includes("memory")) return "memory_overload";
                if (msg.includes("overflow")) return "buffer_overflow";
                return "unknown";
            }
        }
    })();

    const startKeepAlive = () => {
        if (global.__reconnect.keepAliveTimer) return;
        global.__reconnect.keepAliveTimer = setInterval(() => {
            try {
                global.timestamp.lastTick = Date.now();
            } catch (e) {
                conn.logger.error(e);
            }
        }, 45_000);
    };

    const stopKeepAlive = () => {
        if (global.__reconnect.keepAliveTimer) {
            clearInterval(global.__reconnect.keepAliveTimer);
            global.__reconnect.keepAliveTimer = null;
        }
    };

    const tryRecover = () => {
        if (global.__reconnect.inflight) {
            return;
        }

        const now = Date.now();

        if (now < global.__reconnect.cooldownUntil) {
            const wait = global.__reconnect.cooldownUntil - now;
            conn.logger.warn(`Cooling down after repeated failures (${Math.ceil(wait / 1000)}s)…`);
            if (!global.__reconnect.timer) {
                global.__reconnect.timer = setTimeout(() => {
                    global.__reconnect.timer = null;
                    tryRecover();
                }, wait);
            }
            return;
        }

        let baseDelay = 1_000;
        let hardStop = false;

        switch (dcReason) {
            case "logged_out":
            case "device_unpaired":
            case "pairing_required":
                hardStop = true;
                break;

            case "rate_limited":
            case "too_many_requests":
            case "too_many_sessions":
                baseDelay = 15_000;
                break;

            case "dns_error":
            case "dns_retry":
            case "connection_reset":
            case "connection_refused":
            case "network_unreachable":
            case "host_unreachable":
            case "network_timeout":
            case "tls_version_mismatch":
            case "tls_cert_invalid":
            case "tls_handshake_timeout":
            case "tls_decryption_failed":
            case "tls_eof":
            case "http2_goaway":
                baseDelay = 5_000;
                break;

            case "service_unavailable":
            case "gateway_timeout":
            case "bad_gateway":
                baseDelay = 6_000;
                break;

            case "protocol_violation":
            case "restart_required":
            case "stale_session":
            case "stale_socket":
            case "connection_replaced":
            case "internal_error":
            case "internal_server_error":
                baseDelay = 2_000;
                break;

            default:
                baseDelay = 2_000;
        }

        if (hardStop) {
            global.__reconnect.attempts = 0;
            global.__reconnect.cooldownUntil = 0;
            stopKeepAlive();
            conn.logger.error(
                `Auto-reconnect disabled for reason: ${dcReason}. Manual action required.`
            );
            return;
        }

        const delay = backoff(baseDelay);

        if (global.__reconnect.attempts >= 6) {
            global.__reconnect.cooldownUntil = Date.now() + 5 * 60_000;
            global.__reconnect.attempts = 0;
            conn.logger.warn("Too many consecutive failures; entering 5m cooldown.");
            return;
        }

        global.__reconnect.inflight = true;
        global.__reconnect.timer = setTimeout(async () => {
            global.__reconnect.timer = null;
            try {
                await new Promise((r) => setTimeout(r, 200));

                await global.reloadHandler(true);

                global.__reconnect.attempts += 1;
                global.__reconnect.lastAt = Date.now();

                conn.logger.info(
                    `Reloaded session (attempt ${global.__reconnect.attempts}, reason: ${dcReason})`
                );
            } catch (e) {
                conn.logger.error(e);
                global.__reconnect.attempts += 1;
            } finally {
                global.__reconnect.inflight = false;
            }
        }, delay);

        conn.logger.warn(
            `Scheduling reconnect in ${Math.ceil(delay / 1000)}s (reason: ${dcReason})`
        );
    };

    if (isNewLogin) conn.isInit = true;

    switch (connection) {
        case "connecting":
            conn.logger.info("Connecting…");
            break;

        case "open":
            conn.logger.info("Connected to WhatsApp.");

            global.__reconnect.attempts = 0;
            global.__reconnect.cooldownUntil = 0;

            startKeepAlive();
            break;

        case "close":
            stopKeepAlive();
            conn.logger.warn(`Connection closed — reason=${dcReason}`);
            break;
    }

    if (lastDisconnect?.error) {
        if (["logged_out", "device_unpaired", "pairing_required"].includes(dcReason)) {
            conn.logger.error(`Session requires manual fix (${dcReason}). No auto-reconnect.`);
        } else {
            tryRecover();
        }
    }

    global.timestamp.connect = new Date();
}

export { DisconnectReason };
