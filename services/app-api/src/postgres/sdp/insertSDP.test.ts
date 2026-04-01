import { Prisma } from '../../generated/client'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { getStateRecord, must } from '../../testHelpers'
import { insertDraftSDP } from './insertSDP'

async function ensureSDPTablesExist(
    client: Awaited<ReturnType<typeof sharedTestPrismaClient>>
) {
    await client.$executeRawUnsafe(`
        DO $$ BEGIN
            CREATE TYPE "SDPSubmissionType" AS ENUM (
                'NEW_STATE_DIRECTED_PAYMENT_PREPRINT',
                'AMENDMENT_TO_AN_APPROVED_PREPRINT',
                'RENEWAL_FOR_NEW_RATING_PERIOD'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    `)

    await client.$executeRawUnsafe(`
        DO $$ BEGIN
            CREATE TYPE "SDPChangeType" AS ENUM (
                'RATING_PERIOD',
                'PAYMENT_TYPE',
                'PROVIDER_TYPE',
                'QUALITY_METRICS_OR_BENCHMARKS',
                'OTHER'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    `)

    await client.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SDPTable" (
            "id" TEXT PRIMARY KEY,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "mccrsID" TEXT,
            "status" TEXT NOT NULL DEFAULT 'DRAFT',
            "stateCode" TEXT NOT NULL,
            "stateNumber" INTEGER NOT NULL,
            CONSTRAINT "SDPTable_stateCode_fkey"
                FOREIGN KEY ("stateCode") REFERENCES "State"("stateCode")
                ON DELETE RESTRICT ON UPDATE CASCADE
        );
    `)

    await client.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SDPRevisionTable" (
            "id" TEXT PRIMARY KEY,
            "sdpID" TEXT NOT NULL,
            "unlockInfoID" TEXT,
            "submissionType" "SDPSubmissionType" NOT NULL,
            "programIDs" TEXT[] NOT NULL,
            "changesIncluded" "SDPChangeType"[] NOT NULL,
            "ratingPeriodStart" DATE NOT NULL,
            "ratingPeriodEnd" DATE NOT NULL,
            "estimatedFederalShare" TEXT,
            "estimatedStateShare" TEXT,
            "automaticallyRenewed" BOOLEAN NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "SDPRevisionTable_sdpID_fkey"
                FOREIGN KEY ("sdpID") REFERENCES "SDPTable"("id")
                ON DELETE RESTRICT ON UPDATE CASCADE
        );
    `)
}

describe('insertSDP', () => {
    it('creates a new draft SDP and first revision in postgres', async () => {
        const client = await sharedTestPrismaClient()
        await ensureSDPTablesExist(client)
        const stateCode = 'FL'
        const initialState = await getStateRecord(client, stateCode)

        const draftSDP = must(
            await insertDraftSDP(client, {
                stateCode,
                submissionType: 'NEW_STATE_DIRECTED_PAYMENT_PREPRINT',
                programIDs: [
                    '5c10fe9f-bec9-416f-a20c-718b152ad633',
                    '037af66b-81eb-4472-8b80-01edf17d12d9',
                ],
                changesIncluded: ['RATING_PERIOD', 'PAYMENT_TYPE'],
                ratingPeriodStart: new Date('2026-01-01'),
                ratingPeriodEnd: new Date('2026-12-31'),
                estimatedFederalShare: '$100',
                estimatedStateShare: '$50',
                automaticallyRenewed: false,
                stateContacts: [],
            })
        )

        expect(draftSDP.draftRevision).toBeDefined()
        expect(draftSDP.revisions).toHaveLength(1)
        expect(draftSDP.stateCode).toBe(stateCode)
        expect(draftSDP.draftRevision?.formData).toEqual(
            expect.objectContaining({
                submissionType: 'NEW_STATE_DIRECTED_PAYMENT_PREPRINT',
                programIDs: [
                    '5c10fe9f-bec9-416f-a20c-718b152ad633',
                    '037af66b-81eb-4472-8b80-01edf17d12d9',
                ],
                changesIncluded: ['RATING_PERIOD', 'PAYMENT_TYPE'],
                estimatedFederalShare: '$100',
                estimatedStateShare: '$50',
                automaticallyRenewed: false,
            })
        )

        const sdpRows = await client.$queryRaw<
            Array<{ id: string; stateCode: string; stateNumber: number }>
        >(
            Prisma.sql`
                SELECT "id", "stateCode", "stateNumber"
                FROM "SDPTable"
                WHERE "id" = ${draftSDP.id}
            `
        )
        const revisionRows = await client.$queryRaw<
            Array<{
                id: string
                sdpID: string
                submissionType: string
                automaticallyRenewed: boolean
            }>
        >(
            Prisma.sql`
                SELECT "id", "sdpID", "submissionType", "automaticallyRenewed"
                FROM "SDPRevisionTable"
                WHERE "sdpID" = ${draftSDP.id}
            `
        )

        expect(sdpRows).toEqual([
            expect.objectContaining({
                id: draftSDP.id,
                stateCode,
                stateNumber: initialState.latestStateSubmissionNumber + 1,
            }),
        ])
        expect(revisionRows).toEqual([
            expect.objectContaining({
                sdpID: draftSDP.id,
                submissionType: 'NEW_STATE_DIRECTED_PAYMENT_PREPRINT',
                automaticallyRenewed: false,
            }),
        ])
    })
})
