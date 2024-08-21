const isDate = (item: Date | undefined): item is Date => {
    return !!item
}

// Calculate most recent date from a list of options
// Allow undefined as parameter since most of our dates types can be undefined coming from the data model.
const mostRecentDate = (dates: Array<Date | undefined>): Date | undefined => {
    if (dates.every((date) => date === undefined)) {
        console.error(
            'Cannot calculate most recent date. All dates are undefined'
        )
        return undefined
    }

    const times = dates.filter(isDate).map((date) => new Date(date).getTime())

    return new Date(Math.max(...times))
}

export { mostRecentDate, isDate }
