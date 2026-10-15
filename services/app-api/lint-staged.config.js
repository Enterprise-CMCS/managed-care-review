const config = {
    '**/*.{js,ts}': [() => 'oxlint --deny-warnings .', 'prettier --write'],
    '**/*.ts': () => 'tsc --noEmit',
    '*.sql': ['sh ../../scripts/validate_migration.sh'],
};

export default config;
