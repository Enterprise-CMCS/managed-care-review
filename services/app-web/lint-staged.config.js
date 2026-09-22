const config = {
    '**/*.{js,jsx,ts,tsx}': [
        () => 'oxlint --deny-warnings src/',
        'prettier --write',
    ],
    '**/*.{ts,tsx}': () => 'tsc --noEmit',
    '**/*.scss': ["npx stylelint '**/*.scss'", 'prettier --write'],
};

export default config;
