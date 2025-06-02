const fse = require('fs-extra');

module.exports = () => {
    return {
        packager: 'pnpm',
        bundle: true,
        exclude: ['aws-sdk', 'prisma', '@prisma/client'],
        sourcemap: true,
        entryPoints: ['src/rotator.ts'],
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
                            await fse.copy(
                                './files/',
                                '.esbuild/.build/files/',
                                { overwrite: true }
                            );
                            console.log('Dummy files for replacements copied.');
                        } catch (err) {
                            console.error('Error copying dummy files:', err);
                        }
                    });
                },
            },
        ],
    };
};
