export default {
    '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write --ignore-unknown'],
    '*.{css,scss}': ['stylelint --fix', 'prettier --write --ignore-unknown'],
    '*': 'prettier --write --ignore-unknown',
};
