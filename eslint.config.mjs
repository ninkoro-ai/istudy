// ESLint 扁平配置（宽松：跨文件共享 IIFE 作用域，不做未定义变量/未使用变量检查）
export default [
  {
    ignores: ['node_modules/**', 'app.html', 'app.template.html', 'package-lock.json']
  },
  {
    files: ['src/**/*.js', 'build/**/*.mjs', 'scripts/**/*.mjs', 'tests/**/*.mjs', 'server.js', 'eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-func-assign': 'error',
      'no-cond-assign': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-unreachable': 'error',
      'no-extra-semi': 'error',
      'no-extra-boolean-cast': 'error'
    }
  }
];
