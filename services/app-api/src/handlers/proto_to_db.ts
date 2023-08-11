/* 
There are comments throughout this file, placed before where we call each migration function,
that try to explain my assumptions and strategies.  As I note below,
my confidence in the join table migration and document associations is lower than
for the other migrations.  I think they're worth discussing as a team.

In its current state, I think all the tables that we want to populate are being populated,
but there's a lot of work left on the ticket

1. What needs to be wrapped in transactions?
2. Are drafts vs submissions being handled correctly?
3. Are all the unnecessary duplicate insertions being prevented?
4. A review of error handling.  I was more focused on debugging.
5. Tests.  I've been testing this by running it locally and checking the database. Those
steps will be transmitted elsewhere.
*/

import type { Handler, APIGatewayProxyResultV2 } from 'aws-lambda'
import { initTracer, initMeter } from '../../../uploads/src/lib/otel'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import type { Store } from '../postgres'
import type { HealthPlanRevisionTable } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import type { StoreError } from '../postgres/storeError'
import { isStoreError } from '../postgres/storeError'
import { migrateContractRevision } from '../postgres/contractAndRates/proto_to_db_ContractRevisions'
import { migrateRateInfo } from '../postgres/contractAndRates/proto_to_db_RateRevisions'
import { insertContractId } from '../postgres/contractAndRates/proto_to_db_ContractId'
import { migrateAssociations } from '../postgres/contractAndRates/proto_to_db_JoinTable'
import { migrateDocuments } from '../postgres/contractAndRates/proto_to_db_Documents'
import { prepopulateUpdateInfo } from '../postgres/contractAndRates/proto_to_db_UpdateInfoTable'
import { toDomain } from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import type { HealthPlanFormDataType } from '../../../app-web/src/common-code/healthPlanFormDataType'
export const getDatabaseConnection = async (): Promise<{
    store: Store
    client: PrismaClient
}> => {
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
    const client = new PrismaClient()

    return { store, client }
}

export const getRevisions = async (
    store: Store
): Promise<HealthPlanRevisionTable[]> => {
    const result: HealthPlanRevisionTable[] | StoreError =
        await store.findAllRevisions()
    if (isStoreError(result)) {
        console.error(
            `Error getting revisions from db ${JSON.stringify(result)}`
        )
        throw new Error('Error getting records; cannot generate report')
    }

    return result
}

export const main: Handler = async (
    event,
    context
): Promise<APIGatewayProxyResultV2> => {
    const stageName = process.env.stage ?? 'stageNotSet'
    const serviceName = `proto_to_db_lambda-${stageName}`
    const otelCollectorURL = process.env.REACT_APP_OTEL_COLLECTOR_URL
    if (otelCollectorURL) {
        initTracer(serviceName, otelCollectorURL)
    } else {
        console.error(
            'Configuration Error: REACT_APP_OTEL_COLLECTOR_URL must be set'
        )
    }

    initMeter(serviceName)
    const { store, client } = await getDatabaseConnection()

    const revisions = await getRevisions(store)

    for (const revision of revisions) {
        const decodedFormDataProto = toDomain(revision.formDataProto)
        if (decodedFormDataProto instanceof Error) throw decodedFormDataProto
        const formData = decodedFormDataProto as HealthPlanFormDataType

        /* The order in which we call the helpers in this file matters */

        /* Creating an entry in either ContractRevisionTable or RateRevisionTable
        requires a valid 'submitInfoID' (or 'unlockInfoID') 
        that points to a record in the UpdateInfoTable */
        await prepopulateUpdateInfo(client, revision, formData)

        /* The field 'contractId' in the ContractRevisionTable matches the field 'id' in the ContractTable
        so the ContractTable has to be populated before the revisions can be inserted
        Note two things:
        1. This value is originally the pkgID in the HealthPlanRevisionTable
        2. So it's really acting as a foreign key that ties many of these tables together
        3. I think this is working as I expected, but if something goes very wrong
        somewhere along the line, look here first.  */
        try {
            await insertContractId(client, revision, formData)
        } catch (err) {
            if (err.code === 'P2002') {
                console.info(
                    `Contract ID ${revision.id} already exists, skipping insert`
                )
            } else {
                console.error(
                    `Error creating contract for ${revision.id}: ${err.message}`
                )
                continue
            }
        }

        try {
            const result = await migrateContractRevision(
                client,
                revision,
                formData
            )
            if (result instanceof Error) {
                console.error(
                    `Error inside new block ${revision.id}: ${result.message}`
                )
                continue
            }
        } catch (error) {
            console.error(
                `caught error in new block ${revision.id}: ${error.message}`
            )
            continue
        }

        /* Just as with the Contract and ContractRevision tables noted above, we take the
        original HealthPlanRevision 'pkgID' and tie the RateTable ('id') to the RateRevisionTable ('rateID') 
        (the contract stuff happens in two files; the rate stuff happens in one file; you'll probably want to change this) */
        const rateMigrationResults = await migrateRateInfo(
            client,
            revision,
            formData
        )
        for (const rateResult of rateMigrationResults) {
            if (rateResult instanceof Error) {
                console.error(
                    `Error migrating rate info for revision ${revision.id}: ${rateResult.message}`
                )
            }
        }

        /* My confidence in the join table and document strategies is lower than for the other tables.
        I think these are worth reviewing carefully as a team */
        await migrateAssociations(client)

        /* The ContractRevisionID and the RateRevisionID in the document tables
        are foreign keys to the id fields in their respective revision tables. 
        I'm not 100% sure that this is the correct approach.  */
        const documentMigrationResults = await migrateDocuments(
            client,
            revision,
            formData
        )
        for (const documentResult of documentMigrationResults) {
            if (documentResult instanceof Error) {
                console.error(
                    `Error migrating documents for revision ${revision.id}: ${documentResult.message}`
                )
            }
        }
    }

    const pkgID = revisions[0].pkgID
    if (!pkgID) {
        console.error('Package ID is missing in the revisions')
        throw new Error('Package ID is required')
    }
    console.info(`Package ID: ${pkgID}`)

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Lambda function executed successfully',
            packageId: pkgID,
        }),
    } as APIGatewayProxyResultV2
}
