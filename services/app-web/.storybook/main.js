const path = require('path')

const webpackConfig = (config) => {
    // config.resolve.alias.uswds = path.resolve(
    //     __dirname,
    //     '../../node_modules/@uswds/uswds'
    // );

    config.module.rules.push({
        test: /\.(sa|sc|c)ss$/,
        exclude: /\.module\.(sa|sc|c)ss$/i,
        use: [
            'style-loader',
            'css-loader',
            {
                loader: 'sass-loader',
                options: {
                    sourceMap: true,
                    sassOptions: {
                        includePaths: [
                            './node_modules/@uswds',
                            './node_modules/@uswds/uswds/packages',
                        ],
                    },
                },
            },
        ],
        include: path.resolve(__dirname, '../../'),
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
        webpackFinal(config) {
           return webpackConfig(config)
        },
  };
