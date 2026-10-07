/**
 * Per-request correlation context (request_id, trace_id) shared by the logger
 * and the outbound HTTP client via AsyncLocalStorage.
 */
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomBytes } = require('node:crypto');

const storage = new AsyncLocalStorage();

const REQUEST_ID_HEADER = 'x-request-id';

/** Parse W3C traceparent "00-<trace-id>-<parent-id>-<flags>". */
const parseTraceparent = (value) => {
  const parts = String(value || '').trim().split('-');
  if (parts.length !== 4 || parts[1].length !== 32 || parts[2].length !== 16 || /^0+$/.test(parts[1])) {
    return null;
  }
  return { traceId: parts[1], parentSpanId: parts[2] };
};

/** Express middleware: establish the context for the rest of the request. */
const requestContext = (req, res, next) => {
  const requestId = req.get(REQUEST_ID_HEADER) || randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', requestId);

  const ctx = { request_id: requestId };
  const trace = parseTraceparent(req.get('traceparent'));
  if (trace) {
    ctx.trace_id = trace.traceId;
    ctx.parent_span_id = trace.parentSpanId;
  }
  storage.run(ctx, next);
};

/** Current context (empty object outside a request). */
const getContext = () => storage.getStore() || {};

module.exports = { requestContext, getContext, parseTraceparent };
