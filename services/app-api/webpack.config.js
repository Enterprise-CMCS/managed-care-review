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
    mode: isLocal ? 'development' : 'production',
    externals: [nodeExternals()],
    devtool: 'source-map',
    resolve: {
        modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
        extensions: extensions,
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
                // Include ts, tsx, js, and jsx files.
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
                exclude: [
                    path.resolve(servicePath, 'node_modules'),
                    path.resolve(servicePath, '.serverless'),
                    path.resolve(servicePath, '.webpack'),
                ],
            },
            {
                test: /\.(graphql|gql)$/,
                exclude: /node_modules/,
                loader: 'graphql-tag/loader',
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: ['./prisma/schema.prisma'],
        }),
    ],
};
