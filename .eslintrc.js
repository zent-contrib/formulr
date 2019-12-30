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
  extends: ['plugin:@typescript-eslint/recommended', 'prettier/react'],
  plugins: ['prettier', '@typescript-eslint', 'lean-imports'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    'no-restricted-globals': ['error'].concat(restrictedGlobals),
    '@typescript-eslint/interface-name-prefix': ['error', 'always'],
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
};
