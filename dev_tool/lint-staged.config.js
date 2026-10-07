const config = {
    '**/*.{js,ts}': [() => 'oxlint --deny-warnings .', 'prettier --write'],
    '**/*.ts': () => 'tsc --noEmit',
};

export default config;
