const CopyWebpackPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const path = require('path');
const slsw = require('serverless-webpack');

const isLocal = slsw.lib.webpack.isLocal;

const tsConfigPath = 'tsconfig.json';
const extensions = ['.js', '.jsx', '.json', '.ts', '.tsx', '.graphql', '.gql'];
const servicePath = '';

module.exports = {
    entry: slsw.lib.entries,
    target: 'node',
    context: __dirname,
    mode: isLocal ? 'development' : 'production',
    performance: {
        hints: false,
    },
    externals: [
        nodeExternals({
            modulesDir: path.resolve(__dirname, '../../node_modules'),
        }),
        'aws-sdk',
    ],
    devtool: 'source-map',
    resolve: {
        symlinks: false,
        extensions: extensions,
        modules: [
            path.resolve(__dirname, '../../node_modules'),
            'node_modules',
        ],
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
                            experimentalWatchApi: true,
                        },
                    },
                ],
                include: [
                    path.resolve(servicePath, 'authn'),
                    path.resolve(servicePath, 'handlers'),
                    path.resolve(servicePath, 'lib'),
                    path.resolve(servicePath, 'postgres'),
                    path.resolve(servicePath, 'resolvers'),
                    path.resolve(servicePath, 'store'),
                    path.resolve(servicePath, '../app-web/src/common-code'),
                ],
            },
            {
                test: /\.(graphql|gql)$/,
                include: [path.resolve(servicePath, '../app-graphql/src')],
                loader: 'graphql-tag/loader',
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(
                        __dirname,
                        '../../node_modules/.prisma/client/schema.prisma'
                    ),
                },
            ],
        }),
    ],
};
