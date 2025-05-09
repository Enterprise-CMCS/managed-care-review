const process = require('process');

module.exports = () => {
    return {
        packager: 'pnpm',
        bundle: true,
        exclude: ['aws-sdk', 'prisma', '@prisma/client'],
        sourcemap: true,
        entryPoints: ['src/rotator.ts'],
    };
};
