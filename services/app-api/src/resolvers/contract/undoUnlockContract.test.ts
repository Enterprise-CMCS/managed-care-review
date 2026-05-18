import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { UndoUnlockContractDocument } from '../../gen/gqlClient'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    approveTestContract,
    contractHistoryToDescriptions,
    createAndSubmitTestContract,
    createAndUpdateTestContractWithoutRates,
    createAndSubmitTestContractWithRate,
    fetchTestContract,
    undoUnlockTestContract,
    resubmitTestContract,
    submitTestContract,
    undoWithdrawTestContract,
    updateTestContractDraftRevision,
    unlockTestContract,
    withdrawTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { mockGqlContractDraftRevisionFormDataInput } from '../../testHelpers'
import {
    addLinkedRateToTestContract,
    fetchTestRateById,
} from '../../testHelpers/gqlRateHelpers'
import { testS3Client } from '../../testHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'

describe('undoUnlockContract', () => {
    const mockS3 = testS3Client()
    const mockEmailer = testEmailer(testEmailConfig())

    it('CMS user can reverse an unlocked contract', async () => {
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
            context: {
                user: testCMSUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        await unlockTestContract(cmsServer, contract.id, 'Unlocking for edits')

        const reversedContract = await undoUnlockTestContract(
            cmsServer,
            contract.id,
            'Unlock was accidental'
        )

        expect(reversedContract.status).toBe('SUBMITTED')
        expect(reversedContract.consolidatedStatus).toBe('SUBMITTED')
        expect(reversedContract.draftRevision).toBeNull()
        expect(reversedContract.draftRates).toBeNull()
    })

    it('reversed unlocked contract can be unlocked again, resubmitted, and approved with expected client data', async () => {
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
            context: {
                user: testCMSUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const initialSubmission = contract.packageSubmissions[0]
        const initialRateID = initialSubmission.rateRevisions[0].rateID

        await unlockTestContract(cmsServer, contract.id, 'Unlocking by mistake')

        const reversedContract = await undoUnlockTestContract(
            cmsServer,
            contract.id,
            'Unlock was accidental'
        )

        expect(reversedContract.status).toBe('SUBMITTED')
        expect(reversedContract.consolidatedStatus).toBe('SUBMITTED')
        expect(reversedContract.draftRevision).toBeNull()
        expect(reversedContract.draftRates).toBeNull()
        expect(reversedContract.packageSubmissions).toHaveLength(1)
        expect(contractHistoryToDescriptions(reversedContract)).not.toContain(
            'Unlock was accidental'
        )

        const unlockedAgain = await unlockTestContract(
            cmsServer,
            contract.id,
            'Unlocking again after reverse'
        )

        expect(unlockedAgain.status).toBe('UNLOCKED')
        expect(unlockedAgain.consolidatedStatus).toBe('UNLOCKED')
        expect(unlockedAgain.draftRevision?.unlockInfo?.updatedReason).toBe(
            'Unlocking again after reverse'
        )
        expect(unlockedAgain.draftRates).toHaveLength(1)
        expect(unlockedAgain.draftRates?.[0].id).toBe(initialRateID)

        const resubmittedContract = await resubmitTestContract(
            stateServer,
            contract.id,
            'Resubmitting after reversing unlock'
        )

        expect(resubmittedContract.status).toBe('RESUBMITTED')
        expect(resubmittedContract.consolidatedStatus).toBe('RESUBMITTED')
        expect(resubmittedContract.draftRevision).toBeNull()
        expect(resubmittedContract.draftRates).toBeNull()
        expect(resubmittedContract.packageSubmissions).toHaveLength(2)
        expect(
            resubmittedContract.packageSubmissions[0].submitInfo.updatedReason
        ).toBe('Resubmitting after reversing unlock')
        expect(
            resubmittedContract.packageSubmissions[0].contractRevision
                .unlockInfo?.updatedReason
        ).toBe('Unlocking again after reverse')
        expect(
            contractHistoryToDescriptions(resubmittedContract)
        ).not.toContain('Unlock was accidental')

        const approvedContract = await approveTestContract(
            cmsServer,
            contract.id
        )

        expect(approvedContract.status).toBe('RESUBMITTED')
        expect(approvedContract.reviewStatus).toBe('APPROVED')
        expect(approvedContract.consolidatedStatus).toBe('APPROVED')
        expect(approvedContract.packageSubmissions).toHaveLength(2)
    })

    it('reversed unlocked contract can be withdrawn and undo withdrawn with expected client data', async () => {
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
            context: {
                user: testCMSUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        await unlockTestContract(
            cmsServer,
            contract.id,
            'Temporary unlock before withdraw'
        )
        const reversedContract = await undoUnlockTestContract(
            cmsServer,
            contract.id,
            'Reverse before withdraw'
        )

        expect(reversedContract.consolidatedStatus).toBe('SUBMITTED')
        expect(reversedContract.draftRevision).toBeNull()
        expect(contractHistoryToDescriptions(reversedContract)).not.toContain(
            'Reverse before withdraw'
        )

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'Withdrawing after reversed unlock'
        )

        const withdrawnHistory =
            contractHistoryToDescriptions(withdrawnContract)

        expect(withdrawnContract.status).toBe('RESUBMITTED')
        expect(withdrawnContract.reviewStatus).toBe('WITHDRAWN')
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(withdrawnContract.draftRevision).toBeNull()
        expect(withdrawnHistory).toEqual(
            expect.arrayContaining([
                'Withdraw submission. Withdrawing after reversed unlock',
                'CMS withdrew the submission from review. Withdrawing after reversed unlock',
            ])
        )

        const undoWithdrawnContract = await undoWithdrawTestContract(
            cmsServer,
            contract.id,
            'Undo reversed-unlock withdrawal'
        )

        const undoWithdrawnHistory = contractHistoryToDescriptions(
            undoWithdrawnContract
        )

        expect(undoWithdrawnContract.status).toBe('RESUBMITTED')
        expect(undoWithdrawnContract.reviewStatus).toBe('UNDER_REVIEW')
        expect(undoWithdrawnContract.consolidatedStatus).toBe('RESUBMITTED')
        expect(undoWithdrawnContract.draftRevision).toBeNull()
        expect(undoWithdrawnContract.draftRates).toBeNull()
        expect(undoWithdrawnHistory).toEqual(
            expect.arrayContaining([
                'CMS undoing submission withdrawal. Undo reversed-unlock withdrawal',
                'CMS undid submission withdrawal. Undo reversed-unlock withdrawal',
            ])
        )

        const unlockedAfterUndo = await unlockTestContract(
            cmsServer,
            contract.id,
            'Unlock after undo withdraw'
        )

        expect(unlockedAfterUndo.status).toBe('UNLOCKED')
        expect(unlockedAfterUndo.draftRevision?.unlockInfo?.updatedReason).toBe(
            'Unlock after undo withdraw'
        )
    })

    it('preserves submission dates and derived date fields after undo unlock', async () => {
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
            context: {
                user: testCMSUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
        })

        const submittedContract = await createAndSubmitTestContract(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            }
        )
        const contractID = submittedContract.id

        const firstUnlock = await unlockTestContract(
            cmsServer,
            contractID,
            'Unlock to set execution'
        )

        const executedDraftData = mockGqlContractDraftRevisionFormDataInput(
            undefined,
            {
                contractExecutionStatus: 'EXECUTED',
            }
        )

        await updateTestContractDraftRevision(
            stateServer,
            contractID,
            firstUnlock.draftRevision?.updatedAt,
            executedDraftData
        )

        const resubmittedContract = await resubmitTestContract(
            stateServer,
            contractID,
            'Resubmit with executed docs'
        )

        expect(resubmittedContract.initiallySubmittedAt).not.toBeNull()
        expect(resubmittedContract.dateContractDocsExecuted).not.toBeNull()
        expect(resubmittedContract.packageSubmissions).toHaveLength(2)

        const initiallySubmittedAt = resubmittedContract.initiallySubmittedAt
        const dateContractDocsExecuted =
            resubmittedContract.dateContractDocsExecuted
        const lastUpdatedForDisplay = resubmittedContract.lastUpdatedForDisplay
        const latestSubmissionSubmitAt =
            resubmittedContract.packageSubmissions[0].submitInfo.updatedAt
        const latestSubmissionUnlockAt =
            resubmittedContract.packageSubmissions[0].contractRevision
                .unlockInfo?.updatedAt
        const initialSubmissionSubmitAt =
            resubmittedContract.packageSubmissions[1].submitInfo.updatedAt

        await unlockTestContract(cmsServer, contractID, 'Unlock by mistake')

        const reversedContract = await undoUnlockTestContract(
            cmsServer,
            contractID,
            'Reverse mistaken unlock'
        )

        expect(reversedContract.status).toBe('RESUBMITTED')
        expect(reversedContract.packageSubmissions).toHaveLength(2)
        expect(reversedContract.initiallySubmittedAt).toEqual(
            initiallySubmittedAt
        )
        expect(reversedContract.dateContractDocsExecuted).toEqual(
            dateContractDocsExecuted
        )
        expect(reversedContract.lastUpdatedForDisplay).toEqual(
            lastUpdatedForDisplay
        )
        expect(
            reversedContract.packageSubmissions[0].submitInfo.updatedAt
        ).toEqual(latestSubmissionSubmitAt)
        expect(
            reversedContract.packageSubmissions[0].contractRevision.unlockInfo
                ?.updatedAt
        ).toEqual(latestSubmissionUnlockAt)
        expect(
            reversedContract.packageSubmissions[1].submitInfo.updatedAt
        ).toEqual(initialSubmissionSubmitAt)

        const fetchedContract = await fetchTestContract(stateServer, contractID)

        expect(fetchedContract.draftRevision).toBeNull()
        expect(fetchedContract.packageSubmissions).toHaveLength(2)
        expect(fetchedContract.initiallySubmittedAt).toEqual(
            initiallySubmittedAt
        )
        expect(fetchedContract.dateContractDocsExecuted).toEqual(
            dateContractDocsExecuted
        )
        expect(fetchedContract.lastUpdatedForDisplay).toEqual(
            lastUpdatedForDisplay
        )
        expect(
            fetchedContract.packageSubmissions[0].submitInfo.updatedAt
        ).toEqual(latestSubmissionSubmitAt)
        expect(
            fetchedContract.packageSubmissions[0].contractRevision.unlockInfo
                ?.updatedAt
        ).toEqual(latestSubmissionUnlockAt)
        expect(
            fetchedContract.packageSubmissions[1].submitInfo.updatedAt
        ).toEqual(initialSubmissionSubmitAt)

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractID,
            'Withdraw after undo unlock'
        )

        expect(withdrawnContract.reviewStatus).toBe('WITHDRAWN')
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(withdrawnContract.initiallySubmittedAt).toEqual(
            initiallySubmittedAt
        )
        expect(withdrawnContract.dateContractDocsExecuted).toEqual(
            dateContractDocsExecuted
        )
        expect(withdrawnContract.packageSubmissions).toHaveLength(3)
        expect(
            withdrawnContract.packageSubmissions[1].submitInfo.updatedAt
        ).toEqual(latestSubmissionSubmitAt)
        expect(
            withdrawnContract.packageSubmissions[1].contractRevision.unlockInfo
                ?.updatedAt
        ).toEqual(latestSubmissionUnlockAt)
        expect(
            withdrawnContract.packageSubmissions[2].submitInfo.updatedAt
        ).toEqual(initialSubmissionSubmitAt)
    })

    it('delinks a linked rate from the reversed contract without affecting the linked rate parentage', async () => {
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
            context: {
                user: testCMSUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
        })

        const contractA = await createAndSubmitTestContractWithRate(stateServer)
        const linkedRateID =
            contractA.packageSubmissions[0].rateRevisions[0].rateID

        const draftB =
            await createAndUpdateTestContractWithoutRates(stateServer)
        await addLinkedRateToTestContract(stateServer, draftB, linkedRateID)
        const contractB = await submitTestContract(stateServer, draftB.id)

        const unlockedContractB = await unlockTestContract(
            cmsServer,
            contractB.id,
            'Unlock linked-rate contract'
        )

        expect(unlockedContractB.draftRates).toHaveLength(1)
        expect(unlockedContractB.draftRates?.[0].id).toBe(linkedRateID)
        expect(unlockedContractB.draftRates?.[0].parentContractID).toBe(
            contractA.id
        )

        const reversedContractB = await undoUnlockTestContract(
            cmsServer,
            contractB.id,
            'Reverse linked-rate unlock'
        )

        expect(reversedContractB.status).toBe('SUBMITTED')
        expect(reversedContractB.consolidatedStatus).toBe('SUBMITTED')
        expect(reversedContractB.draftRevision).toBeNull()
        expect(reversedContractB.draftRates).toBeNull()
        expect(contractHistoryToDescriptions(reversedContractB)).not.toContain(
            'Reverse linked-rate unlock'
        )
        expect(
            reversedContractB.packageSubmissions[0].rateRevisions.map(
                (rate) => rate.rateID
            )
        ).toContain(linkedRateID)

        const fetchedContractB = await fetchTestContract(
            stateServer,
            contractB.id
        )

        expect(fetchedContractB.draftRevision).toBeNull()
        expect(fetchedContractB.draftRates).toBeNull()
        expect(
            fetchedContractB.packageSubmissions[0].rateRevisions.map(
                (rate) => rate.rateID
            )
        ).toContain(linkedRateID)

        const fetchedLinkedRate = await fetchTestRateById(
            stateServer,
            linkedRateID
        )

        expect(fetchedLinkedRate.parentContractID).toBe(contractA.id)
        expect(fetchedLinkedRate.consolidatedStatus).toBe('SUBMITTED')
    })

    it('restores child rates to their submitted state after undo unlock', async () => {
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
            context: {
                user: testCMSUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
        })

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const childRateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        const unlockedContract = await unlockTestContract(
            cmsServer,
            submittedContract.id,
            'Unlock child rate contract'
        )

        expect(unlockedContract.status).toBe('UNLOCKED')
        expect(unlockedContract.draftRates).toHaveLength(1)
        expect(unlockedContract.draftRates?.[0].id).toBe(childRateID)
        expect(unlockedContract.draftRates?.[0].parentContractID).toBe(
            submittedContract.id
        )

        const reversedContract = await undoUnlockTestContract(
            cmsServer,
            submittedContract.id,
            'Reverse child rate unlock'
        )

        expect(reversedContract.status).toBe('SUBMITTED')
        expect(reversedContract.draftRevision).toBeNull()
        expect(reversedContract.draftRates).toBeNull()
        expect(reversedContract.packageSubmissions).toHaveLength(1)

        const fetchedChildRate = await fetchTestRateById(
            stateServer,
            childRateID
        )

        expect(fetchedChildRate.status).toBe('SUBMITTED')
        expect(fetchedChildRate.consolidatedStatus).toBe('SUBMITTED')
        expect(fetchedChildRate.parentContractID).toBe(submittedContract.id)
        expect(fetchedChildRate.packageSubmissions).toHaveLength(1)
        expect(
            fetchedChildRate.packageSubmissions?.[0]?.submitInfo.updatedReason
        ).toBe('Initial submission')
    })

    it('restores child rates after a second unlock and reverse-unlock cycle', async () => {
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
            context: {
                user: testCMSUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
        })

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const childRateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        await unlockTestContract(
            cmsServer,
            submittedContract.id,
            'First unlock of child rate contract'
        )

        await undoUnlockTestContract(
            cmsServer,
            submittedContract.id,
            'First reverse of child rate contract'
        )

        const unlockedAgain = await unlockTestContract(
            cmsServer,
            submittedContract.id,
            'Second unlock of child rate contract'
        )

        expect(unlockedAgain.status).toBe('UNLOCKED')
        expect(unlockedAgain.draftRates).toHaveLength(1)
        expect(unlockedAgain.draftRates?.[0].id).toBe(childRateID)
        expect(unlockedAgain.draftRates?.[0].parentContractID).toBe(
            submittedContract.id
        )

        const reversedAgain = await undoUnlockTestContract(
            cmsServer,
            submittedContract.id,
            'Second reverse of child rate contract'
        )

        expect(reversedAgain.status).toBe('SUBMITTED')
        expect(reversedAgain.consolidatedStatus).toBe('SUBMITTED')
        expect(reversedAgain.draftRevision).toBeNull()
        expect(reversedAgain.draftRates).toBeNull()
        expect(reversedAgain.packageSubmissions).toHaveLength(1)

        const fetchedChildRate = await fetchTestRateById(
            stateServer,
            childRateID
        )

        expect(fetchedChildRate.status).toBe('SUBMITTED')
        expect(fetchedChildRate.consolidatedStatus).toBe('SUBMITTED')
        expect(fetchedChildRate.draftRevision).toBeNull()
        expect(fetchedChildRate.parentContractID).toBe(submittedContract.id)
        expect(fetchedChildRate.packageSubmissions).toHaveLength(1)
        expect(
            fetchedChildRate.packageSubmissions?.[0]?.submitInfo.updatedReason
        ).toBe('Initial submission')
    })

    it('errors if contract is not UNLOCKED', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
        })

        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
            context: {
                user: testCMSUser(),
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const result = await executeGraphQLOperation(cmsServer, {
            query: UndoUnlockContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    updatedReason: 'Trying to undo unlock a submitted contract',
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(result.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(result.errors[0].message).toBe(
            'Attempted to undo unlock for contract with wrong status: SUBMITTED'
        )
    })

    it('forbids non-CMS users', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
        })

        const actingStateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
            context: {
                user: testStateUser(),
            },
        })

        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            emailer: mockEmailer,
            context: {
                user: testCMSUser(),
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        await unlockTestContract(cmsServer, contract.id, 'Unlocking for edits')

        const result = await executeGraphQLOperation(actingStateServer, {
            query: UndoUnlockContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    updatedReason: 'Trying as state user',
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(result.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(result.errors[0].message).toBe(
            'user not authorized to undo unlock a contract'
        )
    })
})
