import globals from 'globals';
import pluginJs from '@eslint/js';
import json from 'eslint-plugin-json';

/**
 * @type {import('eslint').Linter.FlatConfig[]}
 */
const config = [
    {files: ['**/*.js'], languageOptions: {sourceType: 'commonjs'}},
    {languageOptions: {globals: globals.node}},
    pluginJs.configs.recommended,
    {
        files: ['**/*.json'],
        ...json.configs['recommended']
    },
    {
        rules: {
            // Use modern ES2015+
            // TODO
            // 'no-var': 'warn',
            // 'prefer-const': 'warn',
        },
    },
    {
        rules: {
            // TODO
            'no-redeclare': 'off',
            'no-prototype-builtins': 'off',
            semi: 'off',
        },
    },
];

export default config;
