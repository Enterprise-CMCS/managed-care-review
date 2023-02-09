import { readdir } from 'fs/promises'

async function listFilesInDirectory(path: string): Promise<string[] | Error> {
    try {
        return await readdir(path)
    } catch (err) {
        // WTF, this error is not instanceof Error
        return new Error(err.message)
    }
}

export {
    listFilesInDirectory,
}
