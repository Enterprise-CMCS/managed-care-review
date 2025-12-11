const config = {
    '**/*.{js,ts}': ['eslint --max-warnings=0', 'prettier --write'],
    '**/*.ts': () => 'tsc --noEmit',
    '*.sql': ['sh ../../scripts/validate_migration.sh'],
};

export default config;
