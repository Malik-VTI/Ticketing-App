// ESLint v9 flat config (CommonJS) for the API Gateway service.
// Pairs with Prettier (.prettierrc.json); eslint-config-prettier disables
// stylistic rules that would conflict with the formatter.
const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');

module.exports = [
  // Ignore generated / vendored output.
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],
  },

  // Base recommended rules.
  js.configs.recommended,

  // Project-wide settings for Node.js (CommonJS).
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node.js runtime globals.
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    rules: {
      // Relaxed to 'warn' to match the existing code style without breaking
      // builds. Tighten over time as the codebase is cleaned up.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': 'warn',
      'no-prototype-builtins': 'warn',
    },
  },

  // Must come last: turn off rules that conflict with Prettier.
  prettier,
];
