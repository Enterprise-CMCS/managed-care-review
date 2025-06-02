const fse = require('fs-extra');

module.exports = () => {
    // Parse stage from command line arguments
    const stageArg = process.argv.find((arg) => arg.startsWith('--stage'));
    let stage;

    if (stageArg) {
        if (stageArg.includes('=')) {
            stage = stageArg.split('=')[1];
        } else {
            const stageIndex = process.argv.indexOf(stageArg);
            stage = process.argv[stageIndex + 1];
        }
    }

    if (!stage) {
        throw new Error(
            'Stage not found in command line arguments. Please specify --stage'
        );
    }

    // Base entry points that always exist
    let entryPoints = ['src/rotator.ts', 'src/logicalDatabaseManager.ts'];

    if (stage === 'prod') {
        entryPoints.push('src/db_export.ts');
    }

    if (stage === 'val') {
        entryPoints.push('src/db_import.ts');
    }

    console.log(`Building for stage: ${stage}, entry points:`, entryPoints);

    return {
        packager: 'pnpm',
        bundle: true,
        exclude: ['aws-sdk', 'prisma', '@prisma/client'],
        sourcemap: true,
        entryPoints: entryPoints,
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
