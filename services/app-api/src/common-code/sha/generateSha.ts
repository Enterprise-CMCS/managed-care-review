export async function calculateSHA256(
    file: File | undefined
): Promise<string | undefined> {
    if (!file) {
        return undefined
    }

    return new Promise<string | undefined>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer
                const digest = await crypto.subtle.digest(
                    'SHA-256',
                    arrayBuffer
                )
                const hashArray = Array.from(new Uint8Array(digest))
                const hashHex = hashArray
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('')
                resolve(hashHex)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = (error) => {
            reject(error)
        }
        reader.readAsArrayBuffer(file)
    })
}
