const process = require('process');

module.exports = () => ({
    packager: 'pnpm',
    bundle: true,
    minify: process.env.NODE_ENV === 'production',
    exclude: ['aws-sdk'],
});
