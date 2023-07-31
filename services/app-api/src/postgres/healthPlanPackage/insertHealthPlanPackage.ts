import { PrismaClient } from '@prisma/client'
import { Buffer } from 'buffer'
import { v4 as uuidv4 } from 'uuid'
import {
    UnlockedHealthPlanFormDataType,
    SubmissionType,
    ContractType,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { HealthPlanPackageType } from '../../domain-models'
import { toProtoBuffer } from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from '../storeError'
import { convertToHealthPlanPackageType } from './healthPlanPackageHelpers'
import { PopulationCoveredType } from '../../gen/gqlServer'

export type InsertHealthPlanPackageArgsType = {
    stateCode: string
    populationCovered: PopulationCoveredType
    programIDs: string[]
    riskBasedContract?: boolean
    submissionType: SubmissionType
    submissionDescription: string
    contractType: ContractType
}

// By using Prisma's "increment" syntax here, we ensure that we are atomically increasing
// the state number every time we call this function.
async function incrementAndGetStateNumber(
    client: PrismaClient,
    stateCode: string
): Promise<number | StoreError> {
    try {
        const stateNumberResult = await client.state.update({
            data: {
                latestStateSubmissionNumber: {
                    increment: 1,
                },
            },
            where: {
                stateCode: stateCode,
            },
        })

        return stateNumberResult.latestStateSubmissionNumber
    } catch (e) {
        return convertPrismaErrorToStoreError(e)
    }
}

export async function insertHealthPlanPackage(
    client: PrismaClient,
    args: InsertHealthPlanPackageArgsType
): Promise<HealthPlanPackageType | StoreError> {
    const stateNumberResult = await incrementAndGetStateNumber(
        client,
        args.stateCode
    )

    if (isStoreError(stateNumberResult)) {
        console.info('Error: Getting New State Number', stateNumberResult)
        return stateNumberResult
    }

    const stateNumber: number = stateNumberResult

    // construct a new Draft Submission
    const draft: UnlockedHealthPlanFormDataType = {
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        stateNumber,
        status: 'DRAFT',
        populationCovered: args.populationCovered,
        submissionType: args.submissionType,
        riskBasedContract: args.riskBasedContract,
        programIDs: args.programIDs,
        submissionDescription: args.submissionDescription,
        stateCode: args.stateCode,
        contractType: args.contractType,
        rateInfos: [],
        documents: [],
        contractDocuments: [],
        stateContacts: [],
        addtlActuaryContacts: [],
        managedCareEntities: [],
        federalAuthorities: [],
    }
    const protobuf = toProtoBuffer(draft)

    const buffer = Buffer.from(protobuf)

    try {
        const pkg = await client.healthPlanPackageTable.create({
            data: {
                id: draft.id,
                stateCode: draft.stateCode,
                revisions: {
                    create: {
                        id: uuidv4(),
                        createdAt: new Date(),
                        formDataProto: buffer,
                    },
                },
            },
            include: {
                revisions: {
                    orderBy: {
                        createdAt: 'desc', // We expect our revisions most-recent-first
                    },
                },
            },
        })

        return convertToHealthPlanPackageType(pkg)
    } catch (e: unknown) {
        console.info('ERROR: inserting into to the database: ', e)

        return convertPrismaErrorToStoreError(e)
    }
}
