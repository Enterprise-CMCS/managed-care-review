import glob from 'glob'
import path from 'path'
import { IgnorePlugin } from 'webpack'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'

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

const config = entries.map(({ entry, output }) => ({
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
        new CopyWebpackPlugin({
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
    ],
}))

export default config
