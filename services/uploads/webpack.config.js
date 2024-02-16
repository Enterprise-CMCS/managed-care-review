const CopyWebpackPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const slsw = require('serverless-webpack');
const path = require('path');
const isLocal = slsw.lib.webpack.isLocal;

const tsConfigPath = 'tsconfig.json';
const extensions = [
    '.mjs',
    '.js',
    '.jsx',
    '.json',
    '.ts',
    '.tsx',
    '.graphql',
    '.gql',
];

module.exports = {
    entry: slsw.lib.entries,
    target: 'node',
    context: __dirname,
    mode: isLocal ? 'development' : 'production',
    performance: {
        hints: false,
    },
    devtool: 'source-map',
    resolve: {
        symlinks: false,
        extensions: extensions,
        modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
        plugins: [
            new TsconfigPathsPlugin({
                configFile: tsConfigPath,
                extensions: extensions,
            }),
        ],
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            projectReferences: true,
                            configFile: tsConfigPath,
                        },
                    },
                ],
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'collector.yml'),
                    transform(content) {
                        return content
                            .toString()
                            .replace(
                                '$NR_LICENSE_KEY',
                                process.env.NR_LICENSE_KEY
                            );
                    },
                },
                {
                    from: path.resolve(__dirname, 'src/avLayer/clamd.conf'),
                    transform(content) {
                        const stage = slsw.lib.options.stage;
                        console.log('this is the stage: ' + stage);
                        const stageHostname = [
                            'main',
                            'val',
                            'prod',
                            'mtclamavdns',
                        ].includes(stage)
                            ? `clamav.mc-review-${stage}.local`
                            : 'clamav.mc-review-main.local';

                        return content
                            .toString()
                            .replace('HOSTNAME', stageHostname);
                    },
                },
            ],
        }),
    ],
};
