// esbuild config for local development server
const fs = require('fs');
const fse = require('fs-extra');
const {
    generateGraphQLString,
    generateContentsFromGraphqlString,
} = require('@luckycatfactory/esbuild-graphql-loader');

require('esbuild')
    .build({
        entryPoints: ['src/local-server.ts'],
        bundle: true,
        platform: 'node',
        target: 'node20',
        outfile: '.local-build/local-server.js',
        external: [
            'prisma',
            '@prisma/client',
            // Express and its dependencies can be external
            'express',
        ],
        sourcemap: true,
        format: 'cjs',
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
                            await fse.ensureDir('.local-build/etaTemplates/');
                        } catch (err) {
                            console.error('Error making directory: ', err);
                        }
                    });

                    build.onEnd(async () => {
                        try {
                            await fse.copy(
                                './src/emailer/etaTemplates',
                                '.local-build/etaTemplates/',
                                { overwrite: true }
                            );
                            console.log('Eta templates copied successfully');
                        } catch (err) {
                            console.error('Error copying eta templates:', err);
                        }
                    });
                },
            },
        ],
    })
    .then(() => {
        console.log('✅ Local server built successfully');
    })
    .catch((error) => {
        console.error('Build failed:', error);
        process.exit(1);
    });
