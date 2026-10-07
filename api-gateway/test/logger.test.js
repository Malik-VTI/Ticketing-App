const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const { parseTraceparent } = require('../utils/requestContext');

// Run a snippet in a child process (pino writes to stdout asynchronously)
// and return the parsed JSON lines.
const runAndCollect = (snippet) => {
  const root = path.join(__dirname, '..');
  const out = execFileSync(process.execPath, ['-e', snippet], {
    cwd: root,
    env: { ...process.env, LOG_LEVEL: 'info', SERVICE_VERSION: 'v-test' },
  }).toString();
  return out.trim().split('\n').filter(Boolean).map((line) => {
    assert.strictEqual((line.match(/"log\.type"/g) || []).length, 1, `duplicate log.type: ${line}`);
    return JSON.parse(line);
  });
};

test('logger emits the standard schema with correlation context', () => {
  const lines = runAndCollect(`
    const { AsyncLocalStorage } = require('node:async_hooks');
    const logger = require('./utils/logger');
    logger.info('startup');
    const { requestContext } = require('./utils/requestContext');
    const req = { get: (h) => ({ 'x-request-id': 'req-1',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' })[h] };
    const res = { setHeader() {} };
    requestContext(req, res, () => {
      logger.event('business', 'booking.created', 'booking created', { 'booking.id': 'b-1' });
    });
  `);
  assert.strictEqual(lines.length, 2);
  const [app, biz] = lines;
  for (const line of lines) {
    for (const key of ['timestamp', 'level', 'message', 'service.name', 'service.version', 'log.type']) {
      assert.ok(key in line, `missing ${key} in ${JSON.stringify(line)}`);
    }
    assert.match(line.timestamp, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  }
  assert.strictEqual(app.level, 'INFO');
  assert.strictEqual(app['log.type'], 'app');
  assert.strictEqual(app['service.version'], 'v-test');
  assert.strictEqual(biz['log.type'], 'business');
  assert.strictEqual(biz['event.name'], 'booking.created');
  assert.strictEqual(biz.request_id, 'req-1');
  assert.strictEqual(biz.trace_id, '4bf92f3577b34da6a3ce929d0e0e4736');
});

test('parseTraceparent rejects malformed and all-zero ids', () => {
  assert.strictEqual(parseTraceparent('garbage'), null);
  assert.strictEqual(parseTraceparent('00-00000000000000000000000000000000-00f067aa0ba902b7-01'), null);
  assert.deepStrictEqual(parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'),
    { traceId: '4bf92f3577b34da6a3ce929d0e0e4736', parentSpanId: '00f067aa0ba902b7' });
});
