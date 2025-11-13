// esbuild config for local development server
import fse from 'fs-extra'
import * as esbuild from 'esbuild'

esbuild
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
        format: 'esm',
        banner: {
            js: "import { createRequire } from 'module';import { fileURLToPath } from 'url';import { dirname } from 'path';const require = createRequire(import.meta.url);const __filename = fileURLToPath(import.meta.url);const __dirname = dirname(__filename);",
        },
        loader: {
            '.graphql': 'text',
            '.gql': 'text',
        },
        plugins: [
            {
                name: 'copy-eta-templates',
                setup(build) {
                    build.onStart(async () => {
                        try {
                            await fse.ensureDir('.local-build/etaTemplates/')
                        } catch (err) {
                            console.error('Error making directory: ', err)
                        }
                    })

                    build.onEnd(async () => {
                        try {
                            await fse.copy(
                                './src/emailer/etaTemplates',
                                '.local-build/etaTemplates/',
                                { overwrite: true }
                            )
                            console.log('Eta templates copied successfully') // eslint-disable-line no-console
                        } catch (err) {
                            console.error('Error copying eta templates:', err)
                        }
                    })
                },
            },
        ],
    })
    .then(() => {
        console.log('✅ Local server built successfully') // eslint-disable-line no-console
    })
    .catch((error) => {
        console.error('Build failed:', error)
        process.exit(1)
    })
