import { screen, within } from '@testing-library/react'

function getParent(element: HTMLElement): HTMLElement {
    const parent = element.parentElement

    if (!parent) {
        throw new Error('Element has no parent')
    }

    return parent
}

// For testing, this function searches for a FieldYesNo that has the passed in label
// this will throw if the parent element does not exist.
function getYesNoFieldValue(label: string): boolean | undefined {
    const title = screen.getByText(label)
    const parent = getParent(title)

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
// For testing, properly access external input for date range picker to set value
const getExternalInputFromDateRange = (inputs: HTMLElement[]) => {
    const input = inputs.find(
        (input) =>
            input.getAttribute('data-testId') === 'date-picker-external-input'
    )
    if (!input) throw new Error('No date range input found')
    return input
}

export { getExternalInputFromDateRange, getYesNoFieldValue, getParent }
