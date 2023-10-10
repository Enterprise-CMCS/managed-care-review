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
import { initTracer, recordException } from '../../../uploads/src/lib/otel'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import type { Store } from '../postgres'
import type { HealthPlanRevisionTable } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import type { ContractTable, ContractRevisionTable } from '@prisma/client'
import type { StoreError } from '../postgres/storeError'
import { isStoreError } from '../postgres/storeError'
import { migrateContractRevision } from '../postgres/contractAndRates/proto_to_db_ContractRevisions'
import { migrateRateInfo } from '../postgres/contractAndRates/proto_to_db_RateRevisions'
import { insertContractId } from '../postgres/contractAndRates/proto_to_db_ContractId'
import { cleanupLastMigration } from '../postgres/contractAndRates/proto_to_db_CleanupLastMigration'
import { toDomain } from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import type { HealthPlanFormDataType } from '../../../app-web/src/common-code/healthPlanFormDataType'

export const getDatabaseConnection = async (): Promise<{
    store: Store
    prismaClient: PrismaClient
}> => {
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET

    if (!dbURL) {
        console.error('DATABASE_URL not set')
        throw new Error(
            'Init Error: DATABASE_URL is required to run migrations'
        )
    }
    if (!secretsManagerSecret) {
        console.error('SECRETS_MANAGER_SECRET not set')
        throw new Error(
            'Init Error: SECRETS_MANAGER_SECRET is required to run migrations'
        )
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

    return { store, prismaClient: pgResult }
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

export function decodeFormDataProto(
    revision: HealthPlanRevisionTable
): HealthPlanFormDataType | Error {
    // decode the proto
    const decodedFormDataProto = toDomain(revision.formDataProto)
    if (decodedFormDataProto instanceof Error) {
        const error = new Error(
            `Error in toDomain for ${revision.id}: ${decodedFormDataProto.message}`
        )
        return error
    }
    return decodedFormDataProto as HealthPlanFormDataType
}

export type MigrateRevisionResult = {
    contract: ContractTable
    rateInvocation: MigrateRatesInvocation
}

interface MigrateRatesInvocation {
    revision: HealthPlanRevisionTable
    formData: HealthPlanFormDataType
    contractRevision: ContractRevisionTable
}

async function migrateRevision(
    client: PrismaClient,
    revision: HealthPlanRevisionTable
): Promise<MigrateRevisionResult | Error> {
    /* The order in which we call the helpers in this file matters */
    const formData = decodeFormDataProto(revision)
    if (formData instanceof Error) {
        return formData
    }

    // migrate the contract part
    const migrateContractResult = await migrateContract(
        client,
        revision,
        formData
    )
    if (migrateContractResult instanceof Error) {
        console.error(migrateContractResult)
        return migrateContractResult
    }

    const rateInvocation: MigrateRatesInvocation = {
        revision,
        formData,
        contractRevision: migrateContractResult.contractRevision,
    }

    return {
        contract: migrateContractResult.contract,
        rateInvocation,
    }
}

type ContractMigrationResult =
    | {
          contract: ContractTable
          contractRevision: ContractRevisionTable
      }
    | Error

export async function migrateContract(
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
        formData,
        insertContractResult
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

// cleanupPreviousProtoMigrate resets us back to the state prior to running this migration
export async function cleanupPreviousProtoMigrate(
    client: PrismaClient
): Promise<void | Error> {
    const cleanResult = await cleanupLastMigration(client)
    if (cleanResult instanceof Error) {
        console.error(cleanResult)
        return cleanResult
    }
    return
}

// We must migrate the contracts over and then the rates.
export async function migrateHealthPlanRevisions(
    client: PrismaClient,
    revisions: HealthPlanRevisionTable[]
): Promise<Error[]> {
    const revisionsErrors: Error[] = []

    const rateInvocations: MigrateRatesInvocation[] = []

    // We have to migrate the rates after the contracts b/c of the links
    for (const revision of revisions) {
        console.info(`Migrating Contract HealthPlanRevision ${revision.id}`)
        const migrateResult = await migrateRevision(client, revision)
        if (migrateResult instanceof Error) {
            revisionsErrors.push(migrateResult)
            console.error(migrateResult)
            continue
        }

        rateInvocations.push(migrateResult.rateInvocation)

        console.info(
            `Migrated Contract HealthPlanRevision ${revision.id} successfully...`
        )
    }

    for (const rateInvocation of rateInvocations) {
        /* Just as with the Contract and ContractRevision tables noted above, we take the
        original HealthPlanRevision 'pkgID' and tie the RateTable ('id') to the RateRevisionTable ('rateID') 
        (the contract stuff happens in two files; the rate stuff happens in one file; you'll probably want to change this) */
        console.info(
            `Migrating Rates HealthPlanRevision ${rateInvocation.revision.id}`
        )
        const ratesResult = await migrateRateInfo(
            client,
            rateInvocation.revision,
            rateInvocation.formData,
            rateInvocation.contractRevision
        )
        if (ratesResult instanceof Error) {
            revisionsErrors.push(ratesResult)
            const error = new Error(
                `Error migrating ${rateInvocation.revision.id} rates: ${ratesResult.message}`
            )
            console.error(error)
            continue
        }

        console.info(
            `Migrated Rates HealthPlanRevision ${rateInvocation.revision.id} successfully...`
        )
    }

    return revisionsErrors
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

    // setup db connections, clean last migration run, and get revisions
    const { store, prismaClient } = await getDatabaseConnection()
    const cleanResult = await cleanupPreviousProtoMigrate(prismaClient)
    if (cleanResult instanceof Error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message:
                    'Could not cleanup after previous migrations. Aborting.',
            }),
        }
    }

    const revisions = await getRevisions(store)

    // go through the list of revisions and migrate
    console.info(`Found ${revisions.length} revisions to migrate...`)

    const migrationErrors = await migrateHealthPlanRevisions(
        prismaClient,
        revisions
    )

    if (migrationErrors.length > 0) {
        console.error(`Encountered ${migrationErrors.length} Errors Migrating`)
        for (const migrationError of migrationErrors) {
            recordException(migrationError, serviceName, 'migrateRevision')
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Migration complete, Errored.',
            }),
        }
    }
    console.info('Successfully migrated rates and contracts.')

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Lambda function executed successfully',
        }),
    }
}
