export default {
    plugins: ['stylelint-prettier'],
    extends: ['stylelint-config-standard', 'stylelint-config-tailwindcss'],
    rules: {
        'selector-class-pattern': [
            /^(rt-.*|[a-z0-9-]+)$/,
            {
                message:
                    'Expected class selector to be kebab-case (rt-* classes are ignored)',
            },
        ],
    },
};
