const {
    generateGraphQLString,
    generateContentsFromGraphqlString,
} = require('@luckycatfactory/esbuild-graphql-loader');
const fs = require('fs');
const path = require('path');

module.exports = () => {
    return {
        packager: 'yarn',
        packagePath: './package.json',
        platform: 'node',
        bundle: true,
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
                name: 'copy-and-replace',
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
        ],
    };
};
