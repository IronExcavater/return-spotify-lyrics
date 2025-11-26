export default {
    plugins: ['stylelint-prettier'],
    extends: [
        'stylelint-config-standard',
        'stylelint-config-tailwindcss',
        'stylelint-config-standard-scss',
    ],
    rules: {
        'scss/at-rule-no-unknown': [
            true,
            {
                ignoreAtRules: [
                    'tailwind',
                    'apply',
                    'variants',
                    'responsive',
                    'screen',
                ],
            },
        ],
        'selector-class-pattern': [
            /^(rt-.*|[a-z0-9-]+)$/,
            {
                message:
                    'Expected class selector to be kebab-case (rt-* classes are ignored)',
            },
        ],
    },
};
