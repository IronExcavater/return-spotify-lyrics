export default {
    '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier -wu --log-level warn'],
    '*.{css,scss}': ['stylelint --fix', 'prettier -wu --log-level warn'],
    '*': ['prettier -wu', () => 'tsc --noEmit'],
};
