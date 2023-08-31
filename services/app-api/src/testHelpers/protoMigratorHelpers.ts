import type { HealthPlanRevisionTable } from '@prisma/client'
import { unlockedWithALittleBitOfEverything } from 'app-web/src/common-code/healthPlanFormDataMocks'
import { toProtoBuffer } from 'app-web/src/common-code/proto/healthPlanFormDataProto'

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
