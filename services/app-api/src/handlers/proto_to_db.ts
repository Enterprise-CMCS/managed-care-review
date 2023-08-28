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
import { initTracer } from '../../../uploads/src/lib/otel'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import type { Store } from '../postgres'
import type { HealthPlanRevisionTable } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import type { ContractTable, ContractRevisionTable } from '@prisma/client'
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

export const getDatabaseConnection = async (): Promise<Store> => {
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
    //const client = new PrismaClient()

    return store
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

export async function migrateRevision(
    client: PrismaClient,
    revision: HealthPlanRevisionTable
): Promise<undefined | Error> {
    /* The order in which we call the helpers in this file matters */
    console.info(`Migration of revision ${revision.id} started...`)

    // decode the proto
    const decodedFormDataProto = toDomain(revision.formDataProto)
    if (decodedFormDataProto instanceof Error) {
        const error = new Error(
            `Error in toDomain for ${revision.id}: ${decodedFormDataProto.message}`
        )
        return error
    }
    const formData = decodedFormDataProto as HealthPlanFormDataType

    /* Creating an entry in either ContractRevisionTable or RateRevisionTable
        requires a valid 'submitInfoID' (or 'unlockInfoID') 
        that points to a record in the UpdateInfoTable */
    const updateInfoResult = await prepopulateUpdateInfo(
        client,
        revision,
        formData
    )
    if (updateInfoResult instanceof Error) {
        const error = new Error(
            `Error pre-populating UpdateInfoTable for ${revision.id}: ${updateInfoResult.message}`
        )
        return error
    }

    // migrate the contract part
    const migrateContractResult = await migrateContract(
        client,
        revision,
        formData
    )
    if (migrateContractResult instanceof Error) {
        return migrateContractResult
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
            const error = new Error(
                `Error migrating rate info for revision ${revision.id}: ${rateResult.message}`
            )
            return error
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
            const error = new Error(
                `Error migrating documents for revision ${revision.id}: ${documentResult.message}`
            )
            return error
        }
    }
}

type ContractMigrationResult =
    | {
          contract: ContractTable
          contractRevision: ContractRevisionTable
      }
    | Error

async function migrateContract(
    client: PrismaClient,
    revision: HealthPlanRevisionTable,
    formData: HealthPlanFormDataType
): Promise<ContractMigrationResult> {
    /* The field 'contractId' in the ContractRevisionTable matches the field 'id' in the ContractTable
        so the ContractTable has to be populated before the revisions can be inserted
        Note two things:
        1. This value is originally the pkgID in the HealthPlanRevisionTable
        2. So it's really acting as a foreign key that ties many of these tables together
        3. I think this is working as I expected, but if something goes very wrong
        somewhere along the line, look here first.  */
    const insertContractResult = await insertContractId(
        client,
        revision,
        formData
    )
    if (insertContractResult instanceof Error) {
        const error = new Error(
            `Error creating contract for ${revision.id}: ${insertContractResult.message}`
        )
        return error
    }

    const migrateContractResult = await migrateContractRevision(
        client,
        revision,
        formData
    )
    if (migrateContractResult instanceof Error) {
        const error = new Error(
            `Error in migrateContractRevision for ${revision.id}: ${migrateContractResult.message}`
        )
        return error
    }

    return {
        contract: insertContractResult,
        contractRevision: migrateContractResult,
    }
}

export const main: Handler = async (): Promise<APIGatewayProxyResultV2> => {
    // setup otel tracing
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

    // setup db connections and get revisions
    const store = await getDatabaseConnection()
    const client = new PrismaClient()
    const revisions = await getRevisions(store)

    // go through the list of revisons and migrate
    for (const revision of revisions) {
        const migrateResult = await migrateRevision(client, revision)
        // TODO not sure what we want to do with errors just yet
        if (migrateResult instanceof Error) {
            console.error(migrateResult)
        }
    }

    // notes after maz: not sure why this is here and not before we try to migrate?
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
