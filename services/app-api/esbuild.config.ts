import type { PluginBuild } from 'esbuild'
import fs from 'fs'
import fse from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default () => {
    return {
        packager: 'pnpm',
        bundle: true,
        exclude: ['prisma', '@prisma/client'],
        sourcemap: true,
        loader: {
            '.graphql': 'text',
            '.gql': 'text',
        },
        plugins: [
            {
                name: 'copy-eta-templates',
                setup(build: PluginBuild) {
                    build.onStart(async () => {
                        try {
                            await fse.ensureDir(
                                '.esbuild/.build/src/handlers/etaTemplates/'
                            )
                        } catch (err) {
                            console.error('Error making directory: ', err)
                        }
                    })

                    build.onEnd(async () => {
                        try {
                            await fse.copy(
                                './src/emailer/etaTemplates',
                                '.esbuild/.build/src/handlers/etaTemplates/',
                                { overwrite: true }
                            )
                            console.log('Eta templates copied successfully') // eslint-disable-line no-console
                        } catch (err) {
                            console.error('Error copying eta templates:', err)
                        }
                    })
                },
            },
            {
                name: 'copy-prisma-engine-for-local-dev',
                setup(build: PluginBuild) {
                    build.onStart(() => {
                        if (process.env.REACT_APP_STAGE_NAME === 'local') {
                            const prismaPath = path.join(
                                __dirname,
                                '../../node_modules/prisma/libquery_engine-darwin-arm64.dylib.node'
                            )
                            const outDir = path.join(
                                __dirname,
                                '../../node_modules/@prisma/client/libquery_engine-darwin-arm64.dylib.node'
                            )
                            fs.copyFileSync(prismaPath, outDir)
                        }
                    })
                },
            },
        ],
    }
}
