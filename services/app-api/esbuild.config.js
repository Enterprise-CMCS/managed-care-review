const fs = require('fs');
const path = require('path');
const {
    generateGraphQLString,
    generateContentsFromGraphqlString,
} = require('@luckycatfactory/esbuild-graphql-loader');

module.exports = () => {
    return {
        packager: 'yarn',
        bundle: true,
        exclude: [
            'prisma',
            '@prisma/client',
            '@opentelemetry/core',
            '@opentelemetry/sdk-trace-base',
            '@opentelemetry/sdk-trace-node',
            '@opentelemetry/resources',
            '@opentelemetry/semantic-conventions',
            '@opentelemetry/api',
            '@opentelemetry/id-generator-aws-xray',
            '@opentelemetry/instrumentation',
            '@opentelemetry/instrumentation-http',
            '@opentelemetry/propagator-aws-xray',
            '@opentelemetry/auto-instrumentations-node',
            '@opentelemetry/exporter-metrics-otlp-http',
            '@opentelemetry/sdk-metrics',
        ],
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
