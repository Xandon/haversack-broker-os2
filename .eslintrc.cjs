/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // No `any` type — use `unknown` with type narrowing
    '@typescript-eslint/no-explicit-any': 'error',
    // Explicit return types on functions
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true,
    }],
    // Named exports only (default exports restricted)
    'no-restricted-exports': ['error', {
      restrictDefaultExports: {
        direct: false,
        named: true,
        defaultFrom: true,
        namedFrom: true,
        namespaceFrom: true,
      },
    }],
    // No unused variables (error level)
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    // Consistent type imports
    '@typescript-eslint/consistent-type-imports': 'warn',
    // No console.log in production (warn)
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    'coverage/',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
    '*.config.ts',
  ],
  overrides: [
    {
      // Allow default exports in Next.js page/layout files
      files: ['frontend/src/app/**/page.tsx', 'frontend/src/app/**/layout.tsx'],
      rules: {
        'no-restricted-exports': 'off',
      },
    },
    {
      // Relax return type requirement for test files
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};
