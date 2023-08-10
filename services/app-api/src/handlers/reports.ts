import type { APIGatewayProxyHandler } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import { Parser, transforms } from 'json2csv'
import type { HealthPlanRevisionTable } from '@prisma/client'
import type { ProgramArgType } from '../../../app-web/src/common-code/healthPlanFormDataType/State'
import type {
    HealthPlanFormDataType,
    RateInfoType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import { packageName } from '../../../app-web/src/common-code/healthPlanFormDataType'
import { toDomain } from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import statePrograms from '../../../app-web/src/common-code/data/statePrograms.json'
import type { StoreError } from '../postgres/storeError'
import { isStoreError } from '../postgres/storeError'
import type { HealthPlanPackageStatusType } from '../domain-models'
import {
    userFromCognitoAuthProvider,
    userFromLocalAuthProvider,
} from '../authn'
import {
    initTracer,
    initMeter,
    recordException,
} from '../../../uploads/src/lib/otel'

type RequiredRevisionWithDecodedProtobufProperties = {
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
    derivedStatus?: HealthPlanPackageStatusType
    packageName?: string
}

/* We want to show the rateInfos array with each field in its own column,
so we attach each RateInfoType to the revision object and let the CSV parser
take it from there.  This is the typing for supporting 
rateInfo0: RateInfoType,
rateInfo1: RateInfoType, 
etc. */
type RevisionWithDecodedProtobuf =
    RequiredRevisionWithDecodedProtobufProperties & {
        [key: string]: RateInfoType
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
    return allRevisions
}

export const main: APIGatewayProxyHandler = async (event, context) => {
    const authProvider =
        event.requestContext.identity.cognitoAuthenticationProvider ?? ''
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
    const authMode = process.env.REACT_APP_AUTH_MODE

    // reject the request if it's not from a CMS or ADMIN user
    const userFetcher =
        authMode === 'LOCAL'
            ? userFromLocalAuthProvider
            : userFromCognitoAuthProvider
    const userResult = await userFetcher(authProvider, store)
    if (userResult.isErr()) {
        console.error('Error getting user from auth provider')
        throw new Error('Error getting user from auth provider')
    }
    if (
        userResult.value.role !== 'CMS_USER' &&
        userResult.value.role !== 'ADMIN_USER'
    ) {
        console.error('User is not authorized to run reports')
        throw new Error('User is not authorized to run reports')
    }
    console.info('User is authorized to run reports')

    const result: HealthPlanRevisionTable[] | StoreError =
        await store.findAllRevisions()
    if (isStoreError(result)) {
        console.error('Error getting revisions from db')
        throw new Error('Error getting records; cannot generate report')
    }
    const allDecodedRevisions: RevisionWithDecodedProtobuf[] = decodeRevisions(
        result,
        programList
    )
    const stageName = process.env.stage ?? 'stageNotSet'
    const serviceName = `reports_endpoint-${stageName}`
    const otelCollectorURL = process.env.REACT_APP_OTEL_COLLECTOR_URL
    if (otelCollectorURL) {
        initTracer(serviceName, otelCollectorURL)
    } else {
        console.error(
            'Configuration Error: REACT_APP_OTEL_COLLECTOR_URL must be set'
        )
    }
    initMeter(serviceName)
    const bucket = [] as RevisionWithDecodedProtobuf[]
    for (const revision of allDecodedRevisions) {
        if (revision.formDataProto instanceof Error) {
            console.error('Error decoding revision', revision.id)
            recordException(
                revision.formDataProto,
                serviceName,
                'decode_revision'
            )
        } else {
            // add the package name to the revision
            revision.packageName = packageName(
                revision.formDataProto,
                programList
            )
            // add the rateInfo fields to the revision
            revision.formDataProto.rateInfos.forEach((rateInfo, index) => {
                revision['rateInfo' + index] = rateInfo
            })
            revision.formDataProto.rateInfos = []
            /* both saved/unsubmitted and submitted/unlocked revisions have a DRAFT status
            we only want the unlocked revisions */
            if (
                revision.formDataProto.status !== 'DRAFT' ||
                revision.unlockedReason !== null
            ) {
                bucket.push(revision)
            }
        }
    }
    const parser = new Parser({
        transforms: [
            transforms.flatten({
                objects: true,
                arrays: false,
                separator: ',',
            }),
        ],
    })
    const csv = parser.parse(bucket)

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
