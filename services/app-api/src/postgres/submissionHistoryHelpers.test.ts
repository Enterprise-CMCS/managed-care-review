import { describe, expect, it } from 'vitest'
import {
    constructTestPostgresServer,
    createTestQuestion,
    createTestQuestionResponse,
    createTestRateQuestion,
    createTestRateQuestionResponse,
    deleteTestContractQuestion,
    executeGraphQLOperation,
} from '../testHelpers/gqlHelpers'
import { UpdateDraftContractRatesDocument } from '../gen/gqlClient'
import { testAdminUser, testCMSUser } from '../testHelpers/userHelpers'
import {
    approveTestContract,
    createAndSubmitTestContract,
    createAndSubmitTestContractWithRate,
    createAndUpdateTestEQROContract,
    createAndUpdateTestContractWithRate,
    fetchTestContract,
    overrideTestContractData,
    reverseApproveTestContract,
    submitTestContract,
    unlockTestContract,
    withdrawTestContract,
} from '../testHelpers/gqlContractHelpers'
import {
    addLinkedRateToTestContract,
    addNewRateToTestContract,
    fetchTestRateById,
    formatRateDataForSending,
    overrideTestRateData,
    undoWithdrawTestRate,
    withdrawTestRate,
} from '../testHelpers/gqlRateHelpers'
import { must } from '../testHelpers'
import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
import { findContractWithHistory } from './contractAndRates/findContractWithHistory'
import { findRateWithHistory } from './contractAndRates/findRateWithHistory'
import { findContractQuestionResponseHistory } from './questionResponse/findContractQuestionResponseHistory'
import { findRateQuestionResponseHistory } from './questionResponse/findRateQuestionResponseHistory'
import {
    buildCompleteHistoryLog,
    buildContractSubmissionHistoryLog,
    buildQuestionResponseHistoryLog,
    buildRateSubmissionHistoryLog,
} from './submissionHistoryHelpers'

