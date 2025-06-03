const fse = require('fs-extra');
const path = require('path');

module.exports = () => {
    return {
        packager: 'pnpm',
        bundle: true,
        exclude: ['aws-sdk', 'prisma', '@prisma/client'],
        sourcemap: true,
        plugins: [
            {
                name: 'copy-dummy-docs',
                setup(build) {
                    build.onStart(async () => {
                        try {
                            await fse.ensureDir('.esbuild/.build/files/');
                        } catch (err) {
                            console.error('Error making directory: ', err);
                        }
                    });
                    build.onEnd(async () => {
                        try {
                            // Use a lock-like approach to prevent race conditions
                            const lockFile = '.esbuild/.build/files/.copying';

                            if (await fse.pathExists(lockFile)) {
                                console.log(
                                    'Another build is copying files, skipping...'
                                );
                                return;
                            }

                            await fse.writeFile(lockFile, 'copying');

                            if (
                                await fse.pathExists(
                                    '.esbuild/.build/files/mock-m.csv'
                                )
                            ) {
                                console.log(
                                    'Files already copied, skipping...'
                                );
                                await fse.remove(lockFile);
                                return;
                            }

                            await fse.copy(
                                './files/',
                                '.esbuild/.build/files/',
                                { overwrite: true }
                            );
                            console.log('Dummy files for replacements copied.');

                            await fse.remove(lockFile);
                        } catch (err) {
                            console.error('Error copying dummy files:', err);
                        }
                    });
                },
            },
        ],
    };
};
