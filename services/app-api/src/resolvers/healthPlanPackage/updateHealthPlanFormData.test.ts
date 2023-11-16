import { v4 as uuidv4 } from 'uuid'
import { findStatePrograms, NewPostgresStore } from '../../postgres'
import * as add_sha from '../../handlers/add_sha'
import { submitContract } from '../../postgres/contractAndRates/submitContract'
import UPDATE_HEALTH_PLAN_FORM_DATA from '../../../../app-graphql/src/mutations/updateHealthPlanFormData.graphql'
import { domainToBase64 } from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import { packageName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    basicLockedHealthPlanFormData,
    basicHealthPlanFormData,
} from '../../../../app-web/src/common-code/healthPlanFormDataMocks'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import {
    mockStoreThatErrors,
    sharedTestPrismaClient,
} from '../../testHelpers/storeHelpers'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { must } from '../../testHelpers'
import type {
    FeatureFlagLDConstant,
    FlagValue,
} from '../../../../app-web/src/common-code/featureFlags'

const flagValueTestParameters: {
    flagName: FeatureFlagLDConstant
    flagValue: FlagValue
    testName: string
}[] = [
    {
        flagName: 'rates-db-refactor',
        flagValue: false,
        testName: 'updateHealthPlanFormData with all feature flags off',
    },
    {
        flagName: 'rates-db-refactor',
        flagValue: true,
        testName: 'updateHealthPlanFormData with rates-db-refactor on',
    },
]

