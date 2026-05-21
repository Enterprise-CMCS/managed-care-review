const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const {
    generateGraphQLString,
    generateContentsFromGraphqlString,
} = require('@luckycatfactory/esbuild-graphql-loader');

module.exports = () => {
    return {
        packager: 'pnpm',
        bundle: true,
        exclude: ['prisma', '@prisma/client'],
        sourcemap: true,
        format: 'esm',
        platform: 'node',
        outputFileExtension: '.mjs',
        banner: {
            js: 'import { createRequire } from "module";import { fileURLToPath } from "url";import { dirname } from "path";const require = createRequire(import.meta.url);const __filename = fileURLToPath(import.meta.url);const __dirname = dirname(__filename);',
        },
        plugins: [
            {
                name: 'graphql-loader',
                setup(build) {
                    build.onLoad({ filter: /\.graphql$|\.gql$/ }, (args) =>
                        generateGraphQLString(args.path).then(
                            (graphqlString) => ({
                                contents:
                                    generateContentsFromGraphqlString(
                                        graphqlString
                                    ),
                            })
                        )
                    );
                },
            },
            {
                name: 'copy-eta-templates',
                setup(build) {
                    build.onStart(async () => {
                        try {
                            await fse.ensureDir(
                                '.esbuild/.build/src/handlers/etaTemplates/'
                            );
                        } catch (err) {
                            console.error('Error making directory: ', err);
                        }
                    });

                    build.onEnd(async () => {
                        try {
                            await fse.copy(
                                './src/emailer/etaTemplates',
                                '.esbuild/.build/src/handlers/etaTemplates/',
                                { overwrite: true }
                            );
                            console.log('Eta templates copied successfully');
                        } catch (err) {
                            console.error('Error copying eta templates:', err);
                        }
                    });
                },
            },
            {
                name: 'copy-prisma-engine-for-local-dev',
                setup(build) {
                    build.onStart(() => {
                        if (process.env.REACT_APP_STAGE_NAME === 'local') {
                            const prismaPath = path.join(
                                __dirname,
                                '../../node_modules/prisma/libquery_engine-darwin-arm64.dylib.node'
                            );
                            const outDir = path.join(
                                __dirname,
                                '../../node_modules/@prisma/client/libquery_engine-darwin-arm64.dylib.node'
                            );
                            fs.copyFileSync(prismaPath, outDir);
                        }
                    });
                },
            },
        ],
    };
};
