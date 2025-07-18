import { defineConfig } from 'eslint/config';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([
  {
    files: ['**/*.js', '**/*.mjs'],
    ...js.configs.recommended
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/dist', '**/*.spec.ts', '**/*.d.ts', '**/*.spechelper.ts'],
    extends: compat.extends(
      'eslint-config-salesforce-typescript',
      'plugin:jsdoc/recommended-typescript-error',
      'prettier'
    ),

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname
      },
      sourceType: 'module'
    },

    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase']
        }
      ],

      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false
          }
        }
      ],

      '@typescript-eslint/return-await': 'error',
      'no-await-in-loop': 'off',
      'no-return-await': 'off',
      'class-methods-use-this': 'off',
      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: 'off'
    }
  }
]);
