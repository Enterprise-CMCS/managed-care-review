import { describe, expect, it } from 'vitest'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { UpdateDraftContractRatesDocument } from '../../gen/gqlClient'
import { testAdminUser, testCMSUser } from '../../testHelpers/userHelpers'
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
} from '../../testHelpers/gqlContractHelpers'
import {
    addLinkedRateToTestContract,
    addNewRateToTestContract,
    formatRateDataForSending,
} from '../../testHelpers/gqlRateHelpers'
import { must } from '../../testHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { findContractWithHistory } from './findContractWithHistory'
import { buildContractSubmissionHistoryLog } from './submissionHistoryLog'

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
        // RATE_SUBMISSION, because the target contract revision is in
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
        // target history should include one RATE_SUBMISSION.
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

        // RATE_SUBMISSION package causes should map to RATE_SUBMISSION
        // history entries. This is the contract-side "linked rate data changed"
        // case.
        const linkedRateUpdateEntries = historyLog.filter(
            (entry) => entry.actionType === 'RATE_SUBMISSION'
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

    it('adds one rate submission when multiple already-linked rates are resubmitted by the same parent', async () => {
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
        // RATE_SUBMISSION.
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
            (entry) => entry.actionType === 'RATE_SUBMISSION'
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
            historyLog.some((entry) => entry.actionType === 'RATE_SUBMISSION')
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
                    entry.actionType === 'RATE_SUBMISSION' &&
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
            historyLog.some((entry) => entry.actionType === 'RATE_SUBMISSION')
        ).toBe(false)
    })

    it('skips a new link to another contract while existing linked contracts get RATE_SUBMISSION', async () => {
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
        // contract should see a rate submission, while the second sees
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
                    entry.actionType === 'RATE_SUBMISSION' &&
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
                (entry) => entry.actionType === 'RATE_SUBMISSION'
            )
        ).toBe(false)
    })
})
