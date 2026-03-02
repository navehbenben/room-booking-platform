module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier', // disables rules that conflict with prettier — must be last
  ],
  ignorePatterns: ['dist/**', '.eslintrc.cjs', 'node_modules/**'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    warnOnUnsupportedTypeScriptVersion: false,
  },
  plugins: ['react-hooks'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-undef': 'off', // TypeScript handles undefined references
    'no-empty': 'off', // intentional empty catch blocks are used to swallow errors gracefully
  },
  overrides: [
    {
      // Vitest test files — add globals that vitest injects
      files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      env: { jest: true }, // jest globals match vitest's API
      globals: { vi: 'readonly' },
    },
  ],
};
