const config = {
    '**/*.{js,ts,tsx}': [
        () => 'oxlint --deny-warnings .',
        'prettier --write --ignore-unknown',
    ],
    '**/*.{ts,tsx}': () => 'tsc --noEmit',
    '**/*.{json,md,yml,yaml}': ['prettier --write'],
};

export default config;
