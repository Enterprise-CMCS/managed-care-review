import { screen, waitFor } from '@testing-library/react'
import { within } from '@testing-library/react'
import dayjs from 'dayjs'
import { act } from 'react-dom/test-utils'
import { createMemoryHistory } from 'history'
import userEvent from '@testing-library/user-event'

import {
    mockDraft,
    fetchCurrentUserMock,
    updateDraftSubmissionMock,
} from '../../../testHelpers/apolloHelpers'

import {
    SubmissionType,
    ContractType,
    FederalAuthority,
    CapitationRatesAmendmentReason,
} from '../../../gen/gqlClient'

import { renderWithProviders } from '../../../testHelpers/jestHelpers'

import { ContractDetails } from './ContractDetails'

describe('ContractDetails', () => {
    it('progressively discloses options for capitation rates', async () => {
        // mount an empty form

        const emptyDraft = mockDraft()
        emptyDraft.id = '12'
        const history = createMemoryHistory()

        renderWithProviders(<ContractDetails draftSubmission={emptyDraft} />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    updateDraftSubmissionMock({
                        id: '12',
                        updates: {
                            programID: 'snbc',
                            submissionType: 'CONTRACT_ONLY' as SubmissionType,
                            submissionDescription: 'A real submission',
                            documents: [],
                            contractType: 'AMENDMENT' as ContractType,
                            contractDateStart: dayjs().format('YYYY-MM-DD'),
                            contractDateEnd: dayjs().format('YYYY-MM-DD'),
                            federalAuthorities: [
                                FederalAuthority.Voluntary,
                                FederalAuthority.Benchmark,
                                FederalAuthority.Waiver_1115,
                            ],
                            managedCareEntities: ['MCO'],
                            contractAmendmentInfo: {
                                itemsBeingAmended: ['CAPITATION_RATES'],
                                otherItemBeingAmended: null,
                                capitationRatesAmendedInfo: {
                                    reason: 'OTHER' as CapitationRatesAmendmentReason,
                                    otherReason: 'x',
                                },
                                relatedToCovid19: false,
                                relatedToVaccination: null,
                            },
                        },
                        statusCode: 200,
                    }),
                ],
            },
            routerProvider: {
                route: '/submissions/12/contract-details',
                routerProps: { history: history },
            },
        })

        expect(
            await screen.findByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()

        // should not be able to find hidden things
        // "Items being amended"
        expect(screen.queryByText('Items being amended')).toBeNull()
        expect(
            screen.queryByText(
                'Is this contract action related to the COVID-19 public health emergency?'
            )
        ).toBeNull()

        // click amendment
        const amendmentRadio = screen.getByLabelText(
            'Amendment to base contract'
        )
        amendmentRadio.click()

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
                'You must select why capitation rates are changing'
            )
        ).toBeInTheDocument()

        // click annual rate
        await act(async () => {
            screen.getByLabelText('Mid-year update').click()
        })

        // error should be gone
        expect(
            screen.queryByText(
                'You must select why capitation rates are changing'
            )
        ).toBeNull()

        // click other,
        const capitationChoices = screen.getByText(
            'Select reason for capitation rate change'
        ).parentElement
        if (capitationChoices === null) {
            throw new Error('cap choices should always have a parent')
        }

        await act(async () => {
            within(capitationChoices)
                .getByLabelText('Other (please describe)')
                .click()
        })

        // other is displayed, error is back
        expect(
            screen.getByText('You must enter the other reason')
        ).toBeInTheDocument()

        // click "NO" for the Covid question so we can submit
        await act(async () => {
            const otherBox = screen.getByLabelText(
                'Other capitation rate description'
            )
            userEvent.type(otherBox, 'x') // WEIRD, for some reason it's not recording but the last character of the typing
            screen.getByLabelText('No').click()
        })

        // click continue
        act(() => {
            userEvent.click(continueButton)
        })

        // this should succeed
        await waitFor(() => {
            expect(history.location.pathname).toBe(
                '/submissions/12/rate-details'
            )
        })
    })

    it('progressively discloses option for amended items', async () => {
        // mount an empty form

        const emptyDraft = mockDraft()

        renderWithProviders(<ContractDetails draftSubmission={emptyDraft} />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

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
            screen.getByText('You must enter the other item')
        ).toBeInTheDocument()

        // click annual rate
        await act(async () => {
            const other = screen.getByLabelText('Other item description')
            userEvent.type(other, 'foo bar')
        })

        // error should be gone
        expect(screen.queryByText('You must enter the other item')).toBeNull()
    })

    it('progressively discloses option for covid', async () => {
        // mount an empty form

        const emptyDraft = mockDraft()
        emptyDraft.id = '12'
        const history = createMemoryHistory()

        renderWithProviders(<ContractDetails draftSubmission={emptyDraft} />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
            routerProvider: {
                route: '/submissions/12/contract-details',
                routerProps: { history: history },
            },
        })

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
