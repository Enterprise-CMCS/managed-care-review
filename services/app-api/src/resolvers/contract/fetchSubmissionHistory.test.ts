import {
    FetchSubmissionHistoryDocument,
    UpdateDraftContractRatesDocument,
    type FetchSubmissionHistoryQuery,
} from '../../gen/gqlClient'
import type { ApolloServer } from '@apollo/server'
import type { Contract } from '../../gen/gqlServer'
import {
    constructTestPostgresServer,
    createTestQuestion,
    createTestQuestionResponse,
    createTestRateQuestion,
    createTestRateQuestionResponse,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    approveTestContract,
    createAndUpdateTestContractWithRate,
    fetchTestContract,
    overrideTestContractData,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import {
    addLinkedRateToTestContract,
    addNewRateToRateInput,
    formatRateDataForSending,
    overrideTestRateData,
    updateRatesInputFromDraftContract,
    updateTestDraftRatesOnContract,
    withdrawTestRate,
} from '../../testHelpers/gqlRateHelpers'
import {
    createDBUsersWithFullData,
    testAdminUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { testS3Client } from '../../testHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

// Helper function to delink specific rate from a contract.
async function unlinkRateFromDraftContract(
    stateServer: ApolloServer,
    contract: Contract,
    rateID: string
): Promise<Contract> {
    const unlockedContract = await fetchTestContract(stateServer, contract.id)
    const unlinkResult = await executeGraphQLOperation(stateServer, {
        query: UpdateDraftContractRatesDocument,
        variables: {
            input: {
                contractID: unlockedContract.id,
                lastSeenUpdatedAt: unlockedContract.draftRevision?.updatedAt,
                updatedRates: unlockedContract.draftRates
                    ?.filter((rate) => rate.id !== rateID)
                    .map((rate) => {
                        if (rate.draftRevision) {
                            return {
                                type: 'UPDATE' as const,
                                rateID: rate.id,
                                formData: formatRateDataForSending(
                                    rate.draftRevision.formData
                                ),
                            }
                        }

                        return {
                            type: 'LINK' as const,
                            rateID: rate.id,
                        }
                    }),
            },
        },
    })

    if (unlinkResult.errors) {
        throw new Error(
            `unlinkRateFromDraftContract failed with errors ${JSON.stringify(unlinkResult.errors)}`
        )
    }

    const updatedContract = unlinkResult.data?.updateDraftContractRates.contract
    if (!updatedContract) {
        throw new Error(
            'Expected updateDraftContractRates to return a contract'
        )
    }

    return updatedContract
}

async function expectNewestHistoryEntryToMatchLastActionDate(
    server: ApolloServer,
    contractID: string,
    expectedNewestEntry?: {
        actionType?: string
        updatedReason?: string
    }
) {
    const result = await executeGraphQLOperation<FetchSubmissionHistoryQuery>(
        server,
        {
            query: FetchSubmissionHistoryDocument,
            variables: {
                input: {
                    contractID,
                },
            },
        }
    )

    expect(result.errors).toBeUndefined()

    const history = result.data?.fetchSubmissionHistory.history
    expect(history).toBeDefined()
    if (!history) {
        throw new Error('Expected fetchSubmissionHistory to return history')
    }

    const prismaClient = await sharedTestPrismaClient()
    const contractTableRow = await prismaClient.contractTable.findUnique({
        where: { id: contractID },
        select: { lastActionDate: true },
    })

    expect(contractTableRow?.lastActionDate).toBeDefined()
    expect(new Date(history[0].updatedAt).getTime()).toBe(
        contractTableRow?.lastActionDate?.getTime()
    )

    if (expectedNewestEntry?.actionType) {
        expect(history[0].actionType).toBe(expectedNewestEntry.actionType)
    }

    if (expectedNewestEntry?.updatedReason) {
        expect(history[0].updatedReason).toBe(expectedNewestEntry.updatedReason)
    }

    return {
        history,
        lastActionDate: contractTableRow?.lastActionDate,
    }
}

describe('fetchSubmissionHistory', () => {
    const cmsUser = testCMSUser()
    const mockS3 = testS3Client()

    beforeAll(async () => {
        await createDBUsersWithFullData([cmsUser])
    })

    it('returns complete contract history and filters rate history to attached windows', async () => {
        const ldService = testLDService({
            'use-stored-contract-action-dates': true,
        })
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
            s3Client: mockS3,
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
            },
            ldService,
            s3Client: mockS3,
        })

        const parentDraft =
            await createAndUpdateTestContractWithRate(stateServer)
        const submittedParent = await submitTestContract(
            stateServer,
            parentDraft.id
        )
        const linkedRateID =
            submittedParent.packageSubmissions[0].rateRevisions[0].rateID

        // These rate actions happen before the target contract ever links to the
        // rate. The full resolver fetches the rate history, but the attachment
        // window filter should keep these out of the target contract history.
        const preLinkRateQuestion = await createTestRateQuestion(
            cmsServer,
            linkedRateID
        )
        await createTestRateQuestionResponse(
            stateServer,
            preLinkRateQuestion.id
        )
        await overrideTestRateData(adminServer, {
            rateID: linkedRateID,
            description: 'Pre-link rate override excluded from target history',
            overrides: {
                initiallySubmittedAt: '2020-01-01T00:00:00.000Z',
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })

        const targetDraft =
            await createAndUpdateTestContractWithRate(stateServer)
        const targetWithLinkedRate = await addLinkedRateToTestContract(
            stateServer,
            targetDraft,
            linkedRateID
        )
        const submittedTarget = await submitTestContract(
            stateServer,
            targetWithLinkedRate.id,
            'Submit target with first linked window'
        )
        const targetChildRateID =
            submittedTarget.packageSubmissions[0].rateRevisions.find(
                (rateRevision) => rateRevision.rateID !== linkedRateID
            )?.rateID

        if (!targetChildRateID) {
            throw new Error('Expected target contract to have a child rate')
        }

        // First attached window: these rate actions should appear in the target
        // history because the target contract's submitted package includes the
        // linked rate when they happen.
        const firstWindowRateQuestion = await createTestRateQuestion(
            cmsServer,
            linkedRateID
        )
        const firstWindowRateQuestionWithResponse =
            await createTestRateQuestionResponse(
                stateServer,
                firstWindowRateQuestion.id
            )
        await overrideTestRateData(adminServer, {
            rateID: linkedRateID,
            description: 'First attached window rate override',
            overrides: {
                initiallySubmittedAt: '2020-02-01T00:00:00.000Z',
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })
        // Check the same high-risk case as the focused test: a linked rate
        // override is visible on the contract and should be the latest history
        // entry used for lastActionDate.
        await expectNewestHistoryEntryToMatchLastActionDate(
            stateServer,
            submittedTarget.id,
            {
                actionType: 'OVERRIDE',
                updatedReason: 'First attached window rate override',
            }
        )

        // Close the first window by submitting the target without the linked
        // rate. The contract submit explains the relationship change, so the
        // history should not include a separate RATE_UNLINK action.
        await unlockTestContract(
            cmsServer,
            submittedTarget.id,
            'Unlock target for first delink'
        )
        const targetWithoutLinkedRate = await unlinkRateFromDraftContract(
            stateServer,
            submittedTarget,
            linkedRateID
        )
        const submittedTargetWithoutLinkedRate = await submitTestContract(
            stateServer,
            targetWithoutLinkedRate.id,
            'Target first delink submit'
        )

        // Withdraw the target's child rate in the middle of the history. The
        // withdraw workflow removes the rate from the target's submitted
        // package by auto-unlocking and resubmitting the contract, so this
        // should appear as contract-visible submission/review history.
        const childRateWithdrawReason = 'Withdraw target child rate mid-history'
        await withdrawTestRate(
            cmsServer,
            targetChildRateID,
            childRateWithdrawReason
        )
        const targetAfterChildRateWithdraw = await fetchTestContract(
            stateServer,
            submittedTargetWithoutLinkedRate.id
        )
        const childRateWithdrawPackage =
            targetAfterChildRateWithdraw.packageSubmissions.find(
                (packageSubmission) =>
                    packageSubmission.submitInfo.updatedReason.includes(
                        childRateWithdrawReason
                    )
            )

        if (!childRateWithdrawPackage) {
            throw new Error(
                'Expected child rate withdraw to create a contract package submission'
            )
        }

        const childRateWithdrawUnlockInfo =
            childRateWithdrawPackage.contractRevision.unlockInfo
        if (!childRateWithdrawUnlockInfo) {
            throw new Error(
                'Expected child rate withdraw package to include contract unlock info'
            )
        }
        const childRateWithdrawCheckpoint =
            await expectNewestHistoryEntryToMatchLastActionDate(
                stateServer,
                submittedTargetWithoutLinkedRate.id,
                {
                    actionType: 'UNDER_REVIEW',
                }
            )

        // These rate actions happen while the target is no longer attached to
        // the rate, so they should be excluded from the target history.
        const gapRateQuestion = await createTestRateQuestion(
            cmsServer,
            linkedRateID
        )
        await createTestRateQuestionResponse(stateServer, gapRateQuestion.id)
        await overrideTestRateData(adminServer, {
            rateID: linkedRateID,
            description: 'Gap rate override excluded from target history',
            overrides: {
                initiallySubmittedAt: '2020-03-01T00:00:00.000Z',
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })
        const gapRateOverrideCheckpoint =
            await expectNewestHistoryEntryToMatchLastActionDate(
                stateServer,
                submittedTargetWithoutLinkedRate.id,
                {
                    actionType: 'UNDER_REVIEW',
                }
            )
        expect(gapRateOverrideCheckpoint.lastActionDate?.getTime()).toBe(
            childRateWithdrawCheckpoint.lastActionDate?.getTime()
        )

        // Reopen the window by linking the same rate again and submitting the
        // target contract. This validates the link/delink/relink window logic.
        await unlockTestContract(
            cmsServer,
            submittedTargetWithoutLinkedRate.id,
            'Unlock target for relink'
        )
        const unlockedTargetForRelink = await fetchTestContract(
            stateServer,
            submittedTargetWithoutLinkedRate.id
        )
        const relinkedTarget = await addLinkedRateToTestContract(
            stateServer,
            unlockedTargetForRelink,
            linkedRateID
        )
        const submittedRelinkedTarget = await submitTestContract(
            stateServer,
            relinkedTarget.id,
            'Target relink submit'
        )

        const secondWindowRateQuestion = await createTestRateQuestion(
            cmsServer,
            linkedRateID
        )
        // The rate Q&A rules only allow one open question round at a time.
        // Answer this in-window question before creating the post-delink
        // question later in the test.
        await createTestRateQuestionResponse(
            stateServer,
            secondWindowRateQuestion.id
        )
        await overrideTestRateData(adminServer, {
            rateID: linkedRateID,
            description: 'Second attached window rate override',
            overrides: {
                initiallySubmittedAt: '2020-04-01T00:00:00.000Z',
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })
        await expectNewestHistoryEntryToMatchLastActionDate(
            stateServer,
            submittedRelinkedTarget.id,
            {
                actionType: 'OVERRIDE',
                updatedReason: 'Second attached window rate override',
            }
        )

        // Parent rate resubmission changes linked rate data visible on the target
        // contract without the target submitting. This should be the existing
        // LINKED_RATE_UPDATE contract submission history entry.
        await unlockTestContract(
            cmsServer,
            submittedParent.id,
            'Unlock parent rate owner'
        )
        await submitTestContract(
            stateServer,
            submittedParent.id,
            'Parent resubmit updates linked rate data'
        )
        await expectNewestHistoryEntryToMatchLastActionDate(
            stateServer,
            submittedRelinkedTarget.id,
            {
                actionType: 'LINKED_RATE_UPDATE',
                updatedReason: 'Parent resubmit updates linked rate data',
            }
        )

        // The child rate withdraw removed the target's original child rate. Add
        // a replacement child rate through the normal unlock/update/resubmit
        // workflow so the later linked-rate delink still leaves this
        // contract-and-rates submission with one child rate.
        await unlockTestContract(
            cmsServer,
            submittedRelinkedTarget.id,
            'Unlock target for replacement child rate'
        )
        const unlockedTargetForReplacementChild = await fetchTestContract(
            stateServer,
            submittedRelinkedTarget.id
        )
        const replacementChildRateInput = addNewRateToRateInput(
            updateRatesInputFromDraftContract(
                unlockedTargetForReplacementChild
            ),
            {
                rateDateStart: '2026-01-01',
                rateDateEnd: '2027-01-01',
                rateDateCertified: '2026-01-02',
                amendmentEffectiveDateStart: '2026-02-01',
                amendmentEffectiveDateEnd: '2027-02-01',
            }
        )
        const targetWithReplacementChildRate =
            await updateTestDraftRatesOnContract(
                stateServer,
                replacementChildRateInput
            )
        const submittedTargetWithReplacementChildRate =
            await submitTestContract(
                stateServer,
                targetWithReplacementChildRate.id,
                'Target resubmit with replacement child rate'
            )

        // Close the second window. Rate actions after this point should not be
        // associated with the target contract history.
        await unlockTestContract(
            cmsServer,
            submittedTargetWithReplacementChildRate.id,
            'Unlock target for final delink'
        )
        const finalTargetWithoutLinkedRate = await unlinkRateFromDraftContract(
            stateServer,
            submittedTargetWithReplacementChildRate,
            linkedRateID
        )
        const finalSubmittedTarget = await submitTestContract(
            stateServer,
            finalTargetWithoutLinkedRate.id,
            'Target final delink submit'
        )

        const postDelinkRateQuestion = await createTestRateQuestion(
            cmsServer,
            linkedRateID
        )
        await overrideTestRateData(adminServer, {
            rateID: linkedRateID,
            description:
                'Post-delink rate override excluded from target history',
            overrides: {
                initiallySubmittedAt: '2020-05-01T00:00:00.000Z',
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })

        // Add contract-scoped actions so the resolver output proves it merges
        // contract history, contract Q&A, and filtered rate history together.
        const contractQuestion = await createTestQuestion(
            cmsServer,
            finalSubmittedTarget.id
        )
        const contractQuestionWithResponse = await createTestQuestionResponse(
            stateServer,
            contractQuestion.id
        )
        await overrideTestContractData(adminServer, {
            contractID: finalSubmittedTarget.id,
            description: 'Contract override included in target history',
            overrides: {
                revisionOverride: {
                    contractType: 'AMENDMENT',
                    contractTypeOp: 'OVERRIDE',
                },
            },
        })
        await approveTestContract(
            cmsServer,
            finalSubmittedTarget.id,
            '2025-01-01',
            'Approve target for complete history'
        )

        const result =
            await executeGraphQLOperation<FetchSubmissionHistoryQuery>(
                stateServer,
                {
                    query: FetchSubmissionHistoryDocument,
                    variables: {
                        input: {
                            contractID: finalSubmittedTarget.id,
                        },
                    },
                }
            )

        expect(result.errors).toBeUndefined()

        const history = result.data?.fetchSubmissionHistory.history
        expect(history).toBeDefined()
        if (!history) {
            throw new Error('Expected fetchSubmissionHistory to return history')
        }

        const actionTypes = history.map((entry) => entry.actionType)
        const updatedReasons = history.map((entry) => entry.updatedReason)
        const updatedAtTimes = history.map((entry) =>
            new Date(entry.updatedAt).getTime()
        )
        const prismaClient = await sharedTestPrismaClient()
        const contractTableRow = await prismaClient.contractTable.findUnique({
            where: { id: finalSubmittedTarget.id },
            select: { lastActionDate: true },
        })
        const firstWindowRateResponseCreatedAt =
            firstWindowRateQuestionWithResponse.responses[0].createdAt
        const contractQuestionResponseCreatedAt =
            contractQuestionWithResponse.responses[0].createdAt
        const parentLinkedRateUpdateEntries = history.filter(
            (entry) =>
                entry.actionType === 'LINKED_RATE_UPDATE' &&
                entry.updatedReason ===
                    'Parent resubmit updates linked rate data'
        )
        const overrideEntries = history.filter(
            (entry) => entry.actionType === 'OVERRIDE'
        )
        const includedLinkedRateOverrideEntries = history.filter(
            (entry) =>
                entry.actionType === 'OVERRIDE' &&
                [
                    'First attached window rate override',
                    'Second attached window rate override',
                ].includes(entry.updatedReason ?? '')
        )
        const childRateWithdrawSubmitEntries = history.filter(
            (entry) =>
                entry.actionType === 'CONTRACT_SUBMISSION' &&
                new Date(entry.updatedAt).getTime() ===
                    new Date(
                        childRateWithdrawPackage.submitInfo.updatedAt
                    ).getTime() &&
                entry.updatedReason?.includes(childRateWithdrawReason) === true
        )
        const childRateWithdrawUnlockEntries = history.filter(
            (entry) =>
                entry.actionType === 'UNLOCK' &&
                new Date(entry.updatedAt).getTime() ===
                    new Date(childRateWithdrawUnlockInfo.updatedAt).getTime() &&
                entry.updatedReason?.includes(childRateWithdrawReason) === true
        )

        // The complete history should be newest-first after merging contract
        // actions, contract Q&A, and filtered rate actions.
        expect(updatedAtTimes).toEqual(
            [...updatedAtTimes].sort((a, b) => b - a)
        )
        expect(contractTableRow?.lastActionDate).toBeDefined()
        expect(new Date(history[0].updatedAt).getTime()).toBe(
            contractTableRow?.lastActionDate?.getTime()
        )
        expect(result.data?.fetchSubmissionHistory.contractID).toBe(
            finalSubmittedTarget.id
        )

        expect(actionTypes).toEqual(
            expect.arrayContaining([
                'MARK_AS_APPROVED',
                'OVERRIDE',
                'CONTRACT_QUESTION',
                'CONTRACT_QUESTION_RESPONSE',
                'LINKED_RATE_UPDATE',
                'RATE_QUESTION',
                'RATE_QUESTION_RESPONSE',
                'UNLOCK',
                'UNDER_REVIEW',
                'CONTRACT_SUBMISSION',
            ])
        )
        expect(actionTypes).not.toContain('RATE_LINK')
        expect(actionTypes).not.toContain('RATE_UNLINK')
        expect(actionTypes).not.toContain('RATE_SUBMISSION')
        expect(actionTypes).not.toContain('WITHDRAW')
        expect(parentLinkedRateUpdateEntries).toHaveLength(1)
        expect(overrideEntries).toHaveLength(3)
        expect(includedLinkedRateOverrideEntries).toHaveLength(2)
        expect(
            history.filter((entry) => entry.actionType === 'RATE_QUESTION')
        ).toHaveLength(2)
        // Each attached window has one answered rate question. Both responses
        // should be included because the rate was visible on the target
        // contract when they were created.
        expect(
            history.filter(
                (entry) => entry.actionType === 'RATE_QUESTION_RESPONSE'
            )
        ).toHaveLength(2)
        expect(childRateWithdrawSubmitEntries).toHaveLength(1)
        expect(childRateWithdrawSubmitEntries[0].updatedReason).toContain(
            'CMS has withdrawn rate'
        )
        expect(childRateWithdrawUnlockEntries).toHaveLength(1)
        expect(childRateWithdrawUnlockEntries[0].updatedReason).toContain(
            'CMS withdrawing rate'
        )

        expect(updatedReasons).toEqual(
            expect.arrayContaining([
                'Approve target for complete history',
                'Contract override included in target history',
                'First attached window rate override',
                'Second attached window rate override',
                'Parent resubmit updates linked rate data',
                'Target first delink submit',
                'Target relink submit',
                'Target resubmit with replacement child rate',
                'Target final delink submit',
            ])
        )
        expect(updatedReasons).not.toContain(
            'Pre-link rate override excluded from target history'
        )
        expect(updatedReasons).not.toContain(
            'Gap rate override excluded from target history'
        )
        expect(updatedReasons).not.toContain(
            'Post-delink rate override excluded from target history'
        )
        // The target contract should get the LINKED_RATE_UPDATE submit entry
        // when the parent resubmits the linked rate, but it should not also get
        // raw rate history entries from buildRateSubmissionHistory.
        expect(updatedReasons).not.toContain('Unlock parent rate owner')

        // Rate Q&A entries do not have reason text, so assert inclusion and
        // exclusion by their exact mutation timestamps.
        expect(updatedAtTimes).toContain(
            new Date(firstWindowRateQuestion.createdAt).getTime()
        )
        expect(updatedAtTimes).toContain(
            new Date(firstWindowRateResponseCreatedAt).getTime()
        )
        expect(updatedAtTimes).toContain(
            new Date(secondWindowRateQuestion.createdAt).getTime()
        )
        expect(updatedAtTimes).toContain(
            new Date(contractQuestion.createdAt).getTime()
        )
        expect(updatedAtTimes).toContain(
            new Date(contractQuestionResponseCreatedAt).getTime()
        )
        expect(updatedAtTimes).not.toContain(
            new Date(preLinkRateQuestion.createdAt).getTime()
        )
        expect(updatedAtTimes).not.toContain(
            new Date(gapRateQuestion.createdAt).getTime()
        )
        expect(updatedAtTimes).not.toContain(
            new Date(postDelinkRateQuestion.createdAt).getTime()
        )
    }, 80000)
})
