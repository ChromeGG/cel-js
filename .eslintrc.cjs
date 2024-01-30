/* eslint-env node */
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:sonarjs/recommended',
    'plugin:vitest/all',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'sonarjs', 'vitest'],
  root: true,
  overrides: [
    {
      files: ['*.spec.ts'],
      rules: {
        'vitest/prefer-to-be-truthy': 'off',
        'vitest/prefer-to-be-falsy': 'off',
        'vitest/no-focused-tests': 'error',
        'vitest/consistent-test-filename': 'off',
        'vitest/prefer-lowercase-title': 'off',
      },
    },
    {
      files: ['demo/**/*'],
      rules: {
        'vitest/require-hook': 'off',
      },
    },
  ],
}
