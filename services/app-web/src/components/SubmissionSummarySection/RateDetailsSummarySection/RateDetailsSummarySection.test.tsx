import { screen, waitFor, within } from '@testing-library/react'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
    mockMNState,
    fetchCurrentUserMock,
    mockValidCMSUser,
    indexHealthPlanPackagesMockSuccess,
} from '../../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import * as usePreviousSubmission from '../../../hooks/usePreviousSubmission'
import { RateDetailsSummarySection } from './RateDetailsSummarySection'
import { RateInfoType } from '../../../common-code/healthPlanFormDataType'
import { testS3Client } from '../../../testHelpers/s3Helpers'

describe('RateDetailsSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()
    const statePrograms = mockMNState().programs
    const mockRateInfos: RateInfoType[] = [
        {
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
            rateAmendmentInfo: {
                effectiveDateStart: new Date('01/01/2021'),
                effectiveDateEnd: new Date('12/31/2021'),
            },
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            actuaryContacts: [
                {
                    actuarialFirm: 'DELOITTE',
                    name: 'Jimmy Jimerson',
                    titleRole: 'Certifying Actuary',
                    email: 'jj.actuary@test.com',
                },
            ],
            packagesWithSharedRateCerts: [],
        },
        {
            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_RANGE',
            rateDocuments: [
                {
                    s3URL: 's3://foo/bar/rate2',
                    name: 'rate docs test 2',
                    sha256: 'fakesha',
                },
            ],
            supportingDocuments: [],
            rateDateStart: new Date('01/01/2022'),
            rateDateEnd: new Date('12/31/2022'),
            rateDateCertified: new Date('12/31/2021'),
            rateAmendmentInfo: {
                effectiveDateStart: new Date('01/01/2022'),
                effectiveDateEnd: new Date('12/31/2022'),
            },
            rateProgramIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
            actuaryContacts: [
                {
                    actuarialFirm: 'DELOITTE',
                    name: 'Timmy Timerson',
                    titleRole: 'Certifying Actuary',
                    email: 'tt.actuary@test.com',
                },
            ],
            packagesWithSharedRateCerts: [],
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

    it('can render draft submission without errors', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
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

    it('can render state submission without errors', async () => {
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={stateSubmission}
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
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
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
        const submission = mockStateSubmission()
        submission.rateInfos[0].rateCertificationName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'

        const statePrograms = mockMNState().programs
        await waitFor(() => {
            renderWithProviders(
                <RateDetailsSummarySection
                    documentDateLookupTable={{
                        previousSubmissionDate: '01/01/01',
                    }}
                    submission={submission}
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
            ...mockContractAndRatesDraft(),
            rateDateStart: new Date('2022-01-25'),
            rateDateEnd: new Date('2023-01-25'),
            rateDateCertified: new Date('2022-01-26'),
            rateAmendmentInfo: {
                effectiveDateStart: new Date('2022-02-25'),
                effectiveDateEnd: new Date('2023-02-26'),
            },
        }

        submission.rateInfos[0].rateCertificationName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'

        const statePrograms = mockMNState().programs

        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={submission}
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

    it('can render all rate details fields for new rate certification submission', async () => {
        const statePrograms = mockMNState().programs
        stateSubmission.rateInfos[0].rateCertificationName =
            'MCR-MN-0005-SNBC-RATE-20221014-20221014-CERTIFICATION-20221014'

        await waitFor(() => {
            renderWithProviders(
                <RateDetailsSummarySection
                    documentDateLookupTable={{
                        previousSubmissionDate: '01/01/01',
                    }}
                    submission={stateSubmission}
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
            screen.getByRole('definition', { name: 'Rating period' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Date certified' })
        ).toBeInTheDocument()
    })

    it('renders supporting rates docs when they exist', async () => {
        const testSubmission = {
            ...draftSubmission,
            rateInfos: [
                {
                    ...draftSubmission.rateInfos[0],
                    rateDocuments: [
                        {
                            s3URL: 's3://foo/bar/rate',
                            name: 'rate docs test 1',
                            sha256: 'fakesha',
                        },
                    ],
                    supportingDocuments: [
                        {
                            s3URL: 's3://foo/bar/test-2',
                            name: 'supporting docs test 2',
                            sha256: 'fakesha',
                        },
                        {
                            s3URL: 's3://foo/bar/test-3',
                            name: 'supporting docs test 3',
                            sha256: 'fakesha',
                        },
                    ],
                },
            ],
            documents: [
                {
                    s3URL: 's3://foo/bar/test-1',
                    name: 'supporting docs test 1',
                    sha256: 'fakesha',
                },
            ],
        }

        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={testSubmission}
                editNavigateTo="/rate-details'"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )

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
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )

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
                    documentDateLookupTable={{
                        previousSubmissionDate: '01/01/01',
                    }}
                    submission={stateSubmission}
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
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
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
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateInfos[0].rateCapitationType = 'RATE_RANGE'
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
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
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateInfos[0].rateProgramIDs = [
            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
            'd95394e5-44d1-45df-8151-1cc1ee66f100',
        ]
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        const programElement = screen.getByRole('definition', {
            name: 'Rates this rate certification covers',
        })
        expect(programElement).toBeInTheDocument()
        const programList = within(programElement).getByText('SNBC, PMAP')
        expect(programList).toBeInTheDocument()
    })

    it('renders rate program names even when rate program ids are missing', async () => {
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateInfos[0].rateProgramIDs = []
        draftSubmission.programIDs = [
            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
            'd95394e5-44d1-45df-8151-1cc1ee66f100',
        ]
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
                editNavigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />,
            {
                apolloProvider,
            }
        )
        const programElement = screen.getByRole('definition', {
            name: 'Rates this rate certification covers',
        })
        expect(programElement).toBeInTheDocument()
        const programList = within(programElement).getByText('SNBC, PMAP')
        expect(programList).toBeInTheDocument()
    })

    it('renders multiple rate certifications with program names', async () => {
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateInfos = mockRateInfos
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
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
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateInfos = mockRateInfos

        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
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
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateInfos = mockRateInfos
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
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

    it('renders multiple rate certifications with certifying actuary', async () => {
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateInfos = mockRateInfos
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
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
    it('renders all necessary information for documents with shared rate certifications on submitted packages', async () => {
        const testSubmission = {
            ...mockStateSubmission(),
            rateInfos: [
                {
                    ...draftSubmission.rateInfos[0],
                    rateDocuments: [
                        {
                            s3URL: 's3://foo/bar/rate',
                            name: 'rate docs test 1',
                            sha256: 'fakesha11',
                        },
                    ],
                },
            ],
            documents: [
                {
                    s3URL: 's3://foo/bar/test-1',
                    name: 'supporting docs test 1',
                    sha256: 'fakesha1',
                },
                {
                    s3URL: 's3://foo/bar/test-2',
                    name: 'supporting docs test 2',
                    sha256: 'fakesha2',
                },
                {
                    s3URL: 's3://foo/bar/test-3',
                    name: 'supporting docs test 3',
                    sha256: 'fakesha3',
                },
            ],
        }
        testSubmission.rateInfos[0].packagesWithSharedRateCerts = [
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
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={testSubmission}
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
    it('does not render shared rate cert info for previous submissons', async () => {
        jest.spyOn(
            usePreviousSubmission,
            'usePreviousSubmission'
        ).mockReturnValue(true)
        const testSubmission = {
            ...draftSubmission,
            rateInfos: [
                {
                    ...draftSubmission.rateInfos[0],
                    rateDocuments: [
                        {
                            s3URL: 's3://foo/bar/rate',
                            name: 'rate docs test 1',
                            sha256: 'fakesha',
                        },
                    ],
                },
            ],
            documents: [
                {
                    s3URL: 's3://foo/bar/test-1',
                    name: 'supporting docs test 1',
                    sha256: 'fakesha',
                },
                {
                    s3URL: 's3://foo/bar/test-2',
                    name: 'supporting docs test 2',
                    sha256: 'fakesha',
                },
                {
                    s3URL: 's3://foo/bar/test-3',
                    name: 'supporting docs test 3',
                    sha256: 'fakesha',
                },
            ],
        }
        testSubmission.rateInfos[0].packagesWithSharedRateCerts = [
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
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={testSubmission}
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
            expect(
                within(rateDocsTable).queryByText('MCR-MN-0001-SNBC')
            ).not.toBeInTheDocument()
            expect(
                within(rateDocsTable).queryByText('MCR-MN-0002-PMAP')
            ).not.toBeInTheDocument()
        })
    })
    it('does not render shared rate cert info if none are present', async () => {
        const testSubmission = {
            ...draftSubmission,
            rateInfos: [
                {
                    ...draftSubmission.rateInfos[0],
                    rateDocuments: [
                        {
                            s3URL: 's3://foo/bar/rate',
                            name: 'rate docs test 1',
                            sha256: 'fakesha',
                        },
                    ],
                },
            ],
            documents: [
                {
                    s3URL: 's3://foo/bar/test-1',
                    name: 'supporting docs test 1',
                    sha256: 'fakesha',
                },
                {
                    s3URL: 's3://foo/bar/test-2',
                    name: 'supporting docs test 2',
                    sha256: 'fakesha',
                },
                {
                    s3URL: 's3://foo/bar/test-3',
                    name: 'supporting docs test 3',
                    sha256: 'fakesha',
                },
            ],
        }
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={testSubmission}
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

    it('renders submitted package without errors', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={draftSubmission}
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
                documentDateLookupTable={{ previousSubmissionDate: '01/01/01' }}
                submission={stateSubmission}
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
