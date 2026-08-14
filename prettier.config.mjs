/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'es5',
    plugins: ['prettier-plugin-tailwindcss'],
    tailwindStylesheet: './src/assets/app.css',
};
