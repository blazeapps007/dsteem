import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
    {
        ignores: ['dist/**', 'lib/**', 'docs/**', 'node_modules/**', 'examples/**']
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.browser
            }
        },
        rules: {
            // Style — mirror legacy tslint.json
            quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
            semi: ['error', 'never'],
            indent: ['error', 4, { SwitchCase: 1 }],
            'comma-dangle': ['error', 'never'],
            eqeqeq: ['error', 'allow-null'],
            'no-bitwise': 'off',
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-prototype-builtins': 'off',
            'no-inner-declarations': 'off',
            'no-control-regex': 'off',

            // TypeScript
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/dot-notation': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-empty-interface': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/triple-slash-reference': 'off',
            'no-unused-vars': 'off'
        }
    },
    {
        files: ['test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
)
