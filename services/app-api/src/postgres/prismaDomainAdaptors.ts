// since prisma needs nulls to indicate "remove this field" instead of "ignore this field"
// this function translates undefineds into nulls
function nullify<T>(field: T | undefined): T | null {
    if (field === undefined) {
        return null
    }

    return field
}

// since prisma needs nulls to indicate "remove this field" instead of "ignore this field"
// this function translates undefineds into empty arrays
function emptify<T>(field: T[] | undefined): T[] {
    if (field === undefined) {
        return []
    }
    return field
}

export { nullify, emptify }
