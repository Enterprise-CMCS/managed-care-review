
// returns today's date in the ISO standard form. like '2022-02-24'
function todaysDate(): string {
    const today = new Date()
    const todaysDate = today.toISOString().split('T')[0]
    return todaysDate
}

export {
    todaysDate
}
