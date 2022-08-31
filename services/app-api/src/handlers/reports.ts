/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyHandler } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import { Parser, transforms } from 'json2csv'
import { HealthPlanRevisionTable } from '@prisma/client'
import { ProgramArgType } from '../../../app-web/src/common-code/healthPlanFormDataType/State'
// import { PackagesAndRevisions } from '../postgres/generateReports'
import {
    base64ToDomain,
    protoToBase64,
} from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import statePrograms from '../data/statePrograms.json'

const decodeRevisions = (revisions: HealthPlanRevisionTable[]) => {
    return revisions.map((revision) => {
        return {
            ...revision,
            formDataProto: base64ToDomain(
                protoToBase64(revision.formDataProto)
            ),
        }
    })
}

const decorateRevisionsWithProgramNames = (revisions: any) => {
    const programList = [] as ProgramArgType[]
    statePrograms.states.forEach((state) => {
        programList.push(...state.programs)
    })
    revisions.forEach((revision: any) => {
        const names = programList
            .filter((p) => revision.formDataProto.programIDs.includes(p.id))
            .map((p) => p.name)
        console.log('names: ', names)
        revision.programNames = names
    })
    return revisions
}

export const main: APIGatewayProxyHandler = async () => {
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required to run app-api')
    }

    const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
    if (pgResult instanceof Error) {
        console.error(
            "Init Error: Postgres couldn't be configured in data exporter"
        )
        throw pgResult
    }

    const store = NewPostgresStore(pgResult)
    const result: HealthPlanRevisionTable[] = await store.generateReports()
    const decodedRevisions = decodeRevisions(result)
    const allUnwrappedRevisions =
        decorateRevisionsWithProgramNames(decodedRevisions)
    console.log('result:', result)
    // const allUnwrappedPackages = result.map((revision) => {
    //     // console.log('package: ', pkg)
    //     const decodedRevisions = decodeRevisions(revision)
    //     const revisions = decorateRevisionsWithProgramNames(decodedRevisions)
    //     return {
    //         revisions,
    //     }
    // })
    const bucket = [] as any[]

    allUnwrappedRevisions.forEach((revision: any) => {
        // pkg.revisions.forEach((revision: any) => {
        if (revision.formDataProto instanceof Error) {
            throw new Error(`Error generating reports array`)
        } else {
            // console.log('revision', revision)
            bucket.push(revision)
        }
        // })
    })

    // console.log('bucket', bucket)
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

    // const archive = Archiver('zip', {
    //     zlib: { level: 9 }, // Sets the compression level.
    // })
    // archive.append(file, { name: 'reports.zip' })

    // archive.finalize().catch((err) => {
    //     // console.log('Error finalizing data export zip file', err)
    // })
    // console.log('FILE: ', csv)
    return {
        statusCode: 200,
        contentType: 'application/octet-stream',
        body: csv,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
            'Content-Disposition': 'attachment',
            'Content-Type': 'application/octet-stream',
        },
    }
}
