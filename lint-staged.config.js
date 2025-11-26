export default {
    '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier -wu'],
    '*.{css,scss}': ['stylelint --fix', 'prettier -wu'],
    '*': 'prettier -wu',
};
