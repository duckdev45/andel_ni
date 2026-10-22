import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import perfectionist from 'eslint-plugin-perfectionist'
import prettier from 'eslint-plugin-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// 規則沿用 gw-fumao：import 與 JSX props 排序、prettier、unused-vars 底線例外、完整 jsx-a11y recommended。
// 框架層改用 typescript-eslint + react-hooks（本專案是 React Router，不是 Next）。
export default defineConfig([
  globalIgnores([
    'build/**',
    '.react-router/**',
    '.wrangler/**',
    'coverage/**',
    'public/**',
    '.agents/**',
    'worker-configuration.d.ts',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { perfectionist },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports', prefer: 'type-imports' },
      ],
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          ignoreCase: true,
          newlinesBetween: 1,
          internalPattern: ['^~/'],
          groups: [
            'type-import',
            'side-effect',
            'side-effect-style',
            'value-builtin',
            'value-external',
            'value-internal',
            ['value-parent', 'value-sibling', 'value-index'],
            'unknown',
          ],
        },
      ],
      'perfectionist/sort-named-imports': [
        'error',
        { type: 'natural', order: 'asc', ignoreCase: true },
      ],
      'perfectionist/sort-jsx-props': [
        'error',
        {
          type: 'unsorted',
          groups: [
            'key',
            'id',
            'type',
            'variant',
            'name',
            'class',
            'className',
            'shorthand-prop',
            'unknown',
            'callback',
          ],
          customGroups: [
            { groupName: 'key', elementNamePattern: '^key$' },
            { groupName: 'id', elementNamePattern: '^id$' },
            { groupName: 'type', elementNamePattern: '^type$' },
            { groupName: 'variant', elementNamePattern: '^variant$' },
            { groupName: 'name', elementNamePattern: '^name$' },
            { groupName: 'class', elementNamePattern: '^class$' },
            { groupName: 'className', elementNamePattern: '^className$' },
            { groupName: 'callback', elementNamePattern: '^on.+' },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: { ...jsxA11y.flatConfigs.recommended.rules },
  },
  // shadcn 產生的元件：jsx-a11y 對泛型包裝元件誤判，保留官方寫法
  {
    files: ['app/components/ui/**'],
    rules: {
      'jsx-a11y/heading-has-content': 'off',
      'jsx-a11y/anchor-has-content': 'off',
    },
  },
  {
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
])
