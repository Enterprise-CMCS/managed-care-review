import { screen, waitFor, within } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { createMemoryHistory } from 'history'
import userEvent from '@testing-library/user-event'

import {
    mockDraft,
    fetchCurrentUserMock,
} from '../../../testHelpers/apolloHelpers'

import {
    renderWithProviders,
    TEST_DOC_FILE,
    TEST_PDF_FILE,
    TEST_XLS_FILE,
    TEST_PNG_FILE,
    dragAndDrop,
} from '../../../testHelpers/jestHelpers'

import { ContractDetails } from './'

describe('ContractDetails', () => {
    afterEach(() => jest.clearAllMocks())

    it('progressively discloses options for capitation rates', async () => {
        // mount an empty form

        const emptyDraft = mockDraft()
        emptyDraft.id = '12'
        const history = createMemoryHistory()

        renderWithProviders(
            <ContractDetails
                draftSubmission={emptyDraft}
                updateDraft={async (_) => undefined}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: {
                    route: '/submissions/12/contract-details',
                    routerProps: { history: history },
                },
            }
        )

        // should not be able to find hidden things
        // "Items being amended"
        expect(screen.queryByText('Items being amended')).toBeNull()
        expect(
            screen.queryByText(
                'Is this contract action related to the COVID-19 public health emergency?'
            )
        ).toBeNull()

        // click amendment and upload docs
        const amendmentRadio = screen.getByLabelText(
            'Amendment to base contract'
        )
        amendmentRadio.click()
        const input = screen.getByLabelText('Upload contract')
        userEvent.upload(input, [TEST_DOC_FILE])

        // check that now we can see hidden things
        expect(screen.queryByText('Items being amended')).toBeInTheDocument()
        expect(
            screen.queryByText(
                'Is this contract action related to the COVID-19 public health emergency?'
            )
        ).toBeInTheDocument()

        // click "next"
        const continueButton = screen.getByRole('button', { name: 'Continue' })
        await act(async () => {
            continueButton.click()
        })

        // select some things to narrow down which errors we are looking for
        // these options have to be selected no matter which type of contract it is
        await act(async () => {
            screen.getByLabelText('Managed Care Organization (MCO)').click()
            screen.getByLabelText('1115 Waiver Authority').click()
        })

        // check that there are the errors we expect
        expect(
            screen.queryByText('You must select at least one item')
        ).toBeInTheDocument()

        // click capRates
        await act(async () => {
            screen.getByLabelText('Capitation rates').click()
        })
        expect(
            screen.queryByText('You must select at least one item')
        ).toBeNull()

        // check error for not selected
        expect(
            screen.getByText(
                'You must select a reason for capitation rate change'
            )
        ).toBeInTheDocument()

        // click annual rate
        await act(async () => {
            screen.getByLabelText('Mid-year update').click()
        })

        // error should be gone
        expect(
            screen.queryByText(
                'You must select a reason for capitation rate change'
            )
        ).toBeNull()

        // click other,
        const capitationChoices = screen.getByText(
            'Select reason for capitation rate change'
        ).parentElement
        if (capitationChoices === null) {
            throw new Error('cap choices should always have a parent')
        }

        within(capitationChoices)
            .getByLabelText('Other (please describe)')
            .click()

        // other is displayed, error is back
        await waitFor(() =>
            expect(
                screen.getByText('You must enter a description')
            ).toBeInTheDocument()
        )
        // click "NO" for the Covid question so we can submit
        const otherBox = screen.getByLabelText(
            'Other capitation rate description'
        )
        userEvent.type(otherBox, 'x') // WEIRD, for some reason it's not recording but the last character of the typing
        await waitFor(() => screen.getByLabelText('No').click())

        // click continue

        userEvent.click(continueButton)

        await waitFor(() => {
            expect(screen.queryAllByTestId('errorMessage').length).toBe(0)
        })
    })

    it('progressively discloses option for amended items', async () => {
        // mount an empty form

        const emptyDraft = mockDraft()
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <ContractDetails
                draftSubmission={emptyDraft}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        // click amendment
        const amendmentRadio = screen.getByLabelText(
            'Amendment to base contract'
        )
        amendmentRadio.click()

        // click "next"
        const continueButton = screen.getByRole('button', { name: 'Continue' })
        await act(async () => {
            continueButton.click()
        })

        // select some things to narrow down which errors we are looking for
        // these options have to be selected no matter which type of contract it is
        await act(async () => {
            screen.getByLabelText('Managed Care Organization (MCO)').click()
            screen.getByLabelText('1115 Waiver Authority').click()
        })

        // click other
        await act(async () => {
            screen.getByLabelText('Other (please describe)').click()
        })

        // check error for not selected
        expect(
            screen.getByText('You must enter a description')
        ).toBeInTheDocument()

        // click annual rate
        await act(async () => {
            const other = screen.getByLabelText('Other item description')
            userEvent.type(other, 'foo bar')
        })

        // error should be gone
        expect(screen.queryByText('You must enter a description')).toBeNull()
    })

    it('progressively discloses option for covid', async () => {
        // mount an empty form

        const emptyDraft = mockDraft()
        emptyDraft.id = '12'
        const history = createMemoryHistory()
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <ContractDetails
                draftSubmission={emptyDraft}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: {
                    route: '/submissions/12/contract-details',
                    routerProps: { history: history },
                },
            }
        )

        // click amendment
        const amendmentRadio = screen.getByLabelText(
            'Amendment to base contract'
        )
        amendmentRadio.click()

        // click "next"
        const continueButton = screen.getByRole('button', { name: 'Continue' })
        await act(async () => {
            continueButton.click()
        })

        // select some things to narrow down which errors we are looking for
        // these options have to be selected no matter which type of contract it is
        await act(async () => {
            screen.getByLabelText('Managed Care Organization (MCO)').click()
            screen.getByLabelText('1115 Waiver Authority').click()
            screen.getByLabelText('Financial incentives').click()
        })

        // check on the covid error
        expect(
            screen.queryByText(
                'You must indicate whether or not this contract action is related to COVID-19'
            )
        ).toBeInTheDocument()

        // click other
        await act(async () => {
            screen.getByLabelText('Yes').click()
        })

        // check error for not selected
        expect(
            screen.getByText(
                'Is this related to coverage and reimbursement for vaccine administration?'
            )
        ).toBeInTheDocument()
        expect(
            screen.queryByText(
                'You must indicate whether or not this is related to vaccine administration'
            )
        ).toBeInTheDocument()

        // click annual rate
        await act(async () => {
            const vaccineNo = screen.getAllByLabelText('No')[1]
            vaccineNo.click()
        })

        // error should be gone
        expect(
            screen.queryByText(
                'You must indicate whether or not this is related to vaccine administration'
            )
        ).toBeNull()
    })
})
