const path = require('path');
const fs = require('fs');
const process = require('process');

module.exports = () => {
    return {
        packager: 'pnpm',
        bundle: true,
        minify: process.env.NODE_ENV === 'production',
        plugins: [
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
                name: 'copy-clamav-config',
                setup(build) {
                    build.onStart(() => {
                        fs.copyFileSync(
                            'src/avLayer/clamd.conf',
                            '.esbuild/.build/clamd.conf'
                        );
                    });
                },
            },
        ],
    };
};