describe('buildContractSubmissionHistoryLog', () => {
    it('builds a complete action log from a complex contract history', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
            },
        })

        // Create a parent package with a submitted rate that the target
        // contract can link to. This gives us real package-submission rows
        // instead of hand-built domain data.
        const submittedParent =
            await createAndSubmitTestContractWithRate(stateServer)
        const linkedRateID =
            submittedParent.packageSubmissions[0].rateRevisions[0].rateID

        // Submit the target contract with both its own child rate and the linked
        // rate. This should count as a direct CONTRACT_SUBMISSION, not as a
        // LINKED_RATE_UPDATE, because the target contract revision is in
        // submittedRevisions.
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
            'Initial target submit'
        )

        // Unlock and resubmit the target contract. The builder should include
        // both the CMS unlock action and the state resubmission action.
        await unlockTestContract(
            cmsServer,
            submittedTarget.id,
            'Unlock target for resubmit'
        )
        await submitTestContract(
            stateServer,
            submittedTarget.id,
            'Target resubmit'
        )

        // Resubmit the parent package that owns the linked rate. This changes
        // submitted linked-rate data visible from the target contract, so the
        // target history should include one LINKED_RATE_UPDATE.
        await unlockTestContract(
            cmsServer,
            submittedParent.id,
            'Unlock linked rate parent'
        )
        await submitTestContract(
            stateServer,
            submittedParent.id,
            'Linked rate parent resubmit'
        )

        // Add non-package actions that should also be represented in the action
        // log: an admin override on submitted data and a CMS review action.
        await overrideTestContractData(adminServer, {
            contractID: submittedTarget.id,
            description: 'Override target contract type',
            overrides: {
                revisionOverride: {
                    contractType: 'AMENDMENT',
                    contractTypeOp: 'OVERRIDE',
                },
            },
        })
        await approveTestContract(
            cmsServer,
            submittedTarget.id,
            '2024-11-11',
            'Approve target contract'
        )

        // Fetch the GraphQL contract too, because packageSubmissions.cause is
        // derived by the resolver independently from the builder. These cause
        // values are the test oracle for package-submission action mapping.
        const resolvedContract = await fetchTestContract(
            stateServer,
            submittedTarget.id
        )

        // Fetch the parsed domain contract from Postgres so the builder sees
        // the same cause-less shape production store code uses.
        const prismaClient = await sharedTestPrismaClient()
        const contract = must(
            await findContractWithHistory(prismaClient, submittedTarget.id)
        )
        const historyLog = buildContractSubmissionHistoryLog(contract)

        // The builder contract is newest-first ordering. Use a non-increasing
        // timestamp assertion instead of a hard-coded action list because some
        // adjacent test writes can share the same millisecond timestamp.
        expect(
            historyLog
                .slice(1)
                .every(
                    (entry, index) =>
                        historyLog[index].updatedAt.getTime() >=
                        entry.updatedAt.getTime()
                )
        ).toBe(true)

        const contractSubmissionPackages =
            resolvedContract.packageSubmissions.filter(
                (packageSubmission) =>
                    packageSubmission.cause === 'CONTRACT_SUBMISSION'
            )
        const rateSubmissionPackages =
            resolvedContract.packageSubmissions.filter(
                (packageSubmission) =>
                    packageSubmission.cause === 'RATE_SUBMISSION'
            )

        // CONTRACT_SUBMISSION package causes should map to
        // CONTRACT_SUBMISSION history entries. Assert against resolver-derived
        // causes rather than recomputing the builder predicate.
        const submitEntries = historyLog.filter(
            (entry) => entry.actionType === 'CONTRACT_SUBMISSION'
        )
        expect(
            submitEntries.map((entry) => entry.updatedReason).sort()
        ).toEqual(
            contractSubmissionPackages
                .map(
                    (packageSubmission) =>
                        packageSubmission.submitInfo.updatedReason
                )
                .sort()
        )
        expect(
            submitEntries.map((entry) => entry.updatedReason).sort()
        ).toEqual(['Initial submission', 'Target resubmit'])

        // The unlock was followed by resubmit and lives on a submitted contract
        // revision.
        const unlockEntries = historyLog.filter(
            (entry) => entry.actionType === 'UNLOCK'
        )
        expect(unlockEntries.map((entry) => entry.updatedReason)).toEqual([
            'Unlock target for resubmit',
        ])

        // RATE_SUBMISSION package causes should map to LINKED_RATE_UPDATE
        // history entries. This is the contract-side "linked rate data changed"
        // case.
        const linkedRateUpdateEntries = historyLog.filter(
            (entry) => entry.actionType === 'LINKED_RATE_UPDATE'
        )
        expect(linkedRateUpdateEntries).toHaveLength(
            rateSubmissionPackages.length
        )
        expect(
            linkedRateUpdateEntries.map((entry) => entry.updatedReason).sort()
        ).toEqual(
            rateSubmissionPackages
                .map(
                    (packageSubmission) =>
                        packageSubmission.submitInfo.updatedReason
                )
                .sort()
        )
        expect(linkedRateUpdateEntries[0].updatedReason).toBe(
            'Linked rate parent resubmit'
        )

        // Contract overrides are append-only rows outside packageSubmissions.
        // The builder maps createdAt/description onto the action-log shape.
        const contractOverrides = contract.contractOverrides ?? []
        expect(contractOverrides).toHaveLength(1)
        expect(
            historyLog.filter((entry) => entry.actionType === 'OVERRIDE')
        ).toEqual([
            {
                actionType: 'OVERRIDE',
                updatedAt: contractOverrides[0].createdAt,
                updatedBy: contractOverrides[0].updatedBy,
                updatedReason: contractOverrides[0].description,
            },
        ])

        // Review actions are also outside packageSubmissions. Verify the
        // approval action is copied through exactly from parsed contract data.
        const reviewStatusActions = contract.reviewStatusActions ?? []
        const reviewAction = reviewStatusActions.find(
            (action) => action.actionType === 'MARK_AS_APPROVED'
        )
        expect(reviewAction).toBeDefined()
        expect(
            historyLog.find((entry) => entry.actionType === 'MARK_AS_APPROVED')
        ).toEqual({
            actionType: reviewAction?.actionType,
            updatedAt: reviewAction?.updatedAt,
            updatedBy: reviewAction?.updatedBy,
            updatedReason: reviewAction?.updatedReason,
        })
    })

    it('logs an active draft unlock before the contract is resubmitted', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        // Stop after unlock. This exercises the draftRevision.unlockInfo branch
        // that store code relies on before a state user resubmits the package.
        await unlockTestContract(
            cmsServer,
            submittedContract.id,
            'Unlock without resubmit'
        )

        const prismaClient = await sharedTestPrismaClient()
        const contract = must(
            await findContractWithHistory(prismaClient, submittedContract.id)
        )
        const historyLog = buildContractSubmissionHistoryLog(contract)

        expect(historyLog[0].actionType).toBe('UNLOCK')
        expect(historyLog[0].updatedReason).toBe('Unlock without resubmit')
    })

    it('logs a contract withdraw review action', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedContract = await createAndSubmitTestContract(stateServer)

        // Withdraw is a review-status action outside packageSubmissions. It
        // should still be in the history because it changes contract freshness.
        await withdrawTestContract(
            cmsServer,
            submittedContract.id,
            'Withdraw from submission history test'
        )

        const prismaClient = await sharedTestPrismaClient()
        const contract = must(
            await findContractWithHistory(prismaClient, submittedContract.id)
        )
        const withdrawAction = contract.reviewStatusActions?.find(
            (action) => action.actionType === 'WITHDRAW'
        )
        const historyLog = buildContractSubmissionHistoryLog(contract)
        const withdrawEntry = historyLog.find(
            (entry) => entry.actionType === 'WITHDRAW'
        )

        expect(withdrawAction).toBeDefined()
        expect(withdrawEntry).toEqual(
            expect.objectContaining({
                actionType: 'WITHDRAW',
                updatedAt: withdrawAction?.updatedAt,
                updatedBy: withdrawAction?.updatedBy,
                updatedReason: withdrawAction?.updatedReason,
            })
        )
        expect(historyLog[0].updatedAt).toEqual(withdrawAction?.updatedAt)
    })

    it('logs an under-review review action from reversing approval', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedContract = await createAndSubmitTestContract(stateServer)

        await approveTestContract(
            cmsServer,
            submittedContract.id,
            '2024-11-11',
            'Approve before reverse'
        )

        // Reversing approval appends an UNDER_REVIEW review-status action. The
        // builder should copy it through so lastActionDate can move when review
        // status returns to under review.
        await reverseApproveTestContract(
            cmsServer,
            submittedContract.id,
            'Approval was made in error'
        )

        const prismaClient = await sharedTestPrismaClient()
        const contract = must(
            await findContractWithHistory(prismaClient, submittedContract.id)
        )
        const underReviewAction = contract.reviewStatusActions?.find(
            (action) =>
                action.actionType === 'UNDER_REVIEW' &&
                action.updatedReason === 'Approval was made in error'
        )
        const historyLog = buildContractSubmissionHistoryLog(contract)
        const underReviewEntry = historyLog.find(
            (entry) =>
                entry.actionType === 'UNDER_REVIEW' &&
                entry.updatedReason === 'Approval was made in error'
        )

        expect(underReviewAction).toBeDefined()
        expect(underReviewEntry).toEqual(
            expect.objectContaining({
                actionType: 'UNDER_REVIEW',
                updatedAt: underReviewAction?.updatedAt,
                updatedBy: underReviewAction?.updatedBy,
                updatedReason: underReviewAction?.updatedReason,
            })
        )
        expect(historyLog[0].updatedAt).toEqual(underReviewAction?.updatedAt)
    })

    it('sorts an EQRO under-review determination before its contract submission', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const draft = await createAndUpdateTestEQROContract(stateServer)
        const submittedContract = await submitTestContract(
            stateServer,
            draft.id,
            'Submit EQRO subject to review'
        )

        await unlockTestContract(
            cmsServer,
            submittedContract.id,
            'Unlock EQRO subject to review'
        )
        await submitTestContract(
            stateServer,
            submittedContract.id,
            'Resubmit EQRO subject to review'
        )

        const prismaClient = await sharedTestPrismaClient()
        const contract = must(
            await findContractWithHistory(prismaClient, submittedContract.id)
        )
        const historyLog = buildContractSubmissionHistoryLog(contract)
        const resubmitEntryIndex = historyLog.findIndex(
            (entry) =>
                entry.actionType === 'CONTRACT_SUBMISSION' &&
                entry.updatedReason === 'Resubmit EQRO subject to review'
        )

        // EQRO subject-to-review submissions append an automated UNDER_REVIEW
        // review action after the submit. That review action should be the
        // latest freshness event, with the matching contract submission next.
        expect(contract.reviewStatusActions?.[0].actionType).toBe(
            'UNDER_REVIEW'
        )
        expect(historyLog[0].actionType).toBe('UNDER_REVIEW')
        expect(resubmitEntryIndex).toBe(1)
    })

    it('adds one linked rate update when multiple already-linked rates are resubmitted by the same parent', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        // Submit a parent contract with two child rates so one parent submit
        // event can later update multiple linked rates in another contract.
        const parentDraftWithOneRate =
            await createAndUpdateTestContractWithRate(stateServer)
        const parentDraftWithTwoRates = await addNewRateToTestContract(
            stateServer,
            parentDraftWithOneRate
        )
        const submittedParent = await submitTestContract(
            stateServer,
            parentDraftWithTwoRates.id,
            'Submit parent with two rates'
        )
        const linkedRateIDs =
            submittedParent.packageSubmissions[0].rateRevisions
                .map((rateRevision) => rateRevision.rateID)
                .sort()

        // Submit another contract with both parent rates linked. They are now
        // already-linked rates from this contract's perspective.
        const linkedContractDraft =
            await createAndUpdateTestContractWithRate(stateServer)
        const linkedContractOwnRateID = linkedContractDraft.draftRates?.[0].id

        if (!linkedContractOwnRateID) {
            throw new Error(
                'Expected linked contract to have its own draft rate'
            )
        }

        const linkedContractWithFirstLinkedRate =
            await addLinkedRateToTestContract(
                stateServer,
                linkedContractDraft,
                linkedRateIDs[0]
            )
        const linkedContractWithBothLinkedRates =
            await addLinkedRateToTestContract(
                stateServer,
                linkedContractWithFirstLinkedRate,
                linkedRateIDs[1]
            )
        const submittedLinkedContract = await submitTestContract(
            stateServer,
            linkedContractWithBothLinkedRates.id,
            'Submit contract with two linked rates'
        )

        // Resubmit the parent contract. Both linked rates are updated by the
        // same parent submit event, so the action log should get one
        // LINKED_RATE_UPDATE.
        await unlockTestContract(
            cmsServer,
            submittedParent.id,
            'Unlock parent rates'
        )
        await submitTestContract(
            stateServer,
            submittedParent.id,
            'Resubmit parent rates'
        )

        const prismaClient = await sharedTestPrismaClient()
        const contract = must(
            await findContractWithHistory(
                prismaClient,
                submittedLinkedContract.id
            )
        )

        // Multiple linked rates can be updated by one parent submit event, but
        // the log represents the parent submit event, so only one entry is
        // expected.
        const historyLog = buildContractSubmissionHistoryLog(contract)
        const linkedRateUpdateEntries = historyLog.filter(
            (entry) => entry.actionType === 'LINKED_RATE_UPDATE'
        )

        expect(linkedRateUpdateEntries).toHaveLength(1)
        expect(linkedRateUpdateEntries[0].updatedReason).toBe(
            'Resubmit parent rates'
        )
    })

    it('does not log a pure rate link package event', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedParent =
            await createAndSubmitTestContractWithRate(stateServer)
        const linkedRateID =
            submittedParent.packageSubmissions[0].rateRevisions[0].rateID

        // Link the rate to an already-submitted contract while that contract is
        // unlocked. The target contract has not resubmitted yet.
        const submittedContractOnly =
            await createAndSubmitTestContract(stateServer)
        await unlockTestContract(
            cmsServer,
            submittedContractOnly.id,
            'Unlock contract to add a linked rate'
        )
        const unlockedContractOnly = await fetchTestContract(
            stateServer,
            submittedContractOnly.id
        )
        await addLinkedRateToTestContract(
            stateServer,
            unlockedContractOnly,
            linkedRateID
        )

        // Resubmit the rate's parent. From the target contract's package
        // history this is the first time the rate appears, so the package cause
        // is RATE_LINK rather than an already-linked rate update.
        await unlockTestContract(
            cmsServer,
            submittedParent.id,
            'Unlock parent rate'
        )
        await submitTestContract(
            stateServer,
            submittedParent.id,
            'Resubmit parent rate for first link'
        )

        const fetchedContract = await fetchTestContract(
            stateServer,
            submittedContractOnly.id
        )
        expect(fetchedContract.packageSubmissions[0].cause).toBe('RATE_LINK')

        // RATE_LINK is relationship history while the contract is still
        // unlocked, not submitted data changing. The action log should skip it.
        const prismaClient = await sharedTestPrismaClient()
        const contract = must(
            await findContractWithHistory(
                prismaClient,
                submittedContractOnly.id
            )
        )

        const historyLog = buildContractSubmissionHistoryLog(contract)

        expect(
            historyLog.some(
                (entry) => entry.actionType === 'LINKED_RATE_UPDATE'
            )
        ).toBe(false)
    })

    it('logs a linked-rate unlink on the current contract as a contract submission', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedParent =
            await createAndSubmitTestContractWithRate(stateServer)
        const linkedRateID =
            submittedParent.packageSubmissions[0].rateRevisions[0].rateID

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
            'Submit target with linked rate'
        )

        // Remove the linked rate from the target contract's draft set, then
        // resubmit the target. This submitted contract action captures the
        // relationship change in the target's own history.
        await unlockTestContract(
            cmsServer,
            submittedTarget.id,
            'Unlock target to unlink rate'
        )
        const unlockedTarget = await fetchTestContract(
            stateServer,
            submittedTarget.id
        )
        const unlinkResult = await executeGraphQLOperation(stateServer, {
            query: UpdateDraftContractRatesDocument,
            variables: {
                input: {
                    contractID: unlockedTarget.id,
                    lastSeenUpdatedAt: unlockedTarget.draftRevision?.updatedAt,
                    updatedRates: unlockedTarget.draftRates
                        ?.filter((rate) => rate.id !== linkedRateID)
                        .map((rate) => ({
                            type: 'UPDATE' as const,
                            rateID: rate.id,
                            formData: rate.draftRevision
                                ? formatRateDataForSending(
                                      rate.draftRevision.formData
                                  )
                                : undefined,
                        })),
                },
            },
        })

        expect(unlinkResult.errors).toBeUndefined()
        await submitTestContract(
            stateServer,
            submittedTarget.id,
            'Resubmit target without linked rate'
        )

        const fetchedTarget = await fetchTestContract(
            stateServer,
            submittedTarget.id
        )
        expect(fetchedTarget.packageSubmissions[0].cause).toBe(
            'CONTRACT_SUBMISSION'
        )

        const prismaClient = await sharedTestPrismaClient()
        const contract = must(
            await findContractWithHistory(prismaClient, submittedTarget.id)
        )
        const historyLog = buildContractSubmissionHistoryLog(contract)

        expect(
            historyLog.some(
                (entry) =>
                    entry.actionType === 'LINKED_RATE_UPDATE' &&
                    entry.updatedReason ===
                        'Resubmit target without linked rate'
            )
        ).toBe(false)
        expect(
            historyLog.some(
                (entry) =>
                    entry.actionType === 'CONTRACT_SUBMISSION' &&
                    entry.updatedReason ===
                        'Resubmit target without linked rate'
            )
        ).toBe(true)
    })

    it('does not log child rates as separate rate submissions', async () => {
        const stateServer = await constructTestPostgresServer()
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const fetchedContract = await fetchTestContract(
            stateServer,
            submittedContract.id
        )

        // The package contains a child rate revision, but the package event is
        // still a contract submission because the contract revision was stamped
        // by the submit. Child rates submitted with their parent should not be
        // treated like rate submissions.
        expect(fetchedContract.packageSubmissions).toHaveLength(1)
        expect(fetchedContract.packageSubmissions[0].cause).toBe(
            'CONTRACT_SUBMISSION'
        )
        expect(fetchedContract.packageSubmissions[0].rateRevisions.length).toBe(
            1
        )

        const prismaClient = await sharedTestPrismaClient()
        const contract = must(
            await findContractWithHistory(prismaClient, submittedContract.id)
        )
        const historyLog = buildContractSubmissionHistoryLog(contract)

        expect(
            historyLog.filter(
                (entry) => entry.actionType === 'CONTRACT_SUBMISSION'
            )
        ).toHaveLength(1)
        expect(
            historyLog.some(
                (entry) => entry.actionType === 'LINKED_RATE_UPDATE'
            )
        ).toBe(false)
    })

    it('skips a new link to another contract while existing linked contracts get LINKED_RATE_UPDATE', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedParent =
            await createAndSubmitTestContractWithRate(stateServer)
        const linkedRateID =
            submittedParent.packageSubmissions[0].rateRevisions[0].rateID

        const firstLinkedDraft =
            await createAndUpdateTestContractWithRate(stateServer)
        const firstLinkedWithRate = await addLinkedRateToTestContract(
            stateServer,
            firstLinkedDraft,
            linkedRateID
        )
        const firstLinkedSubmitted = await submitTestContract(
            stateServer,
            firstLinkedWithRate.id,
            'Submit first linked contract'
        )

        // A different contract links to the same rate but has not submitted the
        // relationship yet. When the parent resubmits, the first linked
        // contract should see a linked rate update, while the second sees
        // a RATE_LINK relationship event.
        const secondLinkedSubmitted =
            await createAndSubmitTestContract(stateServer)
        await unlockTestContract(
            cmsServer,
            secondLinkedSubmitted.id,
            'Unlock second linked contract'
        )
        const secondLinkedUnlocked = await fetchTestContract(
            stateServer,
            secondLinkedSubmitted.id
        )
        await addLinkedRateToTestContract(
            stateServer,
            secondLinkedUnlocked,
            linkedRateID
        )

        await unlockTestContract(
            cmsServer,
            submittedParent.id,
            'Unlock parent for another contract link'
        )
        await submitTestContract(
            stateServer,
            submittedParent.id,
            'Resubmit parent after another contract link'
        )

        const fetchedSecondLinked = await fetchTestContract(
            stateServer,
            secondLinkedSubmitted.id
        )
        expect(fetchedSecondLinked.packageSubmissions[0].cause).toBe(
            'RATE_LINK'
        )

        const prismaClient = await sharedTestPrismaClient()
        const firstLinkedContract = must(
            await findContractWithHistory(prismaClient, firstLinkedSubmitted.id)
        )
        const firstLinkedHistoryLog =
            buildContractSubmissionHistoryLog(firstLinkedContract)

        expect(
            firstLinkedHistoryLog.filter(
                (entry) =>
                    entry.actionType === 'LINKED_RATE_UPDATE' &&
                    entry.updatedReason ===
                        'Resubmit parent after another contract link'
            )
        ).toHaveLength(1)

        const secondLinkedContract = must(
            await findContractWithHistory(
                prismaClient,
                secondLinkedSubmitted.id
            )
        )
        const secondLinkedHistoryLog =
            buildContractSubmissionHistoryLog(secondLinkedContract)

        expect(
            secondLinkedHistoryLog.some(
                (entry) => entry.actionType === 'LINKED_RATE_UPDATE'
            )
        ).toBe(false)
    })
})

