
// All draft revision relationships are set to be valid at the same far future date
// This allows us to filter them out when considering submitted revisions.
// When a revision is submitted all relationships are then given the current date making them valid
const DraftValidAfterDate = new Date(3000,1,1)

export {
    DraftValidAfterDate
}
