import { screen, waitFor, within } from '@testing-library/react'
import {
    mockContractPackageDraft,
    mockContractPackageSubmitted,
    mockMNState,
    fetchCurrentUserMock,
    mockValidCMSUser,
} from '../../../../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../../../../testHelpers/jestHelpers'
import { RateDetailsSummarySectionV2 as RateDetailsSummarySection } from './RateDetailsSummarySectionV2'
import { Rate } from '../../../../../gen/gqlClient'
import { testS3Client } from '../../../../../testHelpers/s3Helpers'
import { ActuaryCommunicationRecord } from '../../../../../constants'

describe('RateDetailsSummarySection', () => {
    const draftContract = mockContractPackageDraft()
    const submittedContract = mockContractPackageSubmitted()
    const statePrograms = mockMNState().programs
    const makeMockRateInfos = (): Rate[] => {
        return [
            {
                id: '1234',
                createdAt: new Date('01/01/2021'),
                updatedAt: new Date('01/01/2021'),
                status: 'DRAFT',
                state: mockMNState(),
                stateCode: 'MN',
                stateNumber: 5,
                parentContractID: 'test-abc-123',
                revisions: [],
                draftRevision: {
                    id: '1234',
                    rateID: '5678',
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
                                dateAdded: new Date(),
                            },
                        ],
                        supportingDocuments: [],
                        rateDateStart: new Date('01/01/2021'),
                        rateDateEnd: new Date('12/31/2021'),
                        rateDateCertified: new Date('12/31/2020'),
                        amendmentEffectiveDateStart: new Date('01/01/2021'),
                        amendmentEffectiveDateEnd: new Date('12/31/2021'),
                        rateProgramIDs: [
                            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        ],
                        deprecatedRateProgramIDs: [],
                        certifyingActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Jimmy Jimerson',
                                titleRole: 'Certifying Actuary',
                                email: 'jj.actuary@test.com',
                            },
                        ],
                        addtlActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Additional actuary',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'additionalactuarycontact1@test.com',
                            },
                        ],
                        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                        packagesWithSharedRateCerts: [],
                    },
                },
            },
            {
                id: '5678',
                createdAt: new Date('01/01/2021'),
                updatedAt: new Date('01/01/2021'),
                status: 'DRAFT',
                state: mockMNState(),
                stateCode: 'MN',
                stateNumber: 5,
                parentContractID: 'test-abc-123',
                revisions: [],
                draftRevision: {
                    id: '1234',
                    rateID: '5678',
                    createdAt: new Date('01/01/2021'),
                    updatedAt: new Date('01/01/2021'),
                    contractRevisions: [],
                    formData: {
                        rateType: 'AMENDMENT',
                        rateCapitationType: 'RATE_CELL',
                        rateDocuments: [
                            {
                                s3URL: 's3://foo/bar/rate',
                                name: 'rate docs test 2',
                                sha256: 'fakesha',
                                dateAdded: new Date(),
                            },
                        ],
                        supportingDocuments: [],
                        rateDateStart: new Date('01/01/2021'),
                        rateDateEnd: new Date('12/31/2021'),
                        rateDateCertified: new Date('12/31/2020'),
                        amendmentEffectiveDateStart: new Date('01/01/2021'),
                        amendmentEffectiveDateEnd: new Date('12/31/2021'),
                        rateProgramIDs: [
                            'd95394e5-44d1-45df-8151-1cc1ee66f100',
                        ],
                        deprecatedRateProgramIDs: [],
                        certifyingActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Timmy Timerson',
                                titleRole: 'Certifying Actuary',
                                email: 'tt.actuary@test.com',
                            },
                        ],
                        addtlActuaryContacts: [],
                        actuaryCommunicationPreference: 'OACT_TO_STATE',
                        packagesWithSharedRateCerts: [],
                    },
                },
            },
        ]
    }

    const apolloProvider = {
        mocks: [
            fetchCurrentUserMock({
                statusCode: 200,
                user: mockValidCMSUser(),
            }),
        ],
    }

    afterEach(() => jest.clearAllMocks())

    it('can render draft contract with rates without errors', () => {
        renderWithProviders(
            <RateDetailsSummarySection
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
        await waitFor(() => {
            expect(
                screen.getByRole('link', {
                    name: 'Download all rate documents',
                })
            ).toBeInTheDocument()
        })
    })

    it('can render all rate details fields for amendment to prior rate certification submission', () => {
        renderWithProviders(
            <RateDetailsSummarySection
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

    it('can render correct rate name for new rate submission', async () => {
        const contract = mockContractPackageSubmitted()
        contract.packageSubmissions[0].rateRevisions[0].formData.rateCertificationName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'

        const statePrograms = mockMNState().programs
        await waitFor(() => {
            renderWithProviders(
                <RateDetailsSummarySection
                    contract={contract}
                    editNavigateTo="rate-details"
                    submissionName="MN-MSHO-0003"
                    statePrograms={statePrograms}
                />,
                {
                    apolloProvider,
                }
            )
        })
        const rateName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'
        expect(screen.getByText(rateName)).toBeInTheDocument()
    })

    it('can render correct rate name for AMENDMENT rate submission', () => {
        const submission = {
            ...mockContractPackageDraft(),
            rateDateStart: new Date('2022-01-25'),
            rateDateEnd: new Date('2023-01-25'),
            rateDateCertified: new Date('2022-01-26'),
            amendmentEffectiveDateStart: new Date('2022-02-25'),
            amendmentEffectiveDateEnd: new Date('2023-02-26'),
        }
        const draftRate = submission?.draftRates
        if (draftRate) {
            const draftRev = draftRate[0].draftRevision
            if (draftRev) {
                draftRev.formData.rateCertificationName =
                    'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'

                const statePrograms = mockMNState().programs

                renderWithProviders(
                    <RateDetailsSummarySection
                        contract={submission}
                        editNavigateTo="rate-details"
                        submissionName="MN-PMAP-0001"
                        statePrograms={statePrograms}
                    />,
                    {
                        apolloProvider,
                    }
                )
            }
        }
        const rateName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'
        expect(screen.getByText(rateName)).toBeInTheDocument()
    })

    it('can render all rate details fields for new rate certification submission', async () => {
        const statePrograms = mockMNState().programs
        const contract = mockContractPackageSubmitted()
        contract.packageSubmissions[0].rateRevisions[0].formData.rateCertificationName =
            'MCR-MN-0005-SNBC-RATE-20221014-20221014-CERTIFICATION-20221014'
        contract.packageSubmissions[0].rateRevisions[0].formData.rateType =
            'NEW'
        contract.packageSubmissions[0].rateRevisions[0].formData.amendmentEffectiveDateStart =
            null
        await waitFor(() => {
            renderWithProviders(
                <RateDetailsSummarySection
                    contract={contract}
                    submissionName="MN-MSHO-0003"
                    statePrograms={statePrograms}
                />,
                {
                    apolloProvider,
                }
            )
        })

        const rateName =
            'MCR-MN-0005-SNBC-RATE-20221014-20221014-CERTIFICATION-20221014'

        expect(screen.getByText(rateName)).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Rate certification type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Rates this rate certification covers',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Rating period' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Date certified' })
        ).toBeInTheDocument()
    })

    it('Displays any historic rate programs when present on a rate certification submission', async () => {
        const statePrograms = mockMNState().programs
        const contract = mockContractPackageSubmitted()
        contract.packageSubmissions[0].rateRevisions[0].formData.deprecatedRateProgramIDs =
            [statePrograms[0].id]

        contract.packageSubmissions[0].rateRevisions[0].formData.rateProgramIDs =
            [statePrograms[1].id]
        await waitFor(() => {
            renderWithProviders(
                <RateDetailsSummarySection
                    contract={contract}
                    submissionName="MN-MSHO-0003"
                    statePrograms={statePrograms}
                />,
                {
                    apolloProvider,
                }
            )
        })
        expect(screen.getByText('SNBC, PMAP')).toBeInTheDocument()
    })

    it('renders supporting rates docs when they exist', async () => {
        const draftContract = mockContractPackageDraft()
        if (
            draftContract.draftRates &&
            draftContract.draftRates[0].draftRevision
        ) {
            const contractWithRateDocsFormData = {
                ...draftContract.draftRates[0].draftRevision.formData,
                rateDocuments: [
                    {
                        s3URL: 's3://foo/bar/rate',
                        name: 'rate docs test 1',
                        sha256: 'fakesha',
                        dateAdded: new Date(),
                    },
                ],
                supportingDocuments: [
                    {
                        s3URL: 's3://foo/bar/test-2',
                        name: 'supporting docs test 2',
                        sha256: 'fakesha',
                        dateAdded: new Date(),
                    },
                    {
                        s3URL: 's3://foo/bar/test-3',
                        name: 'supporting docs test 3',
                        sha256: 'fakesha',
                        dateAdded: new Date(),
                    },
                ],
            }
            const contractWithRateDocs = {
                ...draftContract,
            }
            if (
                contractWithRateDocs.draftRates &&
                contractWithRateDocs.draftRates[0].draftRevision
            ) {
                contractWithRateDocs.draftRates[0].draftRevision.formData =
                    contractWithRateDocsFormData

                renderWithProviders(
                    <RateDetailsSummarySection
                        contract={contractWithRateDocs}
                        editNavigateTo="/rate-details'"
                        submissionName="MN-PMAP-0001"
                        statePrograms={statePrograms}
                    />,
                    {
                        apolloProvider,
                    }
                )
            }
        }
        await waitFor(() => {
            const supportingDocsTable = screen.getByRole('table', {
                name: /Rate supporting documents/,
            })
            const rateDocsTable = screen.getByRole('table', {
                name: /Rate certification/,
            })

            expect(rateDocsTable).toBeInTheDocument()
            expect(supportingDocsTable).toBeInTheDocument()

            const supportingDocsTableRows =
                within(supportingDocsTable).getAllByRole('rowgroup')
            expect(supportingDocsTableRows).toHaveLength(2)

            // check row content
            expect(
                within(rateDocsTable).getByRole('row', {
                    name: /rate docs test 1/,
                })
            ).toBeInTheDocument()
            expect(
                within(supportingDocsTable).getByText('supporting docs test 2')
            ).toBeInTheDocument()
            expect(
                within(supportingDocsTable).getByText('supporting docs test 3')
            ).toBeInTheDocument()

            // check correct category on supporting docs
            expect(
                within(supportingDocsTable).getAllByText('Rate-supporting')
            ).toHaveLength(2)
        })
    })

    it('does not render supporting rate documents when they do not exist', () => {
        const draftContract = mockContractPackageSubmitted()

        if (
            draftContract.draftRates &&
            draftContract.draftRates[0].draftRevision
        ) {
            const contractWithRateDocsFormData = {
                ...draftContract.draftRates[0].draftRevision.formData,
                rateDocuments: [
                    {
                        s3URL: 's3://foo/bar/rate',
                        name: 'rate docs test 1',
                        sha256: 'fakesha',
                        dateAdded: new Date(),
                    },
                ],
                supportingDocuments: [],
            }
            const contractWithRateDocs = {
                ...draftContract,
            }
            if (
                contractWithRateDocs.draftRates &&
                contractWithRateDocs.draftRates[0].draftRevision
            ) {
                contractWithRateDocs.draftRates[0].draftRevision.formData =
                    contractWithRateDocsFormData

                renderWithProviders(
                    <RateDetailsSummarySection
                        contract={draftContract}
                        submissionName="MN-PMAP-0001"
                        statePrograms={statePrograms}
                    />,
                    {
                        apolloProvider,
                    }
                )
            }
        }
        expect(
            screen.queryByRole('table', {
                name: /Rate supporting documents/,
            })
        ).toBeNull()
    })

    it('does not render download all button when on previous submission', async () => {
        await waitFor(() =>
            renderWithProviders(
                <RateDetailsSummarySection
                    contract={draftContract}
                    submissionName="MN-PMAP-0001"
                    statePrograms={statePrograms}
                />,
                {
                    apolloProvider,
                }
            )
        )

        expect(
            screen.queryByRole('button', {
                name: 'Download all rate documents',
            })
        ).toBeNull()
    })

    it('renders rate cell capitation type', () => {
        renderWithProviders(
            <RateDetailsSummarySection
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
        const draftContract = mockContractPackageDraft()
        if (
            draftContract.draftRates &&
            draftContract.draftRates[0].draftRevision
        ) {
            draftContract.draftRates[0].draftRevision.formData.rateCapitationType =
                'RATE_RANGE'
            renderWithProviders(
                <RateDetailsSummarySection
                    contract={draftContract}
                    editNavigateTo="rate-details"
                    submissionName="MN-PMAP-0001"
                    statePrograms={statePrograms}
                />,
                {
                    apolloProvider,
                }
            )
        }
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
        const draftContract = mockContractPackageDraft()
        if (
            draftContract.draftRates &&
            draftContract.draftRates[0].draftRevision
        ) {
            draftContract.draftRates[0].draftRevision.formData.rateProgramIDs =
                [
                    'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                    'd95394e5-44d1-45df-8151-1cc1ee66f100',
                ]
            renderWithProviders(
                <RateDetailsSummarySection
                    contract={draftContract}
                    editNavigateTo="rate-details"
                    submissionName="MN-PMAP-0001"
                    statePrograms={statePrograms}
                />,
                {
                    apolloProvider,
                }
            )
        }
        const programElement = screen.getByRole('definition', {
            name: 'Rates this rate certification covers',
        })
        expect(programElement).toBeInTheDocument()
        const programList = within(programElement).getByText('SNBC, PMAP')
        expect(programList).toBeInTheDocument()
    })

    it('renders multiple rate certifications with program names', async () => {
        const draftContract = mockContractPackageDraft()
        draftContract.draftRates = makeMockRateInfos()
        renderWithProviders(
            <RateDetailsSummarySection
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
            name: 'Rates this rate certification covers',
        })
        expect(programList).toHaveLength(2)
        expect(programList[0]).toHaveTextContent('SNBC')
        expect(programList[1]).toHaveTextContent('PMAP')
    })

    it('renders multiple rate certifications with rate type', async () => {
        const draftContract = mockContractPackageDraft()
        draftContract.draftRates = makeMockRateInfos()

        renderWithProviders(
            <RateDetailsSummarySection
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

    it('renders multiple rate certifications with documents', async () => {
        const draftSubmission = mockContractPackageDraft()
        draftSubmission.draftRates = makeMockRateInfos()
        renderWithProviders(
            <RateDetailsSummarySection
                contract={draftSubmission}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        await waitFor(() => {
            const rateDocsTables = screen.getAllByRole('table', {
                name: /Rate certification/,
            })
            expect(rateDocsTables).toHaveLength(2)
            expect(
                within(rateDocsTables[0]).getByRole('row', {
                    name: /rate docs test 1/,
                })
            ).toBeInTheDocument()
            expect(
                within(rateDocsTables[1]).getByRole('row', {
                    name: /rate docs test 2/,
                })
            ).toBeInTheDocument()
        })
    })

    it('renders multiple rate certifications with certifying actuaries and actuary communication preference', async () => {
        const draftContract = mockContractPackageDraft()
        draftContract.draftRates = makeMockRateInfos()
        renderWithProviders(
            <RateDetailsSummarySection
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
            expect(certifyingActuary).toHaveLength(3)
            expect(
                within(certifyingActuary[0]).queryByRole('link', {
                    name: 'jj.actuary@test.com',
                })
            ).toBeInTheDocument()
            expect(
                within(certifyingActuary[1]).queryByRole('link', {
                    name: 'additionalactuarycontact1@test.com',
                })
            ).toBeInTheDocument()
            expect(
                within(certifyingActuary[2]).queryByRole('link', {
                    name: 'tt.actuary@test.com',
                })
            ).toBeInTheDocument()
            const actuaryCommPreference = screen.getAllByRole('definition', {
                name: 'Actuaries’ communication preference',
            })
            expect(actuaryCommPreference).toHaveLength(2)
            expect(actuaryCommPreference[0]).toHaveTextContent(
                ActuaryCommunicationRecord['OACT_TO_ACTUARY']
            )
            expect(actuaryCommPreference[1]).toHaveTextContent(
                ActuaryCommunicationRecord['OACT_TO_STATE']
            )
        })
    })

    it('renders submitted package without errors', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                contract={submittedContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )

        expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
        // We should never display missing field text on submission summary for submitted packages
        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
    })

    it('renders shared rate certifications when submission is locked', async () => {
        const submittedContract = mockContractPackageSubmitted()

        submittedContract.packageSubmissions[0].rateRevisions[0].formData.packagesWithSharedRateCerts =
            [
                {
                    packageId: '333b4225-5b49-4e82-aa71-be0d33d7418d',
                    packageName: 'MCR-MN-0001-SNBC',
                },
                {
                    packageId: '21467dba-6ae8-11ed-a1eb-0242ac120002',
                    packageName: 'MCR-MN-0002-PMAP',
                },
            ]

        renderWithProviders(
            <RateDetailsSummarySection
                contract={submittedContract}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        await waitFor(() => {
            const rateDocsTable = screen.getByRole('table', {
                name: /Rate certification/,
            })
            // has shared tag
            expect(within(rateDocsTable).getByTestId('tag').textContent).toBe(
                'SHARED'
            )
            // table has 'linked submissions' column
            expect(
                within(rateDocsTable).getByText('Linked submissions')
            ).toBeInTheDocument()
            // table includes the correct submissions
            expect(
                within(rateDocsTable).getByText('MCR-MN-0001-SNBC')
            ).toBeInTheDocument()
            expect(
                within(rateDocsTable).getByText('MCR-MN-0002-PMAP')
            ).toBeInTheDocument()
            // the document names link to the correct submissions
            expect(
                within(rateDocsTable).getByRole('link', {
                    name: 'MCR-MN-0001-SNBC',
                })
            ).toHaveAttribute(
                'href',
                '/submissions/333b4225-5b49-4e82-aa71-be0d33d7418d'
            )
            expect(
                within(rateDocsTable).getByRole('link', {
                    name: 'MCR-MN-0002-PMAP',
                })
            ).toHaveAttribute(
                'href',
                '/submissions/21467dba-6ae8-11ed-a1eb-0242ac120002'
            )
        })
    })

    it('does not render shared rate cert info if none are present', async () => {
        renderWithProviders(
            <RateDetailsSummarySection
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
            const rateDocsTable = screen.getByRole('table', {
                name: /Rate certification/,
            })
            expect(
                within(rateDocsTable).queryByTestId('tag')
            ).not.toBeInTheDocument()
            expect(
                within(rateDocsTable).queryByText('Linked submissions')
            ).not.toBeInTheDocument()
        })
    })

    it('does not render shared rate cert info if submission is being unlocked and being edited', async () => {
        const draftContract = mockContractPackageDraft()
        if (
            draftContract.draftRevision &&
            draftContract.draftRates &&
            draftContract.draftRates[0].draftRevision
        ) {
            draftContract.draftRates[0].draftRevision.formData.packagesWithSharedRateCerts =
                [
                    {
                        packageId: '333b4225-5b49-4e82-aa71-be0d33d7418d',
                        packageName: 'MCR-MN-0001-SNBC',
                    },
                    {
                        packageId: '21467dba-6ae8-11ed-a1eb-0242ac120002',
                        packageName: 'MCR-MN-0002-PMAP',
                    },
                ]
        }

        renderWithProviders(
            <RateDetailsSummarySection
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
            const rateDocsTable = screen.getByRole('table', {
                name: /Rate certification/,
            })
            expect(
                within(rateDocsTable).queryByTestId('tag')
            ).not.toBeInTheDocument()
            expect(
                within(rateDocsTable).queryByText('Linked submissions')
            ).not.toBeInTheDocument()
        })
    })

    it('renders inline error when bulk URL is unavailable', async () => {
        const s3Provider = {
            ...testS3Client(),
            getBulkDlURL: async (
                _keys: string[],
                _fileName: string
            ): Promise<string | Error> => {
                return new Error('Error: getBulkDlURL encountered an error')
            },
        }
        renderWithProviders(
            <RateDetailsSummarySection
                contract={submittedContract}
                submissionName="MN-MSHO-0003"
                statePrograms={statePrograms}
            />,
            {
                s3Provider,
                apolloProvider,
            }
        )

        await waitFor(() => {
            expect(
                screen.getByText('Rate document download is unavailable')
            ).toBeInTheDocument()
        })
    })
})
