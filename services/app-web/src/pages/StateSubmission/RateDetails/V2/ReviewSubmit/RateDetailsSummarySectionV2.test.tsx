import { screen, waitFor, within } from '@testing-library/react'
import {
    mockContractAndRatesDraftV2,
    mockContractAndRatesSubmittedV2,
    mockMNState,
    fetchCurrentUserMock,
    mockValidCMSUser,
    indexHealthPlanPackagesMockSuccess,
} from '../../../../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../../../../testHelpers/jestHelpers'
import { RateDetailsSummarySectionV2 as RateDetailsSummarySection } from './RateDetailsSummarySectionV2'
import { Rate } from '../../../../../gen/gqlClient'

describe('RateDetailsSummarySection', () => {
    const draftContract = mockContractAndRatesDraftV2()
    const submittedContract = mockContractAndRatesSubmittedV2()
    const statePrograms = mockMNState().programs
    const mockRateInfos: Rate[] = [
        {
            id: '1234',
            createdAt: new Date('01/01/2021'),
            updatedAt: new Date('01/01/2021'),
            status: 'DRAFT', 
            state: mockMNState(),
            stateCode: 'MN',
            stateNumber: 5,
            revisions: [],
            draftRevision: {
                id: '1234',
                createdAt: new Date('01/01/2021'),
                updatedAt: new Date('01/01/2021'),
                contractRevisions: [],
                formData: {
                    rateType: 'NEW',
                    rateCapitationType: 'RATE_CELL',
                    rateDocuments: [
                        {
                            s3URL: 's3://foo/bar/rate',
                            name: 'rate docs test 1',
                            sha256: 'fakesha',
                        },
                    ],
                    supportingDocuments: [],
                    rateDateStart: new Date('01/01/2021'),
                    rateDateEnd: new Date('12/31/2021'),
                    rateDateCertified: new Date('12/31/2020'),
                    amendmentEffectiveDateStart: new Date('01/01/2021'),
                    amendmentEffectiveDateEnd: new Date('12/31/2021'),
                    rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                    certifyingActuaryContacts: [
                        {
                            actuarialFirm: 'DELOITTE',
                            name: 'Jimmy Jimerson',
                            titleRole: 'Certifying Actuary',
                            email: 'jj.actuary@test.com',
                        },
                    ],
                    addtlActuaryContacts: [],
                    packagesWithSharedRateCerts: [],
                
                }
            }
        },
        {
            id: '5678',
            createdAt: new Date('01/01/2021'),
            updatedAt: new Date('01/01/2021'),
            status: 'DRAFT', 
            state: mockMNState(),
            stateCode: 'MN',
            stateNumber: 5,
            revisions: [],
            draftRevision: {
                id: '1234',
                createdAt: new Date('01/01/2021'),
                updatedAt: new Date('01/01/2021'),
                contractRevisions: [],
                formData: {
                    rateType: 'AMENDMENT',
                    rateCapitationType: 'RATE_CELL',
                    rateDocuments: [
                        {
                            s3URL: 's3://foo/bar/rate',
                            name: 'rate docs test 1',
                            sha256: 'fakesha',
                        },
                    ],
                    supportingDocuments: [],
                    rateDateStart: new Date('01/01/2021'),
                    rateDateEnd: new Date('12/31/2021'),
                    rateDateCertified: new Date('12/31/2020'),
                    amendmentEffectiveDateStart: new Date('01/01/2021'),
                    amendmentEffectiveDateEnd: new Date('12/31/2021'),
                    rateProgramIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
                    certifyingActuaryContacts: [
                        {
                            actuarialFirm: 'DELOITTE',
                            name: 'Timmy Timerson',
                            titleRole: 'Certifying Actuary',
                            email: 'tt.actuary@test.com',
                        },
                    ],
                    addtlActuaryContacts: [],
                    packagesWithSharedRateCerts: [],
                
                }
            }
        },
    ]

    const apolloProvider = {
        mocks: [
            fetchCurrentUserMock({
                statusCode: 200,
                user: mockValidCMSUser(),
            }),
            indexHealthPlanPackagesMockSuccess(),
        ],
    }

    afterEach(() => jest.clearAllMocks())

    it('can render draft contract with rates without errors', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={draftContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Rate details',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit Rate details' })
        ).toHaveAttribute('href', '/rate-details')
    })

    it('can render submitted contract without errors', async () => {
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={submittedContract}
                submissionName="MN-MSHO-0003"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Rate details',
            })
        ).toBeInTheDocument()
        // Is this the best way to check that the link is not present?
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()

        //expects loading button on component load
        expect(screen.getByText('Loading')).toBeInTheDocument()

        // expects download all button after loading has completed
        // await waitFor(() => {
        //     expect(
        //         screen.getByRole('link', {
        //             name: 'Download all rate documents',
        //         })
        //     ).toBeInTheDocument()
        // })
    })

    it('can render all rate details fields for amendment to prior rate certification submission', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={draftContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        expect(
            screen.getByRole('definition', { name: 'Rate certification type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Rating period of original rate certification',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Date certified for rate amendment',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Rate amendment effective dates',
            })
        ).toBeInTheDocument()
    })


    it('can render correct rate name for AMENDMENT rate submission', () => {
        const submission = {
            ...mockContractAndRatesDraftV2(),
            rateDateStart: new Date('2022-01-25'),
            rateDateEnd: new Date('2023-01-25'),
            rateDateCertified: new Date('2022-01-26'),
            amendmentEffectiveDateStart: new Date('2022-02-25'),
            amendmentEffectiveDateEnd: new Date('2023-02-26'),
        }
        const draftRate = submission?.draftRates!
        const draftRev = draftRate[0].draftRevision!
        draftRev.formData.rateCertificationName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'

        const statePrograms = mockMNState().programs

        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={submission}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )

        const rateName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'

        expect(screen.getByText(rateName)).toBeInTheDocument()
    })

    it('renders rate cell capitation type', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={draftContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        expect(
            screen.getByRole('definition', {
                name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Certification of capitation rates specific to each rate cell'
            )
        ).toBeInTheDocument()
    })

    it('renders rate range capitation type', () => {
        const draftContract = mockContractAndRatesDraftV2()
        draftContract.draftRates![0].draftRevision!.formData.rateCapitationType = 'RATE_RANGE'
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={draftContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        expect(
            screen.getByRole('definition', {
                name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Certification of rate ranges of capitation rates per rate cell'
            )
        ).toBeInTheDocument()
    })

    it('renders programs that apply to rate certification', async () => {
        const draftContract = mockContractAndRatesDraftV2()
        draftContract.draftRates![0].draftRevision!.formData.rateProgramIDs = [
            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
            'd95394e5-44d1-45df-8151-1cc1ee66f100',
        ]
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={draftContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        const programElement = screen.getByRole('definition', {
            name: 'Programs this rate certification covers',
        })
        expect(programElement).toBeInTheDocument()
        const programList = within(programElement).getByText('SNBC, PMAP')
        expect(programList).toBeInTheDocument()
    })

    it('renders rate program names even when rate program ids are missing', async () => {
        const draftContract = mockContractAndRatesDraftV2()
        draftContract.draftRates![0].draftRevision!.formData.rateProgramIDs = []
        draftContract.draftRevision!.formData.programIDs = [
            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
            'd95394e5-44d1-45df-8151-1cc1ee66f100',
        ]
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={draftContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        const programElement = screen.getByRole('definition', {
            name: 'Programs this rate certification covers',
        })
        expect(programElement).toBeInTheDocument()
        const programList = within(programElement).getByText('SNBC, PMAP')
        expect(programList).toBeInTheDocument()
    })

    it('renders multiple rate certifications with program names', async () => {
        const draftContract = mockContractAndRatesDraftV2()
        draftContract.draftRates = mockRateInfos
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={draftContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        const programList = screen.getAllByRole('definition', {
            name: 'Programs this rate certification covers',
        })
        expect(programList).toHaveLength(2)
        expect(programList[0]).toHaveTextContent('SNBC')
        expect(programList[1]).toHaveTextContent('PMAP')
    })

    it('renders multiple rate certifications with rate type', async () => {
        const draftContract = mockContractAndRatesDraftV2()
        draftContract.draftRates = mockRateInfos

        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={draftContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        const certType = screen.getAllByRole('definition', {
            name: 'Rate certification type',
        })
        expect(certType).toHaveLength(2)
        expect(certType[0]).toHaveTextContent('New')
        expect(certType[1]).toHaveTextContent('Amendment')
    })

    it('renders multiple rate certifications with certifying actuary', async () => {
        const draftContract = mockContractAndRatesDraftV2()
        draftContract.draftRates = mockRateInfos
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                contract={draftContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        await waitFor(() => {
            const certifyingActuary = screen.getAllByRole('definition', {
                name: 'Certifying actuary',
            })
            expect(certifyingActuary).toHaveLength(2)
            expect(
                within(certifyingActuary[0]).queryByRole('link', {
                    name: 'jj.actuary@test.com',
                })
            ).toBeInTheDocument()
            expect(
                within(certifyingActuary[1]).queryByRole('link', {
                    name: 'tt.actuary@test.com',
                })
            ).toBeInTheDocument()
        })
    })
})
