const restrictedGlobals = require('confusing-browser-globals');

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      modules: true,
    },
    useJSXTextNode: true,
  },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
    node: true,
  },
  extends: ['prettier/react', 'plugin:react/recommended', 'plugin:@typescript-eslint/recommended'],
  plugins: ['react', 'react-hooks', 'prettier', '@typescript-eslint', 'lean-imports'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    react: {
      version: 'detect',
    },
  },
  rules: {
    'no-restricted-globals': ['error'].concat(restrictedGlobals),
    '@typescript-eslint/interface-name-prefix': ['error', 'always'],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-use-before-define': ['error', 'nofunc'],
    // 'react-hooks/exhaustive-deps': 'off',
    'react/prop-types': 'off',
  },
};
