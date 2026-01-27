import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import eslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig, globalIgnores } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import tailwindCanonicalClasses from 'eslint-plugin-tailwind-canonical-classes';
import tailwind from 'eslint-plugin-tailwindcss';
import unusedImports from 'eslint-plugin-unused-imports';
import ts from 'typescript-eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
    globalIgnores(['dist/**/*'], 'Ignore Build Directory'),
    js.configs.recommended,
    ...ts.configs.recommended,
    ...tailwind.configs['flat/recommended'],
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                chrome: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': eslint,
            import: importPlugin,
            'unused-imports': unusedImports,
            'tailwind-canonical-classes': tailwindCanonicalClasses,
        },
        settings: {
            tailwindcss: {
                config: path.join(__dirname, 'src/popup/styles/globals.css'),
            },
        },
        rules: {
            'no-unused-vars': 'off',
            'no-undef': 'off',
            'unused-imports/no-unused-imports': 'error',
            'import/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                    ],
                    pathGroups: [
                        {
                            pattern: 'react',
                            group: 'external',
                            position: 'before',
                        },
                        {
                            pattern: 'components/**',
                            group: 'internal',
                        },
                    ],
                    pathGroupsExcludedImportTypes: ['internal'],
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
            'import/newline-after-import': ['error', { count: 1 }],
            'import/no-duplicates': 'error',
            'tailwind-canonical-classes/tailwind-canonical-classes': [
                'warn',
                {
                    cssPath: './src/popup/styles/globals.css',
                },
            ],
        },
    },
]);