describe('buildRateSubmissionHistoryLog', () => {
    it('builds a child rate action log from parent contract submit, unlock, override, and withdraw', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
            },
        })

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        // Child rates are unlocked and resubmitted through their parent
        // contract. The rate builder still logs this as RATE_SUBMISSION because
        // the rate revision is part of submittedRevisions.
        await unlockTestContract(
            cmsServer,
            submittedContract.id,
            'Unlock parent contract for rate resubmit'
        )
        await submitTestContract(
            stateServer,
            submittedContract.id,
            'Resubmit child rate with parent contract'
        )

        // Rate overrides are outside packageSubmissions, but they still mutate
        // submitted rate state and should move rate freshness.
        await overrideTestRateData(adminServer, {
            rateID,
            description: 'Override rate initially submitted at',
            overrides: {
                initiallySubmittedAt: '2020-01-15T00:00:00.000Z',
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })

        // Withdrawing a rate performs its own unlock/resubmit flow before
        // appending the WITHDRAW review action: the affected submitted
        // contracts are unlocked and resubmitted without this rate, then the
        // withdrawn rate revision is resubmitted with a withdrawal reason.
        await withdrawTestRate(cmsServer, rateID, 'Withdraw rate from review')

        const fetchedRate = await fetchTestRateById(stateServer, rateID)
        const rateSubmissionPackages =
            fetchedRate.packageSubmissions?.filter(
                (packageSubmission) =>
                    packageSubmission.cause === 'RATE_SUBMISSION'
            ) ?? []
        const rateUnlinkPackages =
            fetchedRate.packageSubmissions?.filter(
                (packageSubmission) => packageSubmission.cause === 'RATE_UNLINK'
            ) ?? []

        const prismaClient = await sharedTestPrismaClient()
        const rate = must(await findRateWithHistory(prismaClient, rateID))
        const historyLog = buildRateSubmissionHistoryLog(rate)
        const rateSubmissionEntries = historyLog.filter(
            (entry) => entry.actionType === 'RATE_SUBMISSION'
        )
        const unlockEntries = historyLog.filter(
            (entry) => entry.actionType === 'UNLOCK'
        )
        const withdrawAction = rate.reviewStatusActions?.find(
            (action) => action.actionType === 'WITHDRAW'
        )
        const withdrawEntry = historyLog.find(
            (entry) => entry.actionType === 'WITHDRAW'
        )
        const rateUnlinkEntries = historyLog.filter(
            (entry) => entry.actionType === 'RATE_UNLINK'
        )
        const override = rate.rateOverrides?.[0]
        const overrideEntry = historyLog.find(
            (entry) => entry.actionType === 'OVERRIDE'
        )
        const manualRateResubmitPackage = rate.packageSubmissions.find(
            (packageSubmission) =>
                packageSubmission.submitInfo.updatedReason ===
                'Resubmit child rate with parent contract'
        )
        const manualUnlockInfo =
            manualRateResubmitPackage?.rateRevision.unlockInfo

        expect(
            historyLog
                .slice(1)
                .every(
                    (entry, index) =>
                        historyLog[index].updatedAt.getTime() >=
                        entry.updatedAt.getTime()
                )
        ).toBe(true)

        const historyActions = historyLog.map((entry) => ({
            actionType: entry.actionType,
            updatedReason: entry.updatedReason,
        }))
        const rateSubmissionReasons = rateSubmissionEntries.map(
            (entry) => entry.updatedReason
        )
        const unlockReasons = unlockEntries.map((entry) => entry.updatedReason)

        expect(historyLog).toHaveLength(8)
        expect(historyActions).toEqual(
            expect.arrayContaining([
                {
                    actionType: 'RATE_SUBMISSION',
                    updatedReason: 'Initial submission',
                },
                {
                    actionType: 'UNLOCK',
                    updatedReason: 'Unlock parent contract for rate resubmit',
                },
                {
                    actionType: 'RATE_SUBMISSION',
                    updatedReason: 'Resubmit child rate with parent contract',
                },
                {
                    actionType: 'OVERRIDE',
                    updatedReason: 'Override rate initially submitted at',
                },
                {
                    actionType: 'RATE_SUBMISSION',
                    updatedReason:
                        'CMS has withdrawn this rate. Withdraw rate from review',
                },
                {
                    actionType: 'WITHDRAW',
                    updatedReason: 'Withdraw rate from review',
                },
            ])
        )
        expect(
            historyActions.some(
                (entry) =>
                    entry.actionType === 'UNLOCK' &&
                    entry.updatedReason?.includes('CMS withdrawing rate')
            )
        ).toBe(true)
        expect(
            historyActions.some(
                (entry) =>
                    entry.actionType === 'RATE_UNLINK' &&
                    entry.updatedReason?.includes('CMS has withdrawn rate') &&
                    entry.updatedReason.includes(
                        'from this submission. Withdraw rate from review'
                    )
            )
        ).toBe(true)
        expect(rateSubmissionPackages).toHaveLength(3)
        expect(rateUnlinkPackages).toHaveLength(1)
        expect(rateSubmissionReasons).toHaveLength(3)
        expect(rateSubmissionReasons).toEqual(
            expect.arrayContaining([
                'Initial submission',
                'Resubmit child rate with parent contract',
                'CMS has withdrawn this rate. Withdraw rate from review',
            ])
        )
        expect(unlockReasons).toHaveLength(2)
        expect(unlockReasons).toContain(
            'Unlock parent contract for rate resubmit'
        )
        expect(
            unlockReasons.some((reason) =>
                reason?.includes('CMS withdrawing rate')
            )
        ).toBe(true)
        expect(manualRateResubmitPackage).toBeDefined()
        expect(
            rateSubmissionEntries.find(
                (entry) =>
                    entry.updatedReason ===
                    'Resubmit child rate with parent contract'
            )
        ).toEqual(
            expect.objectContaining({
                actionType: 'RATE_SUBMISSION',
                updatedAt: manualRateResubmitPackage?.submitInfo.updatedAt,
                updatedBy: manualRateResubmitPackage?.submitInfo.updatedBy,
                updatedReason:
                    manualRateResubmitPackage?.submitInfo.updatedReason,
            })
        )
        expect(manualUnlockInfo).toBeDefined()
        expect(
            unlockEntries.find(
                (entry) =>
                    entry.updatedReason ===
                    'Unlock parent contract for rate resubmit'
            )
        ).toEqual(
            expect.objectContaining({
                actionType: 'UNLOCK',
                updatedAt: manualUnlockInfo?.updatedAt,
                updatedBy: manualUnlockInfo?.updatedBy,
                updatedReason: manualUnlockInfo?.updatedReason,
            })
        )
        expect(override).toBeDefined()
        expect(overrideEntry).toEqual(
            expect.objectContaining({
                actionType: 'OVERRIDE',
                updatedAt: override?.createdAt,
                updatedBy: override?.updatedBy,
                updatedReason: override?.description,
            })
        )
        expect(withdrawAction).toBeDefined()
        expect(withdrawEntry).toEqual(
            expect.objectContaining({
                actionType: 'WITHDRAW',
                updatedAt: withdrawAction?.updatedAt,
                updatedBy: withdrawAction?.updatedBy,
                updatedReason: withdrawAction?.updatedReason,
            })
        )
        expect(rateUnlinkEntries).toHaveLength(1)
        expect(rateUnlinkEntries[0].updatedReason).toContain(
            'CMS has withdrawn rate'
        )
        expect(rateUnlinkEntries[0].updatedReason).toContain(
            'from this submission. Withdraw rate from review'
        )
    })

    it('logs an active draft rate unlock before the rate is resubmitted', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        // The parent contract unlock creates the in-flight draft rate revision
        // with unlockInfo. The rate itself is not independently unlocked.
        await unlockTestContract(
            cmsServer,
            submittedContract.id,
            'Unlock parent contract without rate resubmit'
        )

        const prismaClient = await sharedTestPrismaClient()
        const rate = must(await findRateWithHistory(prismaClient, rateID))
        const historyLog = buildRateSubmissionHistoryLog(rate)

        expect(historyLog[0].actionType).toBe('UNLOCK')
        expect(historyLog[0].updatedReason).toBe(
            'Unlock parent contract without rate resubmit'
        )
    })

    it('logs rate data changes when a linked rate parent resubmits', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedParent =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedParent.packageSubmissions[0].rateRevisions[0].rateID

        // Link the parent-owned rate into another submitted contract. The rate
        // is now visible from multiple packages, but its data is still owned by
        // and resubmitted through the parent contract.
        const linkedDraft =
            await createAndUpdateTestContractWithRate(stateServer)
        const linkedWithRate = await addLinkedRateToTestContract(
            stateServer,
            linkedDraft,
            rateID
        )
        await submitTestContract(
            stateServer,
            linkedWithRate.id,
            'Submit contract with linked parent rate'
        )

        await unlockTestContract(
            cmsServer,
            submittedParent.id,
            'Unlock parent to update linked rate data'
        )
        await submitTestContract(
            stateServer,
            submittedParent.id,
            'Resubmit parent linked rate data'
        )

        const fetchedRate = await fetchTestRateById(stateServer, rateID)
        const rateSubmissionPackages =
            fetchedRate.packageSubmissions?.filter(
                (packageSubmission) =>
                    packageSubmission.cause === 'RATE_SUBMISSION'
            ) ?? []

        const prismaClient = await sharedTestPrismaClient()
        const rate = must(await findRateWithHistory(prismaClient, rateID))
        const historyLog = buildRateSubmissionHistoryLog(rate)
        const rateSubmissionEntries = historyLog.filter(
            (entry) => entry.actionType === 'RATE_SUBMISSION'
        )

        expect(rateSubmissionEntries).toHaveLength(
            rateSubmissionPackages.length
        )
        expect(
            rateSubmissionEntries.some(
                (entry) =>
                    entry.updatedReason === 'Resubmit parent linked rate data'
            )
        ).toBe(true)
    })

    it('does not log draft-only rate links before the contract submits', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedParent =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedParent.packageSubmissions[0].rateRevisions[0].rateID

        const submittedContractOnly =
            await createAndSubmitTestContract(stateServer)
        await unlockTestContract(
            cmsServer,
            submittedContractOnly.id,
            'Unlock contract for draft-only rate link'
        )
        const unlockedContractOnly = await fetchTestContract(
            stateServer,
            submittedContractOnly.id
        )
        await addLinkedRateToTestContract(
            stateServer,
            unlockedContractOnly,
            rateID
        )

        const prismaClient = await sharedTestPrismaClient()
        const rate = must(await findRateWithHistory(prismaClient, rateID))
        const historyLog = buildRateSubmissionHistoryLog(rate)

        expect(
            historyLog.some((entry) => entry.actionType === 'RATE_LINK')
        ).toBe(false)
        expect(
            historyLog.some(
                (entry) =>
                    entry.updatedReason ===
                    'Unlock contract for draft-only rate link'
            )
        ).toBe(false)
    })

    it('logs undo rate withdraw actions on the rate and affected contract histories', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID
        const rateName =
            submittedContract.packageSubmissions[0].rateRevisions[0].formData
                .rateCertificationName
        const undoWithdrawSubmitReason = `CMS has changed the status of rate ${rateName} to submitted. Undo rate withdraw back to under review`

        await withdrawTestRate(
            cmsServer,
            rateID,
            'Withdraw rate before undo review'
        )
        await undoWithdrawTestRate(
            cmsServer,
            rateID,
            'Undo rate withdraw back to under review'
        )

        const prismaClient = await sharedTestPrismaClient()
        const rate = must(await findRateWithHistory(prismaClient, rateID))
        const affectedContract = must(
            await findContractWithHistory(prismaClient, submittedContract.id)
        )
        const underReviewAction = rate.reviewStatusActions?.find(
            (action) =>
                action.actionType === 'UNDER_REVIEW' &&
                action.updatedReason ===
                    'Undo rate withdraw back to under review'
        )
        const historyLog = buildRateSubmissionHistoryLog(rate)
        const underReviewEntry = historyLog.find(
            (entry) =>
                entry.actionType === 'UNDER_REVIEW' &&
                entry.updatedReason ===
                    'Undo rate withdraw back to under review'
        )
        const affectedContractHistoryLog =
            buildContractSubmissionHistoryLog(affectedContract)
        const restoreContractSubmitEntry = affectedContractHistoryLog.find(
            (entry) =>
                entry.actionType === 'CONTRACT_SUBMISSION' &&
                entry.updatedReason === undoWithdrawSubmitReason
        )
        const restoreContractReviewAction =
            affectedContract.reviewStatusActions?.find(
                (action) =>
                    action.actionType === 'UNDER_REVIEW' &&
                    action.updatedReason === undefined
            )
        const restoreContractReviewEntry = affectedContractHistoryLog.find(
            (entry) =>
                entry.actionType === 'UNDER_REVIEW' &&
                entry.updatedAt.getTime() ===
                    restoreContractReviewAction?.updatedAt.getTime()
        )

        expect(underReviewAction).toBeDefined()
        expect(underReviewEntry).toEqual(
            expect.objectContaining({
                actionType: 'UNDER_REVIEW',
                updatedAt: underReviewAction?.updatedAt,
                updatedBy: underReviewAction?.updatedBy,
                updatedReason: underReviewAction?.updatedReason,
            })
        )

        // Undoing a rate withdraw also restores the rate to each affected
        // contract by resubmitting that contract. The contract-side history
        // should capture that submitted data change.
        expect(restoreContractSubmitEntry).toEqual(
            expect.objectContaining({
                actionType: 'CONTRACT_SUBMISSION',
                updatedReason: undoWithdrawSubmitReason,
            })
        )

        // After the restore resubmit, undoWithdrawRate runs the same automated
        // health-plan review determination as normal submit. That review action
        // should also appear in the affected contract history.
        expect(restoreContractReviewAction).toBeDefined()
        expect(restoreContractReviewEntry).toEqual(
            expect.objectContaining({
                actionType: restoreContractReviewAction?.actionType,
                updatedAt: restoreContractReviewAction?.updatedAt,
                updatedBy: restoreContractReviewAction?.updatedBy,
                updatedReason: restoreContractReviewAction?.updatedReason,
            })
        )
    })

    it('logs rate links and skips already-related contract submissions from package history', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedParent =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedParent.packageSubmissions[0].rateRevisions[0].rateID

        // The first linked-contract submit is a relationship event from the
        // rate perspective. It should appear as RATE_LINK, not
        // CONTRACT_SUBMISSION.
        const linkedDraft =
            await createAndUpdateTestContractWithRate(stateServer)
        const linkedWithRate = await addLinkedRateToTestContract(
            stateServer,
            linkedDraft,
            rateID
        )
        const linkedSubmitted = await submitTestContract(
            stateServer,
            linkedWithRate.id,
            'Submit newly linked contract'
        )

        // Once the contract is already connected, its resubmit is contract-only
        // activity from the rate perspective and should not be logged.
        await unlockTestContract(
            cmsServer,
            linkedSubmitted.id,
            'Unlock already linked contract'
        )
        await submitTestContract(
            stateServer,
            linkedSubmitted.id,
            'Resubmit already linked contract'
        )

        // Unlinking the rate from the already-connected contract is material
        // rate relationship history and should be logged as RATE_UNLINK.
        await unlockTestContract(
            cmsServer,
            linkedSubmitted.id,
            'Unlock linked contract to unlink rate'
        )
        const unlockedLinkedContract = await fetchTestContract(
            stateServer,
            linkedSubmitted.id
        )
        const unlinkResult = await executeGraphQLOperation(stateServer, {
            query: UpdateDraftContractRatesDocument,
            variables: {
                input: {
                    contractID: unlockedLinkedContract.id,
                    lastSeenUpdatedAt:
                        unlockedLinkedContract.draftRevision?.updatedAt,
                    updatedRates: unlockedLinkedContract.draftRates
                        ?.filter((rate) => rate.id !== rateID)
                        .map((rate) => ({
                            type: 'UPDATE' as const,
                            rateID: rate.id,
                            formData: rate.draftRevision
                                ? formatRateDataForSending(
                                      rate.draftRevision.formData
                                  )
                                : undefined,
                        })),
                },
            },
        })

        expect(unlinkResult.errors).toBeUndefined()
        await submitTestContract(
            stateServer,
            linkedSubmitted.id,
            'Resubmit linked contract without rate'
        )

        const fetchedRate = await fetchTestRateById(stateServer, rateID)
        const contractSubmissionPackages =
            fetchedRate.packageSubmissions?.filter(
                (packageSubmission) =>
                    packageSubmission.cause === 'CONTRACT_SUBMISSION'
            ) ?? []
        const rateLinkPackages =
            fetchedRate.packageSubmissions?.filter(
                (packageSubmission) => packageSubmission.cause === 'RATE_LINK'
            ) ?? []
        const rateUnlinkPackages =
            fetchedRate.packageSubmissions?.filter(
                (packageSubmission) => packageSubmission.cause === 'RATE_UNLINK'
            ) ?? []

        const prismaClient = await sharedTestPrismaClient()
        const rate = must(await findRateWithHistory(prismaClient, rateID))
        const historyLog = buildRateSubmissionHistoryLog(rate)
        const rateLinkEntries = historyLog.filter(
            (entry) => entry.actionType === 'RATE_LINK'
        )
        const rateUnlinkEntries = historyLog.filter(
            (entry) => entry.actionType === 'RATE_UNLINK'
        )

        expect(rateLinkPackages).toHaveLength(1)
        expect(contractSubmissionPackages).toHaveLength(1)
        expect(rateUnlinkPackages).toHaveLength(1)
        expect(rateLinkEntries).toHaveLength(1)
        expect(rateUnlinkEntries).toHaveLength(1)
        // Initial contract submissions use the default submit reason, even
        // when the test helper passes a reason string.
        expect(rateLinkEntries[0].updatedReason).toBe('Initial submission')
        expect(rateUnlinkEntries[0].updatedReason).toBe(
            'Resubmit linked contract without rate'
        )
        expect(
            historyLog.some(
                (entry) =>
                    entry.updatedReason === 'Submit newly linked contract'
            )
        ).toBe(false)
        expect(
            historyLog.some(
                (entry) =>
                    entry.updatedReason === 'Resubmit already linked contract'
            )
        ).toBe(false)
    })
})

