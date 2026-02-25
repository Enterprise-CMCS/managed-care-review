import { describe, it, expect } from 'vitest'
import {
    mockContractPackageDraft,
    mockContractPackageSubmitted,
    mockContractPackageApproved,
    mockContractPackageUnlockedWithUnlockedType,
    mockContractWithLinkedRateDraft,
} from '@mc-review/mocks'
import { draftRateDataMock, rateDataMock } from '@mc-review/mocks'

/**
 * This test validates that our mocks have all required fields from GraphQL fragments.
 * It checks for fields that Apollo MockedProvider would reject.
 *
 * Required fields are based on:
 * - contractFieldsFragment.graphql
 * - contractRevisionFragment.graphql
 * - rateFieldsFragment.graphql
 * - rateRevisionFragment.graphql
 * - genericDocumentFragment.graphql
 */

describe('Mock Data Validation', () => {
    describe('Contract mocks have all required fields', () => {
        const requiredContractFields = [
            '__typename',
            'id',
            'status',
            'reviewStatus',
            'consolidatedStatus',
            'createdAt',
            'updatedAt',
            'webURL',
            'initiallySubmittedAt',
            'lastUpdatedForDisplay',
            'dateContractDocsExecuted',
            'stateCode',
            'contractSubmissionType',
            'mccrsID',
            'reviewStatusActions',
            'state',
            'stateNumber',
        ]

        it('mockContractPackageDraft has all required Contract fields', () => {
            const mock = mockContractPackageDraft()

            requiredContractFields.forEach((field) => {
                expect(mock).toHaveProperty(field)
            })

            // reviewStatusActions must be an array
            expect(Array.isArray(mock.reviewStatusActions)).toBe(true)
        })

        it('mockContractPackageSubmitted has all required Contract fields', () => {
            const mock = mockContractPackageSubmitted()

            requiredContractFields.forEach((field) => {
                expect(mock).toHaveProperty(field)
            })

            expect(Array.isArray(mock.reviewStatusActions)).toBe(true)
        })

        it('mockContractPackageUnlockedWithUnlockedType has all required Contract fields', () => {
            const mock = mockContractPackageUnlockedWithUnlockedType()

            requiredContractFields.forEach((field) => {
                expect(mock).toHaveProperty(field)
            })

            expect(Array.isArray(mock.reviewStatusActions)).toBe(true)
        })
    })

    describe('ContractRevision mocks have all required fields', () => {
        const requiredRevisionFields = [
            '__typename',
            'id',
            'createdAt',
            'updatedAt',
            'contractID',
            'contractName',
            'submitInfo',
            'unlockInfo',
            'formData',
            'documentZipPackages',
        ]

        const requiredContractFormDataFields = [
            '__typename',
            'programIDs',
            'populationCovered',
            'submissionType',
            'riskBasedContract',
            'dsnpContract',
            'submissionDescription',
            'stateContacts',
            'supportingDocuments',
            'contractType',
            'contractExecutionStatus',
            'contractDocuments',
            'contractDateStart',
            'contractDateEnd',
            'managedCareEntities',
            'federalAuthorities',
            // EQRO fields
            'eqroNewContractor',
            'eqroProvisionMcoNewOptionalActivity',
            'eqroProvisionNewMcoEqrRelatedActivities',
            'eqroProvisionChipEqrRelatedActivities',
            'eqroProvisionMcoEqrOrRelatedActivities',
        ]

        it('draftRevision has all required fields', () => {
            const mock = mockContractPackageDraft()
            const revision = mock.draftRevision

            if (revision) {
                requiredRevisionFields.forEach((field) => {
                    expect(revision).toHaveProperty(field)
                })

                requiredContractFormDataFields.forEach((field) => {
                    expect(revision.formData).toHaveProperty(field)
                })

                expect(Array.isArray(revision.documentZipPackages)).toBe(true)
            }
        })
    })

    describe('Rate mocks have all required fields', () => {
        const requiredRateFields = [
            '__typename',
            'id',
            'webURL',
            'createdAt',
            'updatedAt',
            'stateCode',
            'stateNumber',
            'parentContractID',
            'state',
            'status',
            'initiallySubmittedAt',
            'reviewStatus',
            'consolidatedStatus',
            'reviewStatusActions',
        ]

        it('draftRateDataMock has all required Rate fields', () => {
            const mock = draftRateDataMock()

            requiredRateFields.forEach((field) => {
                expect(mock).toHaveProperty(field)
            })

            expect(Array.isArray(mock.reviewStatusActions)).toBe(true)
        })

        it('rateDataMock has all required Rate fields', () => {
            const mock = rateDataMock()

            requiredRateFields.forEach((field) => {
                expect(mock).toHaveProperty(field)
            })

            expect(Array.isArray(mock.reviewStatusActions)).toBe(true)
        })
    })

    describe('RateRevision mocks have all required fields', () => {
        const requiredRateRevisionFields = [
            '__typename',
            'id',
            'rateID',
            'createdAt',
            'updatedAt',
            'unlockInfo',
            'submitInfo',
            'formData',
            'documentZipPackages',
        ]

        const requiredRateFormDataFields = [
            '__typename',
            'rateType',
            'rateCapitationType',
            'rateDocuments',
            'supportingDocuments',
            'rateDateStart',
            'rateDateEnd',
            'rateDateCertified',
            'amendmentEffectiveDateStart',
            'amendmentEffectiveDateEnd',
            'rateProgramIDs',
            'rateMedicaidPopulations',
            'deprecatedRateProgramIDs',
            'consolidatedRateProgramIDs',
            'rateCertificationName',
            'certifyingActuaryContacts',
            'addtlActuaryContacts',
            'actuaryCommunicationPreference',
            'packagesWithSharedRateCerts',
        ]

        it('draftRevision has all required RateRevision fields', () => {
            const mock = mockContractWithLinkedRateDraft()
            const rate = mock.draftRates?.[0]
            const revision = rate?.draftRevision

            if (revision) {
                requiredRateRevisionFields.forEach((field) => {
                    expect(revision).toHaveProperty(field)
                })

                requiredRateFormDataFields.forEach((field) => {
                    expect(revision.formData).toHaveProperty(field)
                })

                expect(Array.isArray(revision.documentZipPackages)).toBe(true)
            }
        })
    })

    describe('ActuaryContact objects have all required fields', () => {
        const requiredActuaryFields = [
            '__typename',
            'id',
            'name',
            'titleRole',
            'email',
            'actuarialFirm',
            'actuarialFirmOther',
        ]

        it('certifyingActuaryContacts have all required fields', () => {
            const mock = mockContractWithLinkedRateDraft()
            const rate = mock.draftRates?.[0]
            const contacts =
                rate?.draftRevision?.formData?.certifyingActuaryContacts

            if (contacts && contacts.length > 0) {
                contacts.forEach((contact) => {
                    requiredActuaryFields.forEach((field) => {
                        expect(contact).toHaveProperty(field)
                    })
                })
            }
        })

        it('addtlActuaryContacts have all required fields', () => {
            const mock = mockContractWithLinkedRateDraft()
            const rate = mock.draftRates?.[0]
            const contacts = rate?.draftRevision?.formData?.addtlActuaryContacts

            if (contacts && contacts.length > 0) {
                contacts.forEach((contact) => {
                    requiredActuaryFields.forEach((field) => {
                        expect(contact).toHaveProperty(field)
                    })
                })
            }
        })
    })

    describe('GenericDocument objects have all required fields', () => {
        const requiredDocumentFields = [
            '__typename',
            'id',
            'name',
            's3URL',
            'sha256',
            'dateAdded',
            'downloadURL',
        ]

        it('contract documents have all required fields', () => {
            const mock = mockContractPackageDraft()
            const docs = mock.draftRevision?.formData?.contractDocuments

            if (docs && docs.length > 0) {
                docs.forEach((doc) => {
                    requiredDocumentFields.forEach((field) => {
                        expect(doc).toHaveProperty(field)
                    })
                })
            }
        })

        it('rate documents have all required fields', () => {
            const mock = mockContractWithLinkedRateDraft()
            const docs =
                mock.draftRates?.[0]?.draftRevision?.formData?.rateDocuments

            if (docs && docs.length > 0) {
                docs.forEach((doc) => {
                    requiredDocumentFields.forEach((field) => {
                        expect(doc).toHaveProperty(field)
                    })
                })
            }
        })
    })

    describe('ReviewStatusAction objects have all required fields', () => {
        const requiredReviewActionFields = [
            '__typename',
            'updatedAt',
            'updatedBy',
            'dateApprovalReleasedToState',
            'updatedReason',
            'contractID',
            'actionType',
        ]

        it('reviewStatusActions have all required fields when present', () => {
            const mock = mockContractPackageApproved()
            const actions = mock.reviewStatusActions

            if (actions && actions.length > 0) {
                actions.forEach((action) => {
                    requiredReviewActionFields.forEach((field) => {
                        expect(action).toHaveProperty(field)
                    })
                })
            }
        })
    })

    describe('PackageWithSameRate objects have all required fields', () => {
        it('packagesWithSharedRateCerts have all required fields', () => {
            const mock = mockContractWithLinkedRateDraft()
            const packages =
                mock.draftRates?.[0]?.draftRevision?.formData
                    ?.packagesWithSharedRateCerts

            if (packages && packages.length > 0) {
                packages.forEach((pkg) => {
                    expect(pkg).toHaveProperty('__typename')
                    expect(pkg).toHaveProperty('packageName')
                    expect(pkg).toHaveProperty('packageId')
                    expect(pkg).toHaveProperty('packageStatus')
                })
            }
        })
    })
})
