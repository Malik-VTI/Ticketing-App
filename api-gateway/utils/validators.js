// Lightweight input validation helpers (no external dependency)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value) => DATE_REGEX.test(value);

const isValidName = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
};

module.exports = { isValidDate, isValidName };
