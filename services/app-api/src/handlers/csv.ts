import { Handler } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import { Parser, transforms } from 'json2csv'
import { HealthPlanRevisionTable } from '@prisma/client'
import { ProgramArgType } from '../../../app-web/src/common-code/healthPlanFormDataType/State'
import { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'
import { toDomain } from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import statePrograms from '../data/statePrograms.json'
import { isStoreError, StoreError } from '../postgres/storeError'

type RevisionWithDecodedProtobuf = {
    formDataProto: HealthPlanFormDataType | Error
    id: string
    createdAt: Date
    pkgID: string
    submittedAt: Date | null
    unlockedAt: Date | null
    unlockedBy: string | null
    unlockedReason: string | null
    submittedBy: string | null
    submittedReason: string | null
    programNames?: string[]
}

/* formProtoData is an encoded protocal buffer in the db,
so we decode it and put it back on the revision as readable data */
const decodeRevisions = (
    revisions: HealthPlanRevisionTable[],
    programList: ProgramArgType[]
): RevisionWithDecodedProtobuf[] => {
    const allRevisions = [] as RevisionWithDecodedProtobuf[]
    revisions.forEach((revision) => {
        let decodedRevision = {} as RevisionWithDecodedProtobuf
        const decodedFormDataProto = toDomain(revision.formDataProto)
        decodedRevision.formDataProto = decodedFormDataProto
        /* We only store the program IDs in the db,
        so we look up the program names and add them to the revision */
        const listOfProgramNames = programList
            .filter(
                (p) =>
                    !(decodedFormDataProto instanceof Error) &&
                    decodedFormDataProto.programIDs.includes(p.id)
            )
            .map((p) => p.name)
        decodedRevision.programNames = listOfProgramNames
        decodedRevision = Object.assign(revision, decodedRevision)
        allRevisions.push(decodedRevision)
    })
    return allRevisions
}

export const main: Handler = async () => {
    const programList = [] as ProgramArgType[]
    statePrograms.states.forEach((state) => {
        programList.push(...state.programs)
    })
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    if (!dbURL) {
        console.error('DATABASE_URL not set')
        throw new Error('Init Error: DATABASE_URL is required to run app-api')
    }
    if (!secretsManagerSecret) {
        console.error('SECRETS_MANAGER_SECRET not set')
    }

    const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
    if (pgResult instanceof Error) {
        console.error(
            "Init Error: Postgres couldn't be configured in data exporter"
        )
        throw pgResult
    }

    const store = NewPostgresStore(pgResult)
    const result: HealthPlanRevisionTable[] | StoreError =
        await store.getAllRevisions()
    if (isStoreError(result)) {
        console.error('Error getting revisions from db')
        throw new Error('Error getting records; cannot generate report')
    }
    const allDecodedRevisions: RevisionWithDecodedProtobuf[] = decodeRevisions(
        result,
        programList
    )

    const bucket = [] as RevisionWithDecodedProtobuf[]
    allDecodedRevisions.forEach((revision) => {
        if (revision.formDataProto instanceof Error) {
            console.error('Error decoding revision')
            throw new Error(`Error generating reports array`)
        } else {
            bucket.push(revision)
        }
    })

    const parser = new Parser({
        transforms: [
            transforms.flatten({
                objects: true,
                arrays: false,
                separator: ',',
            }),
        ],
    })
    const csv = await parser.parse(bucket)
    const verification = csv.substring(0, 5)
    console.log(`JJ RUNNING SCHEDULED HANDLER ${verification}`)
    return {
        statusCode: 200,
        body: 'scheduled handler ran',
    }
}
