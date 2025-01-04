import sonarjsPlugin from "eslint-plugin-sonarjs";
import eslintJs from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import vitest from "@vitest/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  // Using the recommended configuration from eslint
  eslintJs.configs.recommended,
  {
    // Ignoring the 'dist' directory
    ignores: ["dist/**"],
    linterOptions: {
      // Reporting unused eslint-disable directives
      reportUnusedDisableDirectives: true,
    },
  },
  // General rules for all files
  {
    // Applying the following configuration to all JavaScript and TypeScript files in the 'src' directory
    files: ["src/**/*.{js,ts}"],
    plugins: {
      // Adding TypeScript plugin
      "@typescript-eslint": tsPlugin,
      // Adding SonarJS plugin
      sonarjs: sonarjsPlugin,
      // Adding Vitest plugin
      vitest,
    },
    languageOptions: {
      // Setting the parser to TypeScript parser
      parser: tsParser,
      parserOptions: {
        // Specifying the path to the TypeScript configuration file, we use a
        // custom one to fix tests parsing.
        project: "./tsconfig.eslint.json",
      },
    },
    rules: {
      // Extending recommended rules from TypeScript plugin
      ...tsPlugin.configs.recommended.rules,
      // Extending recommended rules from SonarJS plugin
      ...sonarjsPlugin.configs.recommended.rules,
      // Setting the rule for 'todo' tags to show a warning
      "sonarjs/todo-tag": "warn",
    },
  },

  // Rules for test files
  {
    // Applying the following configuration to all test files
    files: ["src/**/*.spec.ts"],
    plugins: {
      // Adding Vitest plugin for testing
      vitest,
    },
    rules: {
      // Extending all rules from Vitest plugin
      ...vitest.configs.recommended.rules,

      // Disabling specific Vitest rules
      "vitest/prefer-to-be-truthy": "off",
      "vitest/prefer-to-be-falsy": "off",
      "vitest/no-focused-tests": "error",
      "vitest/consistent-test-filename": "off",
      "vitest/prefer-lowercase-title": "off",
      "vitest/prefer-expect-assertions": "off",

      // Disabling a specific SonarJS rule for nested functions, a common pattern in tests.
      "sonarjs/no-nested-functions": "off",
    },
  },
];
