const { test } = require('node:test');
const assert = require('node:assert/strict');

const { isValidDate, isValidName } = require('../utils/validators');

test('isValidDate: accepts a valid YYYY-MM-DD date', () => {
  assert.equal(isValidDate('2026-06-17'), true);
});

test('isValidDate: rejects non-zero-padded month/day', () => {
  assert.equal(isValidDate('2026-6-7'), false);
});

test('isValidDate: rejects DD-MM-YYYY ordering', () => {
  assert.equal(isValidDate('17-06-2026'), false);
});

test('isValidDate: rejects non-date string', () => {
  assert.equal(isValidDate('abc'), false);
});

test('isValidDate: rejects empty string', () => {
  assert.equal(isValidDate(''), false);
});

test('isValidDate: rejects date with time component', () => {
  assert.equal(isValidDate('2026-06-17T00:00'), false);
});

test('isValidName: accepts a normal name', () => {
  assert.equal(isValidName('Jakarta'), true);
});

test('isValidName: accepts a single character (1 char)', () => {
  assert.equal(isValidName('a'), true);
});

test('isValidName: accepts a 100 character string', () => {
  assert.equal(isValidName('a'.repeat(100)), true);
});

test('isValidName: rejects empty string', () => {
  assert.equal(isValidName(''), false);
});

test('isValidName: rejects whitespace-only string', () => {
  assert.equal(isValidName('  '), false);
});

test('isValidName: rejects a 101 character string', () => {
  assert.equal(isValidName('a'.repeat(101)), false);
});
