import oclif from 'eslint-config-oclif';

export default [
  ...oclif,
  {
    ignores: ['./dist', './lib', '**/*.js', '**/*.mjs']
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          modules: true
        },
        ecmaVersion: 6,
        sourceType: 'module'
      }
    },
    rules: {
      '@stylistic/arrow-parens': 'warn',
      '@stylistic/comma-dangle': 'warn',
      '@stylistic/function-paren-newline': 'warn',
      '@stylistic/generator-star-spacing': 'warn',
      '@stylistic/indent': 'warn',
      '@stylistic/indent-binary-ops': 'warn',
      '@stylistic/lines-between-class-members': 'warn',
      '@stylistic/object-curly-spacing': 'warn',
      '@stylistic/operator-linebreak': 'warn',
      '@stylistic/padding-line-between-statements': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      camelcase: 'warn',
      'dot-notation': 'warn',
      'import/namespace': 'warn',
      'mocha/consistent-spacing-between-blocks': 'warn',
      'mocha/max-top-level-suites': 'warn',
      'mocha/no-mocha-arrows': 'warn',
      'n/no-process-exit': 'warn',
      'n/no-unsupported-features/node-builtins': 'warn',
      'n/shebang': 'warn',
      'no-await-in-loop': 'off',
      'no-console': 'warn',
      'no-else-return': 'warn',
      'no-implicit-coercion': 'warn',
      'no-promise-executor-return': 'warn',
      'no-return-assign': 'warn',
      'no-undef': 'warn',
      'no-useless-concat': 'warn',
      'no-void': 'warn',
      'node/no-missing-import': 'off',
      'object-shorthand': 'warn',
      'perfectionist/sort-classes': 'warn',
      'perfectionist/sort-imports': 'warn',
      'perfectionist/sort-intersection-types': 'warn',
      'perfectionist/sort-named-imports': 'warn',
      'perfectionist/sort-object-types': 'warn',
      'perfectionist/sort-objects': 'warn',
      'perfectionist/sort-union-types': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-const': 'warn',
      'prefer-destructuring': 'warn',
      'unicorn/catch-error-name': 'warn',
      'unicorn/consistent-function-scoping': 'warn',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-negated-condition': 'warn',
      'unicorn/no-useless-undefined': 'warn',
      'unicorn/numeric-separators-style': 'warn',
      'unicorn/prefer-at': 'warn',
      'unicorn/prefer-event-target': 'warn',
      'unicorn/prefer-native-coercion-functions': 'warn',
      'unicorn/prefer-node-protocol': 'warn',
      'unicorn/prefer-number-properties': 'warn',
      'unicorn/prefer-string-raw': 'warn',
      'unicorn/prefer-string-replace-all': 'warn',
      'unicorn/text-encoding-identifier-case': 'warn'
    }
  }
];