describe('buildQuestionResponseHistoryLog', () => {
    it('builds contract Q&A history with question deletes and skips cascade deletes', async () => {
        const adminUser = testAdminUser()
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        // Create Q&A through the resolvers so question and response creation
        // match the same rows production writes.
        const question = await createTestQuestion(cmsServer, contract.id)
        const questionWithResponse = await createTestQuestionResponse(
            stateServer,
            question.id
        )

        const prismaClient = await sharedTestPrismaClient()

        // Deleting the question writes a direct question DELETE plus cascade
        // response/document actions. The history fetcher should include only
        // the direct question delete, because cascade actions are fallout from
        // the parent delete and should not create separate history entries.
        await deleteTestContractQuestion(adminServer, question.id)

        const questionHistory = must(
            await findContractQuestionResponseHistory(prismaClient, contract.id)
        )
        const historyLog = buildQuestionResponseHistoryLog(
            questionHistory,
            'CONTRACT'
        )

        expect(historyLog.map((entry) => entry.actionType)).toEqual([
            'CONTRACT_QUESTION_DELETE',
            'CONTRACT_QUESTION_RESPONSE',
            'CONTRACT_QUESTION',
        ])
        expect(historyLog.map((entry) => entry.updatedReason)).toEqual([
            'Some reason',
            undefined,
            undefined,
        ])
        expect(historyLog[1].updatedAt).toEqual(
            questionWithResponse.responses[0].createdAt
        )
        expect(historyLog[2].updatedAt).toEqual(question.createdAt)
    })

    it('builds rate Q&A history from question and response actions', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const rateID = contract.packageSubmissions[0].rateRevisions[0].rateID

        // Rate Q&A is fetched through the history-specific store path because
        // the display Q&A finder filters deletion state for UI rendering.
        const question = await createTestRateQuestion(cmsServer, rateID)
        await createTestRateQuestionResponse(stateServer, question.id)

        const prismaClient = await sharedTestPrismaClient()
        const questionHistory = must(
            await findRateQuestionResponseHistory(prismaClient, rateID)
        )
        const historyLog = buildQuestionResponseHistoryLog(
            questionHistory,
            'RATE'
        )

        expect(historyLog.map((entry) => entry.actionType)).toEqual([
            'RATE_QUESTION_RESPONSE',
            'RATE_QUESTION',
        ])
    })
})

