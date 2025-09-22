// returns today's date in the ISO standard form. like '2022-02-24'
function todaysDate(): string {
    const today = new Date()
    return today.toISOString().split('T')[0]
}

export { todaysDate }
