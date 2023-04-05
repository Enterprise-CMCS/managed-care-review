const path = require('path');

// This should match whats in craco
const sassLoaderOptions = {
    sourceMap: true,
    sassOptions: {
        includePaths: [
            '../../node_modules/@uswds',
            '../../node_modules/@uswds/uswds/packages',
        ],
    },
};

const webpackConfig = (config) => {
    // We have workaround in our craco config (used for the application) we also need to bring to storybook
    // Currently there is no up to date tooling to wire craco into storybook so we must manually edit config to get the changes we want.
    config.module.rules.forEach((r) => {
        if (r.oneOf) {
            r.oneOf.forEach((oo) => {
                if (oo.use) {
                    oo.use.forEach((u) => {
                        if (u.loader && u.loader.includes('/sass-loader/')) {
                            // Override to bring in uswds scss
                            u.options = sassLoaderOptions;
                                process.stdout
                                    .write(`WEBPACK UPDATE: updated sass-loader to bring in uswds ${JSON.stringify(u.options.sassOptions)}`)
                        }
                    });
                }
            });
        }
         process.stdout.write(JSON.stringify(config.module.rules.length));
    });
    return config;
};

module.exports = {
    stories: ['../src/**/*.stories.@(ts|tsx)'],
    addons: [
        '@storybook/addon-a11y',
        '@storybook/addon-links',
        '@storybook/addon-essentials',
        '@storybook/preset-create-react-app',
    ],
    framework: '@storybook/react',
    typescript: {
        check: false,
        checkOptions: {},
        reactDocgen: 'react-docgen-typescript',
        reactDocgenTypescriptOptions: {
            shouldExtractLiteralValuesFromEnum: true,
            compilerOptions: {
                allowSyntheticDefaultImports: false,
                esModuleInterop: false,
            },
        },
    },
    core: {
        builder: 'webpack5',
        options: {
            lazyCompilation: true,
        },
    },
    webpackFinal: async (config) => {
        return webpackConfig(config);
    },
};
