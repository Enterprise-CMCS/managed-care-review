/*
   Determines UX for package data on summary pages, accounting for possible missing fields.
   
   On the submission summary and review and submit pages, there are a variety of states a package could be in depending on isSubmitted value
   - on the submission summary page, we hide empty missing fields from view
   - on the review and submit page, we display empty missing fields to user so they know to edit and change their unlocked package

   TODO: refactor into DataDetail component.
*/
import styles from './SubmissionSummarySection.module.scss'

function handlePossibleMissingRequiredField<T>({
    isSubmitted,
    fieldValue,
}: {
    isSubmitted: boolean // only true on submission summary page
    fieldValue: T | undefined
}): T | React.ReactNode {
    const requiredFieldMissingText =
        'Missing Field - this field is required. Please edit this section to include a response.'

    if (isSubmitted && fieldValue === undefined) {
        // hide from view entirely
        return null
    } else if (!isSubmitted && fieldValue === undefined) {
        // display missing required field error text
        return (
            <span className={styles.missingField}>
                {requiredFieldMissingText}
            </span>
        )
    } else {
        // display field value
        return fieldValue
    }
}

export { handlePossibleMissingRequiredField }
