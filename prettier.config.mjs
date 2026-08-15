/** @type {import('prettier').Config} */
export default {
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'es5',
    plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
    tailwindStylesheet: './apps/extension/src/assets/app.css',
    overrides: [
        {
            files: '*.astro',
            options: {
                parser: 'astro',
            },
        },
    ],
};