describe.each(flagValueTestParameters)(
    `Tests $testName`,
    ({ flagName, flagValue }) => {
        const cmsUser = testCMSUser()
        const mockLDService = testLDService({ [flagName]: flagValue })

        beforeEach(() => {
            jest.resetAllMocks()
            jest.spyOn(add_sha, 'calculateSHA256').mockImplementation(() => {
                return Promise.resolve('mockSHA256')
            })
        })

        it('updates valid scalar fields in the formData', async () => {
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            const createdDraft = await createTestHealthPlanPackage(server)

            // update that draft.
            const formData = Object.assign(latestFormData(createdDraft), {
                programIDs: [],
                populationCovered: 'MEDICAID',
                submissionType: 'CONTRACT_ONLY',
                riskBasedContract: true,
                submissionDescription: 'Updated submission',
                stateContacts: [],
                documents: [],
                contractType: 'BASE',
                contractExecutionStatus: 'EXECUTED',
                contractDocuments: [],
                contractDateStart: new Date(Date.UTC(2025, 5, 1)),
                contractDateEnd: new Date(Date.UTC(2026, 5, 1)),
                managedCareEntities: ['MCO'],
                federalAuthorities: [],
                contractAmendmentInfo: {
                    modifiedProvisions: {
                        inLieuServicesAndSettings: true,
                        modifiedBenefitsProvided: true,
                        modifiedGeoAreaServed: true,
                        modifiedMedicaidBeneficiaries: true,
                        modifiedRiskSharingStrategy: true,
                        modifiedIncentiveArrangements: true,
                        modifiedWitholdAgreements: true,
                        modifiedStateDirectedPayments: true,
                        modifiedPassThroughPayments: false,
                        modifiedPaymentsForMentalDiseaseInstitutions: false,
                        modifiedMedicalLossRatioStandards: false,
                        modifiedOtherFinancialPaymentIncentive: false,
                        modifiedEnrollmentProcess: false,
                        modifiedGrevienceAndAppeal: false,
                        modifiedNetworkAdequacyStandards: undefined,
                        modifiedLengthOfContract: undefined,
                        modifiedNonRiskPaymentArrangements: undefined,
                    },
                },
                statutoryRegulatoryAttestation: true,
                statutoryRegulatoryAttestationDescription: undefined,
                rateInfos: [],
            })

            // convert to base64 proto
            const updatedB64 = domainToBase64(formData)

            const updateResult = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: updatedB64,
                    },
                },
            })

            expect(updateResult.errors).toBeUndefined()

            const healthPlanPackage =
                updateResult.data?.updateHealthPlanFormData.pkg

            const updatedFormData = latestFormData(healthPlanPackage)
            expect(updatedFormData).toEqual(
                expect.objectContaining({
                    ...formData,
                    updatedAt: expect.any(Date),
                })
            )
        })

        it('creates, updates, and deletes rates in the contract', async () => {
            const stateUser = {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER' as const,
                stateCode: 'MN',
            }
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
                context: {
                    user: stateUser,
                },
            })

            const stateCode = 'MN'
            const createdDraft = await createTestHealthPlanPackage(
                server,
                stateCode
            )
            const statePrograms = must(
                findStatePrograms(createdDraft.stateCode)
            )

            // Create 2 valid contracts to attached to packagesWithSharedRateCerts
            const createdDraftTwo = await createTestHealthPlanPackage(
                server,
                stateCode
            )
            const createdDraftThree = await createTestHealthPlanPackage(
                server,
                stateCode
            )

            const createdDraftTwoFormData = latestFormData(createdDraftTwo)
            const createdDraftThreeFormData = latestFormData(createdDraftThree)

            const packageWithSharedRate1 = {
                packageId: createdDraftTwo.id,
                packageName: packageName(
                    createdDraftTwo.stateCode,
                    createdDraftTwoFormData.stateNumber,
                    createdDraftTwoFormData.programIDs,
                    statePrograms
                ),
            } as const

            const packageWithSharedRate2 = {
                packageId: createdDraftThree.id,
                packageName: packageName(
                    createdDraftThree.stateCode,
                    createdDraftThreeFormData.stateNumber,
                    createdDraftThreeFormData.programIDs,
                    statePrograms
                ),
            } as const

            // Create 2 rate data for insertion
            const rate1 = {
                id: uuidv4(),
                rateType: 'NEW' as const,
                rateDateStart: new Date(Date.UTC(2025, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2026, 4, 30)),
                rateDateCertified: new Date(Date.UTC(2025, 3, 15)),
                rateDocuments: [
                    {
                        name: 'rateDocument.pdf',
                        s3URL: 's3://bucketname/key/supporting-documents',
                        documentCategories: ['RATES' as const],
                        sha256: 'rate1-sha',
                    },
                ],
                rateAmendmentInfo: undefined,
                rateCapitationType: undefined,
                rateCertificationName: undefined,
                supportingDocuments: [],
                //We only want one rate ID and use last program in list to differentiate from programID if possible.
                rateProgramIDs: [statePrograms.reverse()[0].id],
                actuaryContacts: [
                    {
                        name: 'test name',
                        titleRole: 'test title',
                        email: 'email@example.com',
                        actuarialFirm: 'MERCER' as const,
                        actuarialFirmOther: '',
                    },
                ],
                packagesWithSharedRateCerts: [
                    packageWithSharedRate1,
                    packageWithSharedRate2,
                ],
            }

            const rate2 = {
                id: uuidv4(),
                rateType: 'NEW' as const,
                rateDateStart: new Date(Date.UTC(2025, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2026, 4, 30)),
                rateDateCertified: new Date(Date.UTC(2025, 3, 15)),
                rateDocuments: [
                    {
                        name: 'rateDocument.pdf',
                        s3URL: 's3://bucketname/key/supporting-documents',
                        documentCategories: ['RATES' as const],
                        sha256: 'rate2-sha',
                    },
                ],
                rateAmendmentInfo: undefined,
                rateCapitationType: undefined,
                rateCertificationName: undefined,
                supportingDocuments: [],
                //We only want one rate ID and use last program in list to differentiate from programID if possible.
                rateProgramIDs: [statePrograms.reverse()[0].id],
                actuaryContacts: [
                    {
                        name: 'test name',
                        titleRole: 'test title',
                        email: 'email@example.com',
                        actuarialFirm: 'MERCER' as const,
                        actuarialFirmOther: '',
                    },
                ],
                packagesWithSharedRateCerts: [],
            }

            // update that draft form data.
            const formData = Object.assign(latestFormData(createdDraft), {
                addtlActuaryContacts: [
                    {
                        name: 'additional actuary 1',
                        titleRole: 'additional actuary title 1',
                        email: 'additionalactuary1@example.com',
                        actuarialFirm: 'MERCER' as const,
                        actuarialFirmOther: '',
                    },
                    {
                        name: 'additional actuary 2',
                        titleRole: 'additional actuary title 2',
                        email: 'additionalactuary1@example.com',
                        actuarialFirm: 'MERCER' as const,
                        actuarialFirmOther: '',
                    },
                ],
                rateInfos: [rate1, rate2],
            })

            // convert to base64 proto
            const updatedB64 = domainToBase64(formData)

            // update the DB contract
            const updateResult = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: updatedB64,
                    },
                },
            })

            expect(updateResult.errors).toBeUndefined()

            const updatedHealthPlanPackage =
                updateResult.data?.updateHealthPlanFormData.pkg

            const updatedFormData = latestFormData(updatedHealthPlanPackage)

            // Expect our rates to be in the contract from our database
            expect(updatedFormData).toEqual(
                expect.objectContaining({
                    ...formData,
                    updatedAt: expect.any(Date),
                    rateInfos: expect.arrayContaining([
                        expect.objectContaining({
                            ...rate1,
                            id: expect.any(String),
                            rateCertificationName: expect.any(String),
                            packagesWithSharedRateCerts: expect.arrayContaining(
                                [
                                    expect.objectContaining({
                                        packageId:
                                            packageWithSharedRate1.packageId,
                                        packageName:
                                            packageWithSharedRate1.packageName,
                                    }),
                                    expect.objectContaining({
                                        packageId:
                                            packageWithSharedRate2.packageId,
                                        packageName:
                                            packageWithSharedRate2.packageName,
                                    }),
                                ]
                            ),
                        }),
                        expect.objectContaining({
                            ...rate2,
                            id: expect.any(String),
                            rateCertificationName: expect.any(String),
                        }),
                    ]),
                })
            )

            const rate3 = {
                id: uuidv4(),
                rateType: 'AMENDMENT' as const,
                rateDateStart: new Date(Date.UTC(2025, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2026, 4, 30)),
                rateDateCertified: new Date(Date.UTC(2025, 3, 15)),
                rateDocuments: [],
                rateAmendmentInfo: undefined,
                rateCapitationType: undefined,
                rateCertificationName: undefined,
                supportingDocuments: [],
                //We only want one rate ID and use last program in list to differentiate from programID if possible.
                rateProgramIDs: [statePrograms.reverse()[0].id],
                actuaryContacts: [],
                packagesWithSharedRateCerts: [],
            }

            // Update first rate and remove second from contract and add a new rate.
            const formData2 = Object.assign(
                latestFormData(updatedHealthPlanPackage),
                {
                    rateInfos: [
                        {
                            ...updatedFormData.rateInfos[0],
                            // updating the actuary on the first rate
                            actuaryContacts: [
                                {
                                    name: 'New actuary',
                                    titleRole: 'Better title',
                                    email: 'actuary@example.com',
                                    actuarialFirm: 'OPTUMAS' as const,
                                    actuarialFirmOther: '',
                                },
                            ],
                            // remove second package with shared rate, by only passing in the first
                            packagesWithSharedRateCerts: [],
                        },
                        {
                            ...rate3,
                        },
                    ],
                }
            )

            const secondUpdatedB64 = domainToBase64(formData2)

            // update the DB contract again
            const updateResult2 = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: secondUpdatedB64,
                    },
                },
            })

            expect(updateResult2.errors).toBeUndefined()

            const updatedHealthPlanPackage2 =
                updateResult2.data?.updateHealthPlanFormData.pkg

            const updatedFormData2 = latestFormData(updatedHealthPlanPackage2)

            // Expect our rates to be updated
            expect(updatedFormData2).toEqual(
                expect.objectContaining({
                    ...formData2,
                    updatedAt: expect.any(Date),
                    rateInfos: expect.arrayContaining([
                        expect.objectContaining({
                            ...formData2.rateInfos[0],
                            id: expect.any(String),
                            rateCertificationName: expect.any(String),
                            packagesWithSharedRateCerts: [],
                        }),
                        expect.objectContaining({
                            ...formData2.rateInfos[1],
                            id: expect.any(String),
                            rateCertificationName: expect.any(String),
                        }),
                    ]),
                })
            )
        })

        it('errors on a rate with no ID.', async () => {
            const stateUser = {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER' as const,
                stateCode: 'MN',
            }
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
                context: {
                    user: stateUser,
                },
            })

            const stateCode = 'MN'
            const createdDraft = await createTestHealthPlanPackage(
                server,
                stateCode
            )
            const statePrograms = must(
                findStatePrograms(createdDraft.stateCode)
            )

            // Create 2 valid contracts to attached to packagesWithSharedRateCerts
            const createdDraftTwo = await createTestHealthPlanPackage(
                server,
                stateCode
            )
            const createdDraftThree = await createTestHealthPlanPackage(
                server,
                stateCode
            )

            const createdDraftTwoFormData = latestFormData(createdDraftTwo)
            const createdDraftThreeFormData = latestFormData(createdDraftThree)

            const packageWithSharedRate1 = {
                packageId: createdDraftTwo.id,
                packageName: packageName(
                    createdDraftTwo.stateCode,
                    createdDraftTwoFormData.stateNumber,
                    createdDraftTwoFormData.programIDs,
                    statePrograms
                ),
            } as const

            const packageWithSharedRate2 = {
                packageId: createdDraftThree.id,
                packageName: packageName(
                    createdDraftThree.stateCode,
                    createdDraftThreeFormData.stateNumber,
                    createdDraftThreeFormData.programIDs,
                    statePrograms
                ),
            } as const

            // Create 2 rate data for insertion
            const rate1 = {
                rateType: 'NEW' as const,
                rateDateStart: new Date(Date.UTC(2025, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2026, 4, 30)),
                rateDateCertified: new Date(Date.UTC(2025, 3, 15)),
                rateDocuments: [
                    {
                        name: 'rateDocument.pdf',
                        s3URL: 's3://bucketname/key/supporting-documents',
                        documentCategories: ['RATES' as const],
                        sha256: 'rate1-sha',
                    },
                ],
                rateAmendmentInfo: undefined,
                rateCapitationType: undefined,
                rateCertificationName: undefined,
                supportingDocuments: [],
                //We only want one rate ID and use last program in list to differentiate from programID if possible.
                rateProgramIDs: [statePrograms.reverse()[0].id],
                actuaryContacts: [
                    {
                        name: 'test name',
                        titleRole: 'test title',
                        email: 'email@example.com',
                        actuarialFirm: 'MERCER' as const,
                        actuarialFirmOther: '',
                    },
                ],
                packagesWithSharedRateCerts: [
                    packageWithSharedRate1,
                    packageWithSharedRate2,
                ],
            }

            const rate2 = {
                id: uuidv4(),
                rateType: 'NEW' as const,
                rateDateStart: new Date(Date.UTC(2025, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2026, 4, 30)),
                rateDateCertified: new Date(Date.UTC(2025, 3, 15)),
                rateDocuments: [
                    {
                        name: 'rateDocument.pdf',
                        s3URL: 's3://bucketname/key/supporting-documents',
                        documentCategories: ['RATES' as const],
                        sha256: 'rate2-sha',
                    },
                ],
                rateAmendmentInfo: undefined,
                rateCapitationType: undefined,
                rateCertificationName: undefined,
                supportingDocuments: [],
                //We only want one rate ID and use last program in list to differentiate from programID if possible.
                rateProgramIDs: [statePrograms.reverse()[0].id],
                actuaryContacts: [
                    {
                        name: 'test name',
                        titleRole: 'test title',
                        email: 'email@example.com',
                        actuarialFirm: 'MERCER' as const,
                        actuarialFirmOther: '',
                    },
                ],
                packagesWithSharedRateCerts: [],
            }

            // update that draft form data.
            const formData = Object.assign(latestFormData(createdDraft), {
                addtlActuaryContacts: [
                    {
                        name: 'additional actuary 1',
                        titleRole: 'additional actuary title 1',
                        email: 'additionalactuary1@example.com',
                        actuarialFirm: 'MERCER' as const,
                        actuarialFirmOther: '',
                    },
                    {
                        name: 'additional actuary 2',
                        titleRole: 'additional actuary title 2',
                        email: 'additionalactuary1@example.com',
                        actuarialFirm: 'MERCER' as const,
                        actuarialFirmOther: '',
                    },
                ],
                rateInfos: [rate1, rate2],
            })

            // convert to base64 proto
            const updatedB64 = domainToBase64(formData)

            // update the DB contract
            const updateResult = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: updatedB64,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
        })

        it('updates relational fields such as documents and contacts', async () => {
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            const createdDraft = await createTestHealthPlanPackage(server)

            // update that draft.
            const formData = Object.assign(latestFormData(createdDraft), {
                programIDs: [],
                populationCovered: 'MEDICAID',
                submissionType: 'CONTRACT_ONLY',
                riskBasedContract: true,
                submissionDescription: 'Updated submission',
                stateContacts: [
                    {
                        name: 'statecontact',
                        titleRole: 'thestatestofcontacts',
                        email: 'statemcstate@examepl.com',
                    },
                ],
                documents: [
                    {
                        name: 'supportingDocument11.pdf',
                        s3URL: 'fakeS3URL',
                        documentCategories: ['CONTRACT_RELATED' as const],
                        sha256: 'needs-to-be-there',
                    },
                ],
                adsfdas: 'sdfsdf',
                rateInfos: [],
            })

            // convert to base64 proto
            const updatedB64 = domainToBase64(formData)

            const updateResult = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: updatedB64,
                    },
                },
            })

            expect(updateResult.errors).toBeUndefined()

            const healthPlanPackage =
                updateResult.data?.updateHealthPlanFormData.pkg

            const updatedFormData = latestFormData(healthPlanPackage)
            expect(updatedFormData.documents).toEqual(
                expect.arrayContaining(formData.documents)
            )
            expect(updatedFormData.contractDocuments).toEqual(
                expect.arrayContaining(formData.contractDocuments)
            )

            expect(updatedFormData.stateContacts).toEqual(
                expect.arrayContaining(formData.stateContacts)
            )
        })

        it('errors if a CMS user calls it', async () => {
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            const createdDraft = await createTestHealthPlanPackage(server)

            const formData = latestFormData(createdDraft)

            // update that draft.
            formData.submissionDescription = 'UPDATED BY REVISION'

            // convert to base64 proto
            const updatedB64 = domainToBase64(formData)

            const cmsUserServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
                ldService: mockLDService,
            })

            const updateResult = await cmsUserServer.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: updatedB64,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe('FORBIDDEN')
            expect(updateResult.errors[0].message).toBe(
                'user not authorized to modify state data'
            )
        })

        it('errors if a state user from a different state calls it', async () => {
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const createdDraft = await createTestHealthPlanPackage(server)
            const formData = latestFormData(createdDraft)

            // update that draft.
            formData.submissionDescription = 'UPDATED BY REVISION'

            // convert to base64 proto
            const updatedB64 = domainToBase64(formData)

            // setup a server with a different user
            const otherUserServer = await constructTestPostgresServer({
                context: {
                    user: testStateUser({ stateCode: 'VA' }),
                },
                ldService: mockLDService,
            })

            const updateResult = await otherUserServer.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: updatedB64,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe('FORBIDDEN')
            expect(updateResult.errors[0].message).toBe(
                'user not authorized to fetch data from a different state'
            )
        })

        it('errors if the payload isnt valid', async () => {
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            const createdDraft = await createTestHealthPlanPackage(server)

            const formData = 'not-valid-proto'

            const updateResult = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: formData,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe(
                'BAD_USER_INPUT'
            )
            expect(updateResult.errors[0].message).toContain(
                'Failed to parse out form data in request'
            )
        })

        it('errors if the payload is submitted', async () => {
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })

            const createdDraft = await createTestHealthPlanPackage(server)

            const stateSubmission = basicLockedHealthPlanFormData()

            const formData = domainToBase64(stateSubmission)

            const updateResult = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: formData,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe(
                'BAD_USER_INPUT'
            )
            expect(updateResult.errors[0].message).toContain(
                'Attempted to update with a StateSubmission'
            )
        })

        it('errors if the Package is already submitted', async () => {
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const createdDraft = await createTestHealthPlanPackage(server)
            const submitPackage = async () => {
                // Manually submit package when flag is on.
                // TODO: remove the conditional after submit resolver has been modified.
                if (flagValue) {
                    const client = await sharedTestPrismaClient()
                    const stateUser = await client.user.create({
                        data: {
                            id: uuidv4(),
                            givenName: 'Aang',
                            familyName: 'Avatar',
                            email: 'aang@example.com',
                            role: 'STATE_USER',
                            stateCode: 'NM',
                        },
                    })
                    return must(
                        await submitContract(client, {
                            contractID: createdDraft.id,
                            submittedByUserID: stateUser.id,
                            submitReason: 'Submission',
                        })
                    )
                } else {
                    return await createAndSubmitTestHealthPlanPackage(server)
                }
            }

            const createdSubmitted = await submitPackage()

            const draft = basicHealthPlanFormData()
            const b64 = domainToBase64(draft)

            const updateResult = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdSubmitted.id,
                        healthPlanFormData: b64,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe(
                'BAD_USER_INPUT'
            )
            expect(updateResult.errors[0].message).toContain(
                'Package is not in editable state:'
            )
            expect(updateResult.errors[0].message).toContain(
                'status: SUBMITTED'
            )
        })

        it('errors if the id doesnt match the db', async () => {
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const createdDraft = await createTestHealthPlanPackage(server)

            const formData = latestFormData(createdDraft)

            formData.updatedAt = new Date(Date.UTC(2025, 5, 1))

            const b64 = domainToBase64(formData)

            const updateResult = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: b64,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe(
                'BAD_USER_INPUT'
            )

            const expectedErrorMsg = flagValue
                ? 'Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.'
                : 'Transient server error: attempted to modify un-modifiable field(s): updatedAt.  Please refresh the page to continue.'

            expect(updateResult.errors[0].message).toBe(expectedErrorMsg)
        })

        it('errors if the other payload values dont match the db', async () => {
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const createdDraft = await createTestHealthPlanPackage(server)

            const formData = latestFormData(createdDraft)

            formData.stateCode = 'CA'
            formData.stateNumber = 9999999
            formData.createdAt = new Date(2021)
            formData.updatedAt = new Date(2021)

            const b64 = domainToBase64(formData)

            const updateResult = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: b64,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe(
                'BAD_USER_INPUT'
            )

            const expectedErrorMsg = flagValue
                ? 'Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.'
                : 'Transient server error: attempted to modify un-modifiable field(s): stateCode,stateNumber,createdAt,updatedAt.  Please refresh the page to continue.'

            expect(updateResult.errors[0].message).toBe(expectedErrorMsg)
        })

        it('errors if the update call to the db fails', async () => {
            const prismaClient = await sharedTestPrismaClient()
            const postgresStore = NewPostgresStore(prismaClient)
            const failStore = mockStoreThatErrors()

            // set store error for flag off
            postgresStore.updateHealthPlanRevision =
                failStore.updateHealthPlanRevision

            // set store error for flag on.
            postgresStore.updateDraftContractWithRates =
                failStore.updateDraftContractWithRates

            const server = await constructTestPostgresServer({
                store: postgresStore,
                ldService: mockLDService,
            })

            const createdDraft = await createTestHealthPlanPackage(server)

            const formData = latestFormData(createdDraft)

            // update that draft.
            formData.submissionDescription = 'UPDATED BY REVISION'

            // convert to base64 proto
            const updatedB64 = domainToBase64(formData)

            const updateResult = await server.executeOperation({
                query: UPDATE_HEALTH_PLAN_FORM_DATA,
                variables: {
                    input: {
                        pkgID: createdDraft.id,
                        healthPlanFormData: updatedB64,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe(
                'INTERNAL_SERVER_ERROR'
            )
            expect(updateResult.errors[0].message).toContain(
                'UNEXPECTED_EXCEPTION'
            )
            expect(updateResult.errors[0].message).toContain(
                'Error updating form data'
            )
        })
    }
)
