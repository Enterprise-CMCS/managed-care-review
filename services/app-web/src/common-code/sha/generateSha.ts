// export async function calculateSHA256(
//     file: File | undefined
// ): Promise<string | undefined> {
//     if (!file) {
//         return
//     }
//     const buffer = await file.arrayBuffer()
//     const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
//     const hashArray = Array.from(new Uint8Array(hashBuffer))
//     const hashHex = hashArray
//         .map((b) => b.toString(16).padStart(2, '0'))
//         .join('')
//     return hashHex
// }

// function toHexString(byteArray: Uint8Array): string {
//     return Array.from(byteArray)
//         .map((byte) => byte.toString(16).padStart(2, '0'))
//         .join('')
// }

// export async function calculateSHA256(message: string): Promise<string> {
//     if (
//         typeof window !== 'undefined' &&
//         window.crypto &&
//         window.crypto.subtle
//     ) {
//         // Browser
//         const encoder = new TextEncoder()
//         const data = encoder.encode(message)
//         const digest = await window.crypto.subtle.digest('SHA-256', data)
//         return toHexString(new Uint8Array(digest))
//     } else {
//         // Node.js
//         const crypto = await import('crypto')
//         return new Promise((resolve, reject) => {
//             const hash = crypto.createHash('sha256')
//             hash.update(message)
//             resolve(toHexString(hash.digest()))
//         })
//     }
// }

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
