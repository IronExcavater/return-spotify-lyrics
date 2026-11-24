/** @type {import('prettier').Config} */
export default {
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'es5',
    plugins: ['prettier-plugin-tailwindcss'],
    tailwindStylesheet: './packages/ui/src/theme/theme.css',
};
