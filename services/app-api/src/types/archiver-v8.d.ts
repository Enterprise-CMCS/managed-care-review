// Local type shim for archiver v8, which ships no bundled .d.ts files.
// @types/archiver is still on v7 and uses the old factory-function API.
// Remove this file once @types/archiver@8 is published (track: DefinitelyTyped#75017).
declare module 'archiver' {
    import { Writable } from 'stream'

    class Archiver extends Writable {
        pipe<T extends NodeJS.WritableStream>(destination: T): T
        file(filepath: string, data: { name: string }): this
        finalize(): Promise<void>
    }

    class ZipArchive extends Archiver {
        constructor(options?: { zlib?: { level?: number } })
    }

    export { Archiver, ZipArchive }
}
