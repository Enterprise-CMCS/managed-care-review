import { v4 as uuidv4 } from 'uuid'
import { findStatePrograms, NewPostgresStore } from '../../postgres'
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
    createAndUpdateTestHealthPlanPackage,
    createTestHealthPlanPackage,
    submitTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import { must } from '../../testHelpers'
import { fetchTestContract } from '../../testHelpers/gqlContractHelpers'
import {
    updateTestDraftRateOnContract,
    updateTestDraftRatesOnContract,
} from '../../testHelpers/gqlRateHelpers'
import type { RateFormDataInput } from '../../gen/gqlServer'

describe(`Tests UpdateHealthPlanFormData`, () => {
    const cmsUser = testCMSUser()

    beforeEach(() => {
        jest.resetAllMocks()
    })

    it('updates valid scalar fields in the formData', async () => {
        const server = await constructTestPostgresServer()

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
            context: {
                user: stateUser,
            },
        })

        const stateCode = 'MN'
        const createdDraft = await createTestHealthPlanPackage(
            server,
            stateCode
        )
        const statePrograms = must(findStatePrograms(createdDraft.stateCode))

        // Create 2 valid contracts with custom rates to link
        const createdDraftTwo = await createAndUpdateTestHealthPlanPackage(
            server,
            {},
            stateCode
        )
        const createdDraftContractTwo = await fetchTestContract(
            server,
            createdDraftTwo.id
        )
        if (!createdDraftContractTwo.draftRates) {
            throw new Error('should be created with a draft rate')
        }
        const rateTwoID = createdDraftContractTwo.draftRates[0].id

        const rateTwo: RateFormDataInput = {
            rateType: 'NEW' as const,
            rateDateStart: '2025-05-01',
            rateDateEnd: '2026-04-21',
            rateDateCertified: '2025-03-11',
            rateDocuments: [
                {
                    name: 'rateDocument.pdf',
                    s3URL: 's3://bucketname/key/supporting-documents',
                    sha256: 'rate1-sha',
                },
            ],
            rateCapitationType: undefined,
            rateCertificationName: undefined,
            supportingDocuments: [],
            //We only want one rate ID and use last program in list to differentiate from programID if possible.
            deprecatedRateProgramIDs: [],
            rateProgramIDs: [statePrograms.reverse()[0].id],
            certifyingActuaryContacts: [
                {
                    name: 'test name',
                    titleRole: 'test title',
                    email: 'email@example.com',
                    actuarialFirm: 'MERCER' as const,
                    actuarialFirmOther: '',
                },
            ],
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
        }

        await updateTestDraftRateOnContract(
            server,
            createdDraftContractTwo.id,
            rateTwoID,
            rateTwo
        )

        await submitTestHealthPlanPackage(server, createdDraftContractTwo.id)

        const createdDraftThree = await createAndUpdateTestHealthPlanPackage(
            server,
            {},
            stateCode
        )
        const createdDraftContractThree = await fetchTestContract(
            server,
            createdDraftThree.id
        )
        if (!createdDraftContractThree.draftRates) {
            throw new Error('should be created with a draft rate')
        }
        const rateThreeID = createdDraftContractThree.draftRates?.[0].id

        const rateThree: RateFormDataInput = {
            rateType: 'NEW' as const,
            rateDateStart: '2025-05-02',
            rateDateEnd: '2026-04-22',
            rateDateCertified: '2025-03-12',
            rateDocuments: [
                {
                    name: 'rateDocument.pdf',
                    s3URL: 's3://bucketname/key/supporting-documents',
                    sha256: 'rate2-sha',
                },
            ],
            supportingDocuments: [],
            //We only want one rate ID and use last program in list to differentiate from programID if possible.
            deprecatedRateProgramIDs: [],
            rateProgramIDs: [statePrograms.reverse()[0].id],
            certifyingActuaryContacts: [
                {
                    name: 'test name',
                    titleRole: 'test title',
                    email: 'email@example.com',
                    actuarialFirm: 'MERCER' as const,
                    actuarialFirmOther: '',
                },
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        }

        await updateTestDraftRateOnContract(
            server,
            createdDraftThree.id,
            rateThreeID,
            rateThree
        )
        await submitTestHealthPlanPackage(server, createdDraftThree.id)

        // now link those rates to our contract.
        const createdDraftContract = await fetchTestContract(
            server,
            createdDraft.id
        )

        await updateTestDraftRatesOnContract(server, {
            contractID: createdDraftContract.id,
            updatedRates: [
                {
                    type: 'LINK',
                    rateID: rateTwoID,
                },
                {
                    type: 'LINK',
                    rateID: rateThreeID,
                },
            ],
        })

        const updatedContract = await fetchTestContract(server, createdDraft.id)
        if (!updatedContract.draftRates) {
            throw new Error('no draft rates on this draft')
        }

        // Expect our rates to be in the contract from our database
        const draftFormDatas = updatedContract.draftRates.map(
            (r) => r.revisions[0].formData
        )

        expect(draftFormDatas).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    ...rateTwo,
                    rateCertificationName: expect.any(String),
                    addtlActuaryContacts: expect.any(Array),
                    certifyingActuaryContacts: expect.any(Array),
                    rateDocuments: expect.any(Array),
                    rateCapitationType: null,
                    amendmentEffectiveDateStart: null,
                    amendmentEffectiveDateEnd: null,
                }),
                expect.objectContaining({
                    ...rateThree,
                    rateCertificationName: expect.any(String),
                    addtlActuaryContacts: expect.any(Array),
                    certifyingActuaryContacts: expect.any(Array),
                    rateDocuments: expect.any(Array),
                    rateCapitationType: null,
                    amendmentEffectiveDateStart: null,
                    amendmentEffectiveDateEnd: null,
                }),
            ])
        )

        const newRate: RateFormDataInput = {
            rateType: 'AMENDMENT' as const,
            rateDateStart: '2025-05-03',
            rateDateEnd: '2026-04-23',
            rateDateCertified: '2025-03-13',
            rateDocuments: [],
            rateCapitationType: undefined,
            rateCertificationName: undefined,
            supportingDocuments: [],
            //We only want one rate ID and use last program in list to differentiate from programID if possible.
            deprecatedRateProgramIDs: [],
            rateProgramIDs: [statePrograms.reverse()[0].id],
            certifyingActuaryContacts: [],
        }

        await updateTestDraftRatesOnContract(server, {
            contractID: createdDraftContract.id,
            updatedRates: [
                {
                    type: 'LINK',
                    rateID: rateTwoID,
                },
                {
                    type: 'CREATE',
                    formData: newRate,
                },
            ],
        })

        const updatedDraftContract = await fetchTestContract(
            server,
            createdDraft.id
        )

        // Expect our rates to be updated
        const updatedDraftRateFormDatas = [
            updatedDraftContract.draftRates?.[0].revisions[0].formData,
            updatedDraftContract.draftRates?.[1].draftRevision?.formData,
        ]

        expect(updatedDraftRateFormDatas).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    ...rateTwo,
                    rateCertificationName: expect.any(String),
                    addtlActuaryContacts: expect.any(Array),
                    certifyingActuaryContacts: expect.any(Array),
                    rateDocuments: expect.any(Array),
                    rateCapitationType: null,
                    amendmentEffectiveDateStart: null,
                    amendmentEffectiveDateEnd: null,
                }),
                expect.objectContaining({
                    ...newRate,
                    rateCertificationName: expect.any(String),
                    addtlActuaryContacts: expect.any(Array),
                    certifyingActuaryContacts: expect.any(Array),
                    rateDocuments: expect.any(Array),
                    rateCapitationType: null,
                    amendmentEffectiveDateStart: null,
                    amendmentEffectiveDateEnd: null,
                }),
            ])
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
            context: {
                user: stateUser,
            },
        })

        const stateCode = 'MN'
        const createdDraft = await createTestHealthPlanPackage(
            server,
            stateCode
        )
        const statePrograms = must(findStatePrograms(createdDraft.stateCode))

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
        const server = await constructTestPostgresServer()

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
        const server = await constructTestPostgresServer()

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
        const server = await constructTestPostgresServer()
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
        const server = await constructTestPostgresServer()

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

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(updateResult.errors[0].message).toContain(
            'Failed to parse out form data in request'
        )
    })

    it('errors if the payload is submitted', async () => {
        const server = await constructTestPostgresServer()

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

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(updateResult.errors[0].message).toContain(
            'Attempted to update with a StateSubmission'
        )
    })

    it('errors if the Package is already submitted', async () => {
        const server = await constructTestPostgresServer()
        const createdDraft = await createTestHealthPlanPackage(server)
        const submitPackage = async () => {
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
                    submittedReason: 'Submission',
                })
            )
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

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(updateResult.errors[0].message).toContain(
            'Package is not in editable state:'
        )
        expect(updateResult.errors[0].message).toContain('status: SUBMITTED')
    })

    it('errors if the id doesnt match the db', async () => {
        const server = await constructTestPostgresServer()
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

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')

        const expectedErrorMsg =
            'Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.'

        expect(updateResult.errors[0].message).toBe(expectedErrorMsg)
    })

    it('errors if the other payload values dont match the db', async () => {
        const server = await constructTestPostgresServer()
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

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')

        const expectedErrorMsg =
            'Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.'

        expect(updateResult.errors[0].message).toBe(expectedErrorMsg)
    })

    it('errors if the update call to the db fails', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const failStore = mockStoreThatErrors()

        // set store error for flag on.
        postgresStore.updateDraftContractWithRates =
            failStore.updateDraftContractWithRates

        const server = await constructTestPostgresServer({
            store: postgresStore,
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
        expect(updateResult.errors[0].message).toContain('UNEXPECTED_EXCEPTION')
        expect(updateResult.errors[0].message).toContain(
            'Error updating form data'
        )
    })
})
