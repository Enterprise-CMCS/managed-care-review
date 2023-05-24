const path = require('path');
const { getLoader, loaderByName } = require('@craco/craco');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../tsconfig.json');

const packages = [];
packages.push(path.join(__dirname, '../../lib/common-code'));

module.exports = {
    jest: {
        configure: {
            moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
                prefix: '<rootDir>/../../',
            }),
        },
    },
    webpack: {
        configure: (webpackConfig, arg) => {
            const { isFound, match } = getLoader(
                webpackConfig,
                loaderByName('babel-loader')
            );
            if (isFound) {
                const include = Array.isArray(match.loader.include)
                    ? match.loader.include
                    : [match.loader.include];

                match.loader.include = include.concat(packages);
            }
            return webpackConfig;
        },
    },
};
