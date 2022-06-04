import { screen, within } from '@testing-library/react'

// For testing, this function searches for a FieldYesNo that has the passed in label
// this will throw if the parent element does not exist.
function getYesNoFieldValue(label: string): boolean | undefined {
    const title = screen.getByText(label)
    const parent = title.parentElement

    if (!parent) {
        throw new Error('YesNo label has no parent')
    }

    const yes = within(parent).getByLabelText('Yes') as HTMLInputElement
    const no = within(parent).getByLabelText('No') as HTMLInputElement

    if (yes.checked) {
        return true
    }

    if (no.checked) {
        return false
    }

    return undefined
}

export { getYesNoFieldValue }
