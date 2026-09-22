// oxlint-disable-next-line typescript/no-explicit-any
function jsonStringify(obj: any): string {
    return JSON.stringify(obj, null, '  ')
}

export { jsonStringify }
