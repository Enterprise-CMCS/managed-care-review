const path = require('path');
const { getLoader, loaderByName } = require('@craco/craco');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../tsconfig.json');

const packages = [];
packages.push(path.join(__dirname, '../../lib/common-code'));
packages.push(path.join(__dirname, '../app-graphql'));

module.exports = {
    jest: {
        configure: {
            moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
                prefix: '<rootDir>/../../',
            }),
        },
    },
    webpack: {
        configure: (webpackConfig, { paths }) => {
            const { isFound, match } = getLoader(
                webpackConfig,
                loaderByName('babel-loader')
            );
            if (isFound) {
                const include = Array.isArray(match.loader.include)
                    ? match.loader.include
                    : [match.loader.include];

                match.loader.include = include.concat(packages);

                // Disable React Refresh Babel plugin in production or CI mode
                if (process.env.CI || process.env.NODE_ENV === 'production') {
                    match.loader.options.plugins =
                        match.loader.options.plugins.filter((plugin) => {
                            if (Array.isArray(plugin)) {
                                return (
                                    plugin[0] !==
                                    require.resolve('react-refresh/babel')
                                );
                            } else {
                                return (
                                    plugin !==
                                    require.resolve('react-refresh/babel')
                                );
                            }
                        });
                }
            }
            webpackConfig.resolve.alias = {
                ...webpackConfig.resolve.alias,
                ...pathsToModuleNameMapper(compilerOptions.paths, {
                    prefix: path.join(paths.appSrc, '../../../'),
                }),
            };
            return webpackConfig;
        },
    },
};
