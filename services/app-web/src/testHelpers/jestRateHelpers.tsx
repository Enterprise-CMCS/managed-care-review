import { waitFor, within, fireEvent, type Screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import selectEvent from 'react-select-event'
import { TEST_PDF_FILE, updateDateRange } from '../testHelpers'

const fillOutIndexRate = async (screen: Screen, index: number) => {
    const targetRateCert = rateCertifications(screen)[index]
    expect(targetRateCert).toBeDefined()
    const withinTargetRateCert = within(targetRateCert)
    //Rates across submission
    const sharedRates = withinTargetRateCert.queryByText(
        /Was this rate certification included with another submission?/
    )
    //if rates across submission UI exists then fill out section
    if (sharedRates) {
        expect(sharedRates).toBeInTheDocument()
        withinTargetRateCert
            .getByLabelText(
                'No, this rate certification was not included with any other submissions'
            )
            .click()
    }
    // assert proper initial fields are present
    expect(
        withinTargetRateCert.getByText('Upload one rate certification document')
    ).toBeInTheDocument()
    expect(
        withinTargetRateCert.getByText(
            'Programs this rate certification covers'
        )
    ).toBeInTheDocument()
    expect(
        withinTargetRateCert.getByText('Rate certification type')
    ).toBeInTheDocument()
    expect(
        withinTargetRateCert.getByText(
            'Does the actuary certify capitation rates specific to each rate cell or a rate range?'
        )
    ).toBeInTheDocument()

    // add 1 doc
    const input = withinTargetRateCert.getByLabelText(
        'Upload one rate certification document'
    )
    await userEvent.upload(input, [TEST_PDF_FILE])

    // add programs
    const combobox = await withinTargetRateCert.findByRole('combobox')
    selectEvent.openMenu(combobox)
    await selectEvent.select(combobox, 'SNBC')
    selectEvent.openMenu(combobox)
    await selectEvent.select(combobox, 'PMAP')
    expect(
        withinTargetRateCert.getByLabelText('Remove SNBC')
    ).toBeInTheDocument()
    expect(
        withinTargetRateCert.getByLabelText('Remove PMAP')
    ).toBeInTheDocument()

    //  add types and answer captitation rates question
    withinTargetRateCert.getByLabelText('New rate certification').click()

    withinTargetRateCert
        .getByLabelText(
            'Certification of capitation rates specific to each rate cell'
        )
        .click()

    // check that now we can see dates, since that is triggered after selecting type
    await waitFor(() => {
        expect(
            withinTargetRateCert.queryByText('Start date')
        ).toBeInTheDocument()
        expect(withinTargetRateCert.queryByText('End date')).toBeInTheDocument()
        expect(
            withinTargetRateCert.queryByText('Date certified')
        ).toBeInTheDocument()
        expect(withinTargetRateCert.queryByText('Name')).toBeInTheDocument()
        expect(
            withinTargetRateCert.queryByText('Title/Role')
        ).toBeInTheDocument()
        expect(withinTargetRateCert.queryByText('Email')).toBeInTheDocument()
    })

    const startDateInputs = withinTargetRateCert.getAllByLabelText('Start date')
    const endDateInputs = withinTargetRateCert.getAllByLabelText('End date')
    await updateDateRange({
        start: { elements: startDateInputs, date: '01/01/2022' },
        end: { elements: endDateInputs, date: '12/31/2022' },
    })

    withinTargetRateCert.getAllByLabelText('Date certified')[0].focus()
    await userEvent.paste('12/01/2021')

    // fill out actuary contact
    withinTargetRateCert.getByLabelText('Name').focus()
    await userEvent.paste(`Actuary Contact Person ${index}`)

    withinTargetRateCert.getByLabelText('Title/Role').focus()
    await userEvent.paste(`Actuary Contact Title ${index}`)

    withinTargetRateCert.getByLabelText('Email').focus()
    await userEvent.paste(`actuarycontact${index}@test.com`)

    await userEvent.click(withinTargetRateCert.getByLabelText('Mercer'))
}

const rateCertifications = (screen: Screen) => {
    return screen.getAllByTestId('rate-certification-form')
}

const lastRateCertificationFromList = (screen: Screen) => {
    return rateCertifications(screen).pop()
}

const fillOutFirstRate = async (screen: Screen) => {
    // trigger errors (used later to confirm we filled out every field)
    fireEvent.click(
        screen.getByRole('button', {
            name: 'Continue',
        })
    )

    await fillOutIndexRate(screen, 0)
}

const clickAddNewRate = async (screen: Screen) => {
    const rateCertsBeforeAddingNewRate = rateCertifications(screen)

    const addAnotherButton = screen.getByRole('button', {
        name: /Add another rate/,
    })

    expect(addAnotherButton).toBeInTheDocument()
    fireEvent.click(addAnotherButton)
    return await waitFor(() =>
        expect(rateCertifications(screen)).toHaveLength(
            rateCertsBeforeAddingNewRate.length + 1
        )
    )
}

const clickRemoveIndexRate = async (
    screen: Screen,
    indexOfRateCertToRemove: number
) => {
    // Remember, user cannot never remove the first rate certification -- MR-2231
    const rateCertsBeforeRemoving = rateCertifications(screen)
    // Confirm there is a rate to remove
    expect(rateCertsBeforeRemoving.length).toBeGreaterThanOrEqual(2)

    // Confirm there is one less rate removal button than rate certs
    const removeRateButtonsBeforeClick = screen.getAllByRole('button', {
        name: /Remove rate certification/,
    })
    expect(removeRateButtonsBeforeClick.length).toBeGreaterThanOrEqual(1)
    expect(removeRateButtonsBeforeClick).toHaveLength(
        rateCertsBeforeRemoving.length - 1
    )

    // Remove rate cert
    const removeRateButton =
        removeRateButtonsBeforeClick[indexOfRateCertToRemove - 1]

    expect(removeRateButton).toBeInTheDocument()
    fireEvent.click(removeRateButton)

    await waitFor(() => {
        // Confirm that there is one less rate certification on the page
        expect(rateCertifications(screen)).toHaveLength(1)
        expect(rateCertifications(screen)).toHaveLength(
            rateCertsBeforeRemoving.length - 1
        )
        // Confirm that there is one less rate removal button (might even be zero buttons on page if all additional rates removed)
        expect(
            screen.queryAllByRole('button', {
                name: /Remove rate certification/,
            })
        ).toHaveLength(removeRateButtonsBeforeClick.length - 1)
    })
}

export {
    clickAddNewRate,
    clickRemoveIndexRate,
    fillOutFirstRate,
    fillOutIndexRate,
    rateCertifications,
    lastRateCertificationFromList,
}
