/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyHandler } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import { Parser, transforms } from 'json2csv'
import { HealthPlanRevisionTable } from '@prisma/client'
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
    const result = await store.generateReports()
    const everythingWithUnwrappedProto = result.map((pkg: any) => {
        return {
            revisions: convertRevisions(pkg.revisions),
        }
    })
    const bucket: any = []
    everythingWithUnwrappedProto.forEach((pkg: any, index: number) => {
        bucket.push(pkg.revisions[0].formDataProto)
    })
    console.log('bucket', bucket)
    // console.log('everythingWithUnwrappedProto', everythingWithUnwrappedProto)
    let file = ''
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
    file = csv
    // .then((csv) => {
    //     file = csv
    //     console.log('JJJJ csv: ', file)
    // })
    // .catch((err) => {
    //     // console.log('JJJJ err: ', err)
    // })
    // console.log('JJ Handler Result: ', result)
    // const archive = Archiver('zip', {
    //     zlib: { level: 9 }, // Sets the compression level.
    // })
    // archive.append(file, { name: 'reports.zip' })

    // archive.finalize().catch((err) => {
    //     // console.log('Error finalizing data export zip file', err)
    // })
    console.log('FILE: ', file)
    return {
        statusCode: 200,
        contentType: 'application/zip',
        body: file,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
            'Content-Disposition': 'attachment; filename=reports.csv',
            'Content-Type': 'application/csv',
        },
    }
}
