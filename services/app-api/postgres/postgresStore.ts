import { PrismaClient } from '@prisma/client'
import {
    UnlockedHealthPlanFormDataType,
    ProgramT,
    HealthPlanPackageType,
    UpdateInfoType,
    HealthPlanFormDataType,
} from '../../app-web/src/common-code/domain-models'
import { findPrograms } from '../postgres'
import { findAllHealthPlanPackages } from './findAllHealthPlanPackages'
import { findHealthPlanPackage } from './findHealthPlanPackage'
import {
    insertHealthPlanPackage,
    InsertHealthPlanPackageArgsType,
} from './insertHealthPlanPackage'
import { insertHealthPlanRevision } from './insertHealthPlanRevision'
import { StoreError } from './storeError'
import { updateHealthPlanRevision } from './updateHealthPlanRevision'

type Store = {
    findPrograms: (
        stateCode: string,
        programIDs: Array<string>
    ) => ProgramT[] | undefined

    findHealthPlanPackage: (
        draftUUID: string
    ) => Promise<HealthPlanPackageType | undefined | StoreError>

    findAllHealthPlanPackages: (
        stateCode: string
    ) => Promise<HealthPlanPackageType[] | StoreError>

    insertHealthPlanPackage: (
        args: InsertHealthPlanPackageArgsType
    ) => Promise<HealthPlanPackageType | StoreError>

    updateHealthPlanRevision: (
        submissionID: string,
        revisionID: string,
        formData: HealthPlanFormDataType,
        submitInfo?: UpdateInfoType
    ) => Promise<HealthPlanPackageType | StoreError>

    insertHealthPlanRevision: (
        submissionID: string,
        unlockInfo: UpdateInfoType,
        draft: UnlockedHealthPlanFormDataType
    ) => Promise<HealthPlanPackageType | StoreError>
}

function NewPostgresStore(client: PrismaClient): Store {
    return {
        insertHealthPlanPackage: (args) =>
            insertHealthPlanPackage(client, args),
        findHealthPlanPackage: (id) => findHealthPlanPackage(client, id),
        findAllHealthPlanPackages: (stateCode) =>
            findAllHealthPlanPackages(client, stateCode),
        updateHealthPlanRevision: (
            submissionID,
            revisionID,
            formData,
            submitInfo
        ) =>
            updateHealthPlanRevision(
                client,
                submissionID,
                revisionID,
                formData,
                submitInfo
            ),
        insertHealthPlanRevision: (submissionID, unlockInfo, draft) =>
            insertHealthPlanRevision(client, {
                submissionID,
                unlockInfo,
                draft,
            }),
        findPrograms: findPrograms,
    }
}

export { NewPostgresStore, Store }
