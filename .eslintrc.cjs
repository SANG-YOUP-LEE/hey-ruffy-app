module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@babel/eslint-parser',
    ecmaVersion: 2021,
    sourceType: 'module',
    requireConfigFile: false,
  },
  extends: ['plugin:vue/vue3-recommended', 'eslint:recommended', 'plugin:prettier/recommended'],
  plugins: ['vue', 'prettier'],
  rules: {
    'no-unused-vars': 'error',
    'no-console': 'error',
    semi: ['error', 'always'],
    indent: ['error', 2],
    'prettier/prettier': 'error',
    'vue/multi-word-component-names': 'off',
  },
};
