module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    settings: {
        react: {
            version: 'detect'
        }
    },
    ignorePatterns: ['dist/', 'node_modules/', 'pago-app@0.1.0/', 'vite/'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    plugins: ['@typescript-eslint', 'react', 'react-hooks'],
    rules: {
        'react/react-in-jsx-scope': 'off',
        'react/jsx-key': 'off',
        'react-hooks/exhaustive-deps': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
    }
};
