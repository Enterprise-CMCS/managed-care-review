import { Handler } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import { HealthPlanRevisionTable } from '@prisma/client'
import { HealthPlanFormDataType } from '../../../app-web/src/common-code/healthPlanFormDataType'
import { toDomain } from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import { isStoreError, StoreError } from '../postgres/storeError'
import { Store } from '../postgres'
import {
    initTracer,
    initMeter,
    recordException,
} from '../../../uploads/src/lib/otel'

/* We're changing where we store rate documents on the proto.  We're moving them from fromDataProto.documents
to formDataProto.rateInfos[0].supportingDocuments.  This migration will move the documents from the old location
to the new location, removing the documents from formDataProto.documents. */

export const processRevisions = async (
    store: Store,
    revisions: HealthPlanRevisionTable[]
): Promise<void> => {
    console.info('STARTING process revisions')
    const stageName = process.env.stage ?? 'stageNotSet'
    const serviceName = `migrate_rate_documents_lambda-${stageName}`
    const otelCollectorURL = process.env.REACT_APP_OTEL_COLLECTOR_URL
    if (otelCollectorURL) {
        initTracer(serviceName, otelCollectorURL)
    } else {
        console.error(
            'Configuration Error: REACT_APP_OTEL_COLLECTOR_URL must be set'
        )
    }

    // Get the pkgID from the first revision in the list - not sure why we need?
    const pkgID = revisions[0].pkgID
    if (!pkgID) {
        console.error('Package ID is missing in the revisions')
        throw new Error('Package ID is required')
    }

    initMeter(serviceName)
    let revisionsEdited = 0
    let revisionsMigrated = 0
    console.info('starting to loop through revisions')
    for (const revision of revisions) {
        const pkgID = revision.pkgID
        const decodedFormDataProto = toDomain(revision.formDataProto)

        if (!(decodedFormDataProto instanceof Error)) {
            const formData = decodedFormDataProto as HealthPlanFormDataType
            if (
                formData.submissionType === 'CONTRACT_ONLY' ||
                !formData.rateInfos[0]
            ) {
                continue // no need to migrate these
            }
            // skip the submission with two rates
            if (formData.id !== 'ddd5dde1-0082-4398-90fe-89fc1bc148df') {
                if (formData.rateInfos.length > 1 && formData.documents) {
                    console.info(
                        `UNEXPECTED: There is an additional submission on this environment with rate supporting docs to be migrated. ID: ${formData.id}`
                    )
                }

                // we know the other submissions have only a single rate to handle
                const ratesRelatedDocument = formData.documents.filter((doc) =>
                    doc.documentCategories.includes('RATES_RELATED')
                )

                formData.rateInfos[0].supportingDocuments = ratesRelatedDocument
                formData.documents = formData.documents.filter(
                    (doc) => !ratesRelatedDocument.includes(doc)
                )
                revisionsEdited++
            } else {
                // now handle the submission with two rates
                const firstRateRelatedDocument = formData.documents.filter(
                    (doc) =>
                        doc.name ===
                        'Report12 - SFY 2022 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx'
                )

                const secondRateRelatedDocument = formData.documents.filter(
                    (doc) =>
                        doc.name ===
                        'Report13 - SFY 2023 Preliminary MississippiCAN Capitation Rates - Exhibits.xlsx'
                )

                if (
                    firstRateRelatedDocument.length === 0 ||
                    secondRateRelatedDocument.length === 0
                ) {
                    console.info(
                        'UNEXPECTED: Rate related documents for odd duck submission are incorrect',
                        firstRateRelatedDocument,
                        secondRateRelatedDocument
                    )
                }
                if (
                    !formData.rateInfos[0] ||
                    !formData.rateInfos[1].supportingDocuments
                ) {
                    console.info(
                        'UNEXPECTED: Rate infos for odd duck submission are incorrect',
                        formData.rateInfos
                    )
                }

                formData.rateInfos[0].supportingDocuments =
                    firstRateRelatedDocument
                formData.rateInfos[1].supportingDocuments =
                    secondRateRelatedDocument
                formData.documents = formData.documents.filter(
                    (doc) =>
                        !firstRateRelatedDocument.includes(doc) &&
                        !secondRateRelatedDocument.includes(doc)
                )
                revisionsEdited++
                console.info('in the loop of editing revisions')
            }

            try {
                console.info(`updating submission ${pkgID}`)
                const update = await store.updateHealthPlanRevision(
                    pkgID,
                    revision.id,
                    formData
                )
                if (isStoreError(update)) {
                    console.error(
                        `StoreError updating revision ${
                            revision.id
                        }: ${JSON.stringify(update)}`
                    )
                    throw new Error('Error updating revision')
                } else {
                    revisionsMigrated++
                }
            } catch (err) {
                console.error(`Error updating revision ${revision.id}: ${err}`)
                throw err
            }
        } else {
            const error = `UNEXPECTED: Error decoding formDataProto for revision ${revision.id} in package ${revision.pkgID} in rate migration: ${decodedFormDataProto}`
            console.error(error)
            recordException(error, serviceName, 'migrate_rate_documents')
        }
    }
    console.info(
        `There were ${revisionsEdited}/${revisions.length} were flagged for changes`
    )
    console.info(
        `And ${revisionsMigrated}/ ${revisions.length} successfully migrated`
    )
}

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

export const main: Handler = async (event, context) => {
    console.info('STARTING')
    try {
        const store = await getDatabaseConnection()
        const revisions = await getRevisions(store)

        try {
            await processRevisions(store, revisions)
        } catch (processRevisionsError) {
            console.error(`ERROR process revisions: ${processRevisionsError}`)
        }

        console.info('rate document migration complete')
    } catch (error) {
        console.error(`ERROR: ${error}`)
    }
}
