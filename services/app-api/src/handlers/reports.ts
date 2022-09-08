import { APIGatewayProxyHandler } from 'aws-lambda'
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
        const names = programList
            .filter(
                (p) =>
                    !(decodedFormDataProto instanceof Error) &&
                    decodedFormDataProto.programIDs.includes(p.id)
            )
            .map((p) => p.name)
        decodedRevision.programNames = names
        decodedRevision = Object.assign(revision, decodedRevision)
        allRevisions.push(decodedRevision)
    })
    console.info('decodedRevision: ', allRevisions[0])
    return allRevisions
}

export const main: APIGatewayProxyHandler = async () => {
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
    } else {
        console.info('Postgres configured in data exporter')
    }

    const store = NewPostgresStore(pgResult)
    const result: HealthPlanRevisionTable[] | StoreError =
        await store.getAllRevisions()
    if (isStoreError(result)) {
        console.error('Error getting revisions from db')
        throw new Error('Error getting records; cannot generate report')
    } else {
        console.info('Revisions retrieved from db', result[0])
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

    console.info('bucket: ', bucket[0])

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
    console.info('csv: ', csv.substring(0, 10))

    return {
        statusCode: 200,
        body: csv,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
            'Content-Disposition': 'attachment',
            'Content-Type': 'text/csv',
        },
    }
}
