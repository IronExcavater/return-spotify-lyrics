export default {
    '!(*.ts)': 'prettier --write',
    '*.ts': ['eslint --fix', 'prettier --write'],
};
