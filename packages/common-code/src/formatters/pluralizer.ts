export const pluralize = (word: string, count: number): string => {
    const isPlural = count !== 1
    switch (word) {
        case 'do':
            return isPlural ? 'do' : 'does'
        case 'does':
            return isPlural ? 'do' : 'does'
        default:
            return isPlural ? word + 's' : word
    }
}
