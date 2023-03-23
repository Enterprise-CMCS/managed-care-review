const path = require('path')

// Feedback from Drew - instead of pushing a rule modify config 
// 
const webpackConfig = (config) => {
        process.stdout.write('HERE \n');
    process.stdout.write(JSON.stringify(config.module.rules));
    //  config.module.rules.forEach((p) => {
    //      if (p.options) {
    //          // Ignore warnings about ordering from mini-css-extract-plugin
    //          if (p.options.hasOwnProperty('sassOptions')) {
    //              p.options.ignoreOrder = true;
    //          }
    //      }
    //  });

    config.module.rules.push(
      {
        test: /\.(sa|sc|c)ss$/,
        exclude: /\.module\.(sa|sc|c)ss$/i,
        use: ['style-loader', 'css-loader', {
        loader: "sass-loader",
        options: {
            sourceMap: true,
            sassOptions: {
            includePaths: [
                "../../../node_modules/@uswds",
                "../../../node_modules/@uswds/uswds/packages",
            ],
            },
        },
        },],
        include: path.resolve(__dirname, '../'),
    }
    );

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
           return webpackConfig(config)
        },
  };
