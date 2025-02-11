const process = require('process');

module.exports = () => {
    return {
        packager: 'pnpm',
        bundle: true,
        exclude: ['aws-sdk'],
        sourcemap: true,
        entryPoints: ['src/rotator.ts', 'scripts/uploadScripts.ts'],
    };
};
