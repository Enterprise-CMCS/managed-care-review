import { APIGatewayProxyHandler } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import { Parser, transforms } from 'json2csv'
import { HealthPlanRevisionTable } from '@prisma/client'
import { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'
import { PackagesAndRevisions } from '../postgres/generateReports'
import {
    base64ToDomain,
    protoToBase64,
} from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'

const convertRevisions = (revisions: HealthPlanRevisionTable[]) => {
    return revisions.map((revision) => {
        return {
            formDataProto: base64ToDomain(
                protoToBase64(revision.formDataProto)
            ),
        }
    })
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
    const result: PackagesAndRevisions = await store.generateReports()
    const allUnwrappedProtos = result.map((pkg) => {
        console.log('package: ', pkg)
        return {
            revisions: convertRevisions(pkg.revisions),
        }
    })
    const bucket = [] as HealthPlanFormDataType[]

    allUnwrappedProtos.forEach((pkg) => {
        pkg.revisions.forEach((revision) => {
            if (revision.formDataProto instanceof Error) {
                throw new Error(`Error generating reports array`)
            } else {
                console.log('revision', revision)
                bucket.push(revision.formDataProto)
            }
        })
    })

    console.log('bucket', bucket)
    const parser = new Parser({
        transforms: [
            transforms.flatten({
                objects: true,
                arrays: true,
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
