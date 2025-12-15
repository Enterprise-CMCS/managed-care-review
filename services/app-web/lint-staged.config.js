const config = {
    '**/*.{js,jsx,ts,tsx}': ['eslint --max-warnings=0', 'prettier --write'],
    '**/*.{ts,tsx}': () => 'tsc --noEmit',
    '**/*.scss': ["npx stylelint '**/*.scss'", 'prettier --write'],
};

export default config;
