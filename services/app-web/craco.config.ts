module.exports = {
    typescript: {
        enableTypeChecking: false,
    },
    webpack: {
        configure: {
            // Ignore warnings raised by source-map-loader.
            // some third party packages may ship miss-configured sourcemaps, that interrupts the build (currently its mainly OTEL libs with this issue)
            // See: https://github.com/facebook/create-react-app/discussions/11767
            ignoreWarnings: [
                function ignoreSourcemapsloaderWarnings(warning: {
                    module: any
                    details: string
                }): boolean {
                    return (
                        warning.module &&
                        warning.module.resource.includes('node_modules') &&
                        warning.details &&
                        warning.details.includes('source-map-loader')
                    )
                },
            ],
        },
    },
    style: {
        sass: {
            loaderOptions: {
                sourceMap: true,
                sassOptions: {
                    includePaths: [
                        './src/styles',
                        '../../node_modules/@trussworks/react-uswds',
                        '../../node_modules/@uswds',
                        '../../node_modules/@uswds/uswds/packages',
                    ],
                },
            },
        },
    },
}

export {}
