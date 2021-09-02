import glob from 'glob'
import path from 'path'
import { Configuration, IgnorePlugin } from 'webpack'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import CopyPlugin from 'copy-webpack-plugin'
import PermissionsPlugin from 'webpack-permissions-plugin'

interface EntryOutput {
    entry: string
    output: {
        filename: string
        path: string
    }
}

const entries: EntryOutput[] = glob
    .sync('./handlers/*.ts')
    .reduce((prev: EntryOutput[], curr: string): EntryOutput[] => {
        const filename = path.basename(curr, '.ts')
        return [
            ...prev,
            {
                entry: path.resolve(__dirname, curr),
                output: {
                    filename: `${filename}.js`,
                    path: path.resolve(__dirname, 'dist', filename),
                },
            },
        ]
    }, [])

const config: Configuration[] = entries.map(({ entry, output }) => ({
    entry,
    output: {
        ...output,
        libraryTarget: 'commonjs',
    },
    target: 'node',
    externals: {
        'aws-sdk': 'commonjs2 aws-sdk',
    },
    devtool: 'source-map',
    node: false,
    mode: 'production',
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new IgnorePlugin({
            resourceRegExp: /encoding/,
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(
                        __dirname,
                        './node_modules/.prisma/client/query-engine-rhel-openssl-1.0.x'
                    ),
                    to: output.path,
                },
                {
                    from: path.resolve(
                        __dirname,
                        './node_modules/.prisma/client/schema.prisma'
                    ),
                    to: output.path,
                },
            ],
        }),
        new PermissionsPlugin({
            buildFiles: [
                {
                    path: path.resolve(
                        __dirname,
                        `${output.path}/query-engine-rhel-openssl-1.0.x`
                    ),
                    fileMode: '755',
                },
            ],
        }),
    ],
}))

export default config
