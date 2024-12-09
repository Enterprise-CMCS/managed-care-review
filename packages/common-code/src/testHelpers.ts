// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jsonStringify(obj: any): string {
    return JSON.stringify(obj, null, '  ')
}

export {
    jsonStringify
}
