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
                name: 'copy-and-replace-collector',
                setup(build) {
                    // copy collector.yml to the build directory
                    build.onStart(() => {
                        fs.copyFileSync(
                            'collector.yml',
                            '.esbuild/.build/collector.yml'
                        );
                    });

                    // replace the license key
                    build.onEnd(() => {
                        const filePath = path.join(
                            __dirname,
                            '.esbuild/.build/collector.yml'
                        );
                        let contents = fs.readFileSync(filePath, 'utf8');
                        contents = contents.replace(
                            '$NR_LICENSE_KEY',
                            process.env.NR_LICENSE_KEY
                        );
                        fs.writeFileSync(filePath, contents);
                    });
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
            {
                name: 'copy-prisma-migration-files',
                setup(build) {
                    // Use a lock-like approach to prevent race conditions
                    const lockFile = '.esbuild/.build/prisma.copying';

                    build.onStart(async () => {
                        try {
                            await fse.ensureDir('.esbuild/.build/prisma');
                            await fse.ensureDir(
                                '.esbuild/.build/prisma-engines'
                            );
                            await fse.ensureDir(
                                '.esbuild/.build/dataMigrations'
                            );
                        } catch (err) {
                            console.error(
                                'Error creating Prisma directories:',
                                err
                            );
                        }
                    });

                    build.onEnd(async () => {
                        try {
                            // Check if another build is already copying files
                            if (await fse.pathExists(lockFile)) {
                                console.log(
                                    'Another build is copying Prisma files, skipping...'
                                );
                                return;
                            }

                            // Create lock file
                            await fse.writeFile(lockFile, 'copying');

                            console.log('Copying Prisma migration files...');

                            // Check if files already exist to avoid unnecessary copying
                            if (
                                await fse.pathExists(
                                    '.esbuild/.build/prisma/schema.prisma'
                                )
                            ) {
                                console.log(
                                    'Prisma files already copied, skipping...'
                                );
                                await fse.remove(lockFile);
                                return;
                            }

                            // Copy schema and migrations
                            await fse.copy(
                                './prisma/schema.prisma',
                                '.esbuild/.build/prisma/schema.prisma',
                                { overwrite: true }
                            );
                            await fse.copy(
                                './prisma/migrations',
                                '.esbuild/.build/prisma/migrations',
                                { overwrite: true }
                            );

                            // Copy only PostgreSQL engines from node_modules/prisma
                            const prismaDir = './node_modules/prisma';

                            // Copy Prisma CLI files - we need the full CLI structure
                            await fse.copy(
                                path.join(prismaDir, 'build'),
                                '.esbuild/.build/node_modules/prisma/build',
                                {
                                    overwrite: true,
                                    filter: (src, dest) => {
                                        const filename = path.basename(src);
                                        // Copy essential CLI files and only PostgreSQL engines
                                        return (
                                            filename.includes('postgresql') ||
                                            filename === 'index.js' ||
                                            filename === 'child.js' ||
                                            (filename.endsWith('.wasm') &&
                                                filename.includes(
                                                    'schema_engine'
                                                ))
                                        );
                                    },
                                }
                            );

                            // Also copy the main prisma directory structure for CLI
                            await fse.ensureDir(
                                '.esbuild/.build/node_modules/prisma'
                            );
                            await fse.copy(
                                path.join(prismaDir, 'package.json'),
                                '.esbuild/.build/node_modules/prisma/package.json',
                                { overwrite: true }
                            );

                            // Copy PostgreSQL WASM engines from prisma-client runtime
                            const runtimeDir = path.join(
                                prismaDir,
                                'prisma-client/runtime'
                            );
                            if (await fse.pathExists(runtimeDir)) {
                                await fse.ensureDir(
                                    '.esbuild/.build/prisma-engines'
                                );

                                const engineFiles = [
                                    'query_engine_bg.postgresql.js',
                                    'query_engine_bg.postgresql.mjs',
                                    'query_compiler_bg.postgresql.js',
                                    'query_compiler_bg.postgresql.mjs',
                                ];

                                for (const file of engineFiles) {
                                    const srcPath = path.join(runtimeDir, file);
                                    if (await fse.pathExists(srcPath)) {
                                        await fse.copy(
                                            srcPath,
                                            `.esbuild/.build/prisma-engines/${file}`,
                                            { overwrite: true }
                                        );
                                    }
                                }
                            }

                            // Copy Linux binary engine for Lambda
                            const linuxEngine = path.join(
                                prismaDir,
                                'libquery_engine-rhel-openssl-3.0.x.so.node'
                            );
                            if (await fse.pathExists(linuxEngine)) {
                                await fse.copy(
                                    linuxEngine,
                                    '.esbuild/.build/prisma-engines/libquery_engine-rhel-openssl-3.0.x.so.node',
                                    { overwrite: true }
                                );
                            }

                            // Copy data migrations if they exist
                            if (
                                await fse.pathExists(
                                    '.esbuild/.build/src/dataMigrations'
                                )
                            ) {
                                await fse.copy(
                                    '.esbuild/.build/src/dataMigrations',
                                    '.esbuild/.build/dataMigrations',
                                    { overwrite: true }
                                );
                            }

                            // Copy proto files if they exist
                            if (await fse.pathExists('../app-proto/gen')) {
                                await fse.ensureDir('.esbuild/.build/gen');
                                await fse.copy(
                                    '../app-proto/gen',
                                    '.esbuild/.build/gen',
                                    { overwrite: true }
                                );
                            }

                            console.log(
                                'Prisma migration files copied successfully'
                            );

                            // Remove lock file
                            await fse.remove(lockFile);
                        } catch (err) {
                            console.error('Error copying Prisma files:', err);
                            // Make sure to clean up lock file on error
                            try {
                                await fse.remove(lockFile);
                            } catch (cleanupErr) {
                                // Ignore cleanup errors
                            }
                        }
                    });
                },
            },
        ],
    };
};
