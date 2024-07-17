import type { HealthPlanRevisionTable } from '@prisma/client'
import { unlockedWithALittleBitOfEverything } from '../common-code/healthPlanFormDataMocks'
import { toProtoBuffer } from '../common-code/proto/healthPlanFormDataProto'
import type { SubmissionDocument } from '../common-code/healthPlanFormDataType'
import { v4 as uuidv4 } from 'uuid'

export function createMockRevision(id = 'mockId'): HealthPlanRevisionTable {
    return {
        id,
        createdAt: new Date(),
        pkgID: 'mockPkgID',
        formDataProto: Buffer.from(
            toProtoBuffer({
                ...unlockedWithALittleBitOfEverything(),
                id,
            })
        ),
        submittedAt: new Date(),
        unlockedAt: new Date(),
        unlockedBy: 'mockUnlockedBy',
        unlockedReason: 'mockUnlockedReason',
        submittedBy: 'mockSubmittedBy',
        submittedReason: 'mockSubmittedReason',
    }
}

export function createMockRevisionsWithDocuments(
    documents: SubmissionDocument[],
    id = 'mockId'
): HealthPlanRevisionTable {
    return {
        id,
        createdAt: new Date(),
        pkgID: uuidv4(),
        formDataProto: Buffer.from(
            toProtoBuffer({
                ...unlockedWithALittleBitOfEverything(),
                documents,
            })
        ),
        submittedAt: new Date(),
        unlockedAt: new Date(),
        unlockedBy: 'mockUnlockedBy',
        unlockedReason: 'mockUnlockedReason',
        submittedBy: 'mockSubmittedBy',
        submittedReason: 'mockSubmittedReason',
    }
}
