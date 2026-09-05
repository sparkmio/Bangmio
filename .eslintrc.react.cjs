module.exports = {
  root: true,
  parser: require('node:module').createRequire(require('node:path').join(__dirname, 'tooling/eslint/package.json')).resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  env: { browser: true, node: true, es2022: true },
  plugins: ['react', 'react-hooks', 'jsx-a11y'],
  extends: ['plugin:react/recommended', 'plugin:react/jsx-runtime', 'plugin:jsx-a11y/recommended'],
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['node_modules/', '.next/', '.open-next/', '.wrangler/', 'client/', 'functions/', 'dist*/', 'bangmio-site-clone/', 'next-env.d.ts'],
  rules: {
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error'
  }
}
