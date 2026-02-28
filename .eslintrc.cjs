module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
    'import/no-default-export': 'error',
    'import/no-cycle': 'error',
    'import/no-unresolved': 'off',
    'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      files: ['frontend/src/app/**/page.tsx', 'frontend/src/app/**/layout.tsx', 'frontend/src/app/**/route.ts', '*.config.*', '*.cjs'],
      rules: { 'import/no-default-export': 'off' },
    },
    {
      files: ['*.test.ts', '*.test.tsx', '*.spec.ts'],
      rules: { '@typescript-eslint/explicit-function-return-type': 'off' },
    },
  ],
  settings: {
    'import/resolver': {
      typescript: { alwaysTryTypes: true },
    },
  },
  ignorePatterns: ['node_modules/', 'dist/', '.next/', 'coverage/'],
};
