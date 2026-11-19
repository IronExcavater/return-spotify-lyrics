// Each file matches one pattern, so that two tools never write the same file at once.
/** @type {import('lint-staged').Configuration} */
export default {
    // Types cross files, so the typecheck runs on the whole workspace and not on each file.
    '*.{js,mjs,ts,tsx}': [
        'oxlint --fix',
        'prettier --write',
        () => 'pnpm typecheck',
    ],
    '!*.{js,mjs,ts,tsx}': 'prettier --write --ignore-unknown',
};