describe('buildCompleteHistoryLog', () => {
    it('combines contract history with contract Q&A history and matches the contract lastActionDate', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        // Add Q&A after the contract submit so the complete history has to
        // merge entries from separate builders instead of relying on one source
        // already being newest.
        const question = await createTestQuestion(
            cmsServer,
            submittedContract.id
        )
        await createTestQuestionResponse(stateServer, question.id)

        const prismaClient = await sharedTestPrismaClient()
        const contract = must(
            await findContractWithHistory(prismaClient, submittedContract.id)
        )
        const questionHistory = must(
            await findContractQuestionResponseHistory(
                prismaClient,
                submittedContract.id
            )
        )

        const contractHistory = buildContractSubmissionHistoryLog(contract)
        const qaHistory = buildQuestionResponseHistoryLog(
            questionHistory,
            'CONTRACT'
        )
        const completeHistory = buildCompleteHistoryLog([
            contractHistory,
            qaHistory,
        ])
        const contractTableRow = await prismaClient.contractTable.findUnique({
            where: { id: submittedContract.id },
            select: { lastActionDate: true },
        })

        // The complete contract history should align with the stored
        // lastActionDate. That validates the same composed history sources we
        // expect a contract detail view or last-action repair job to use.
        expect(completeHistory[0].updatedAt).toEqual(
            contractTableRow?.lastActionDate
        )
        expect(completeHistory.map((entry) => entry.actionType)).toEqual([
            'CONTRACT_QUESTION_RESPONSE',
            'CONTRACT_QUESTION',
            'CONTRACT_SUBMISSION',
        ])
        expect(
            completeHistory
                .slice(1)
                .every(
                    (entry, index) =>
                        completeHistory[index].updatedAt.getTime() >=
                        entry.updatedAt.getTime()
                )
        ).toBe(true)
    })

    it('combines rate history with rate Q&A history and matches the rate lastActionDate', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        // Add rate Q&A after submit so the complete rate history has to merge
        // the rate submission log with Q&A events and pick Q&A as latest.
        const question = await createTestRateQuestion(cmsServer, rateID)
        await createTestRateQuestionResponse(stateServer, question.id)

        const prismaClient = await sharedTestPrismaClient()
        const rate = must(await findRateWithHistory(prismaClient, rateID))
        const questionHistory = must(
            await findRateQuestionResponseHistory(prismaClient, rateID)
        )

        const rateHistory = buildRateSubmissionHistoryLog(rate)
        const qaHistory = buildQuestionResponseHistoryLog(
            questionHistory,
            'RATE'
        )
        const completeHistory = buildCompleteHistoryLog([
            rateHistory,
            qaHistory,
        ])
        const rateTableRow = await prismaClient.rateTable.findUnique({
            where: { id: rateID },
            select: { lastActionDate: true },
        })

        // The complete rate history should align with the stored
        // lastActionDate. This keeps rate Q&A and rate submission history in
        // sync with the persisted freshness field.
        expect(completeHistory[0].updatedAt).toEqual(
            rateTableRow?.lastActionDate
        )
        expect(completeHistory.map((entry) => entry.actionType)).toEqual([
            'RATE_QUESTION_RESPONSE',
            'RATE_QUESTION',
            'RATE_SUBMISSION',
        ])
        expect(
            completeHistory
                .slice(1)
                .every(
                    (entry, index) =>
                        completeHistory[index].updatedAt.getTime() >=
                        entry.updatedAt.getTime()
                )
        ).toBe(true)
    })
})
