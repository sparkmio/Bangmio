module.exports = {
  root: true,
  env: { node: true, es2022: true, browser: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  ignorePatterns: ['dist/', 'functions/', 'node_modules/', '*.config.js'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'vue/multi-word-component-names': 'off'
  },
  overrides: [
    {
      files: ['**/*.vue'],
      parser: 'vue-eslint-parser',
      extends: ['plugin:vue/vue3-recommended', 'prettier'],
      rules: {
        'vue/multi-word-component-names': 'off'
      }
    },
    {
      files: ['client/**/*.{js,vue}'],
      env: { browser: true }
    },
    {
      files: ['server/**/*.{js,mjs}'],
      env: { node: true }
    }
  ]
}
