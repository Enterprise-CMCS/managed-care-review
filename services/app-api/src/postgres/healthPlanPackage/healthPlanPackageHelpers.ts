import type {
    HealthPlanPackageTable,
    HealthPlanRevisionTable,
} from '@prisma/client'
import type {
    HealthPlanPackageType,
    Question,
    UpdateInfoType,
} from '../../domain-models'
import type { StoreError } from '../storeError'

export type HealthPlanPackageWithRevisionsTable = HealthPlanPackageTable & {
    revisions: HealthPlanRevisionTable[]
    questions?: Question[]
}

// getCurrentRevision returns the first revision associated with a package
const getCurrentRevision = (
    pkgID: string,
    pkg: HealthPlanPackageWithRevisionsTable | null
): HealthPlanRevisionTable | StoreError => {
    if (!pkg)
        return {
            code: 'UNEXPECTED_EXCEPTION' as const,
            message: `No package found for id: ${pkgID}`,
        }

    if (!pkg.revisions || pkg.revisions.length < 1)
        return {
            code: 'UNEXPECTED_EXCEPTION' as const,
            message: `No revisions found for package id: ${pkgID}`,
        }

    // run through the list of revisions, get the newest one.
    // If we ORDERED BY before getting these, we could probably simplify this.
    const newestRev = pkg.revisions.reduce((acc, revision) => {
        if (revision.createdAt > acc.createdAt) {
            return revision
        } else {
            return acc
        }
    }, pkg.revisions[0])

    return newestRev
}

// convertToHealthPlanPackageType transforms the DB representation of StateSubmissionWithRevisions into our HealthPlanPackageType
function convertToHealthPlanPackageType(
    dbPkg: HealthPlanPackageWithRevisionsTable
): HealthPlanPackageType {
    return {
        id: dbPkg.id,
        stateCode: dbPkg.stateCode,
        revisions: dbPkg.revisions.map((r) => {
            let submitInfo: UpdateInfoType | undefined = undefined
            if (r.submittedAt && r.submittedReason && r.submittedBy) {
                submitInfo = {
                    updatedAt: r.submittedAt,
                    updatedReason: r.submittedReason,
                    updatedBy: r.submittedBy,
                }
            }

            let unlockInfo: UpdateInfoType | undefined = undefined
            if (r.unlockedAt && r.unlockedBy && r.unlockedReason) {
                unlockInfo = {
                    updatedAt: r.unlockedAt,
                    updatedBy: r.unlockedBy,
                    updatedReason: r.unlockedReason,
                }
            }

            return {
                id: r.id,
                unlockInfo,
                submitInfo,
                createdAt: r.createdAt,
                formDataProto: r.formDataProto,
            }
        }),
    }
}

export { getCurrentRevision, convertToHealthPlanPackageType }
