import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['src/app.ts'],
    bundle: true,
    outfile: 'build/app.js',
    platform: 'node',
    target: 'node20',
    format: 'esm',
});
