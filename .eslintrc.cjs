/* eslint-env node */
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:sonarjs/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'sonarjs', 'vitest'],
  root: true,
  ignorePatterns: ['dist'],
  overrides: [
    {
      files: ['*.spec.ts'],
      extends: ['plugin:vitest/all'],
      rules: {
        'vitest/prefer-to-be-truthy': 'off',
        'vitest/prefer-to-be-falsy': 'off',
        'vitest/no-focused-tests': 'error',
        'vitest/consistent-test-filename': 'off',
        'vitest/prefer-lowercase-title': 'off',
        'vitest/prefer-expect-assertions': 'off'
      },
    },
  ],
}
