const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../tsconfig.json');
const CracoEsbuildPlugin = require('craco-esbuild');

const packages = [];
packages.push(path.join(__dirname, '../../lib/common-code'));
packages.push(path.join(__dirname, '../app-graphql'));

module.exports = {
    plugins: [
        {
            plugin: CracoEsbuildPlugin,
            options: {
                includePaths: packages,
                skipEsbuildJest: true,
                esbuildLoaderOptions: {
                    loader: 'tsx',
                    target: 'es2015',
                },
            },
        },
    ],
    jest: {
        configure: {
            moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
                prefix: path.join(__dirname, '../../'),
            }),
        },
    },
};
