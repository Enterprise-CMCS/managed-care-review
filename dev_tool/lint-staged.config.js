const config = {
    '**/*.{js,ts}': ['eslint --max-warnings=0', 'prettier --write'],
    '**/*.ts': () => 'tsc --noEmit',
};

export default config;
