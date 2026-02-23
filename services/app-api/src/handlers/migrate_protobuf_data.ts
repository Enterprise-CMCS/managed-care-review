/**
 * This lambda is used to migrate the protobuf encoded data to JSON strings in
 * the deprecated HealthPlanRevisionTable tables.
 */

import type { Handler, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getPostgresURL } from './configuration'
import { initTracer, recordException } from '../otel/otel_handler'
import { NewPrismaClient } from '../postgres'
import type {
    LockedHealthPlanFormDataType,
    UnlockedHealthPlanFormDataType,
} from '../hpp'
import { toDomain } from '../hpp'
import type { PrismaTransactionType } from '../postgres/prismaTypes'

const main: Handler = async (): Promise<APIGatewayProxyResultV2> => {
    // Setup otel tracing
    const otelCollectorURL = process.env.API_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        const errMsg =
            'Configuration Error: API_APP_OTEL_COLLECTOR_URL must be set'
        return fmtError(errMsg)
    }
    const serviceName = 'migrate-protobuf-fromData'
    initTracer(serviceName, otelCollectorURL)

    // Get environment variables
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    const connectTimeout = process.env.CONNECT_TIMEOUT ?? '60'
    const stageName = process.env.STAGE_NAME

    if (!dbURL) {
        const errMsg = 'Init Error: DATABASE_URL is required'
        recordException(errMsg, serviceName, 'dbURL')
        return fmtError(errMsg)
    }

    if (!secretsManagerSecret) {
        const errMsg = 'Init Error: SECRETS_MANAGER_SECRET is required'
        recordException(errMsg, serviceName, 'secretsManagerSecret')
        return fmtError(errMsg)
    }

    if (!stageName) {
        const errMsg = 'Init Error: STAGE_NAME is required'
        recordException(errMsg, serviceName, 'stageName')
        return fmtError(errMsg)
    }

    // Get database connection
    const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
    if (dbConnResult instanceof Error) {
        const errMsg = `Init Error: failed to get pg URL: ${dbConnResult}`
        recordException(errMsg, serviceName, 'getPostgresURL')
        return fmtError(errMsg)
    }

    const dbConnectionURL = dbConnResult + `&connect_timeout=${connectTimeout}`

    const prisma = await NewPrismaClient(dbConnectionURL)

    if (prisma instanceof Error) {
        console.info('Error: ', prisma)
        throw new Error('failed to configure postgres client for testing')
    }

    try {
        console.info('Starting Protobuf to JSON migration')
        const migrationResult = await prisma.$transaction(
            async (tx) => await runProtoMigration(tx, stageName)
        )

        const result = {
            success: true,
            message: migrationResult,
        }

        console.info('Migration completed:', JSON.stringify(result))

        return {
            statusCode: 200,
            body: JSON.stringify(result),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    } catch (error) {
        const errMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`
        recordException(errMsg, serviceName, 'migration')
        console.error(errMsg)
        return fmtError(errMsg)
    } finally {
        await prisma.$disconnect()
    }
}

const FIRST_NAMES = [
    'Aang',
    'Katara',
    'Sokka',
    'Toph',
    'Zuko',
    'Azula',
    'Iroh',
    'Suki',
    'Ty Lee',
    'Mai',
    'Bumi',
    'Roku',
    'Kyoshi',
    'Korra',
    'Mako',
    'Bolin',
    'Asami',
    'Kya',
    'Bumi',
    'Tenzin',
]

const LAST_NAMES = [
    'Fire',
    'Water',
    'Earth',
    'Air',
    'Sun',
    'Moon',
    'Ocean',
    'Ember',
    'Stone',
    'Cloud',
    'Flame',
    'Wave',
    'Mountain',
    'Sky',
    'Storm',
    'Lightning',
    'Metal',
    'Sand',
    'Ice',
    'Spirit',
]

// Generate a fake name using a seedValue.
const generateFakeName = (seedValue?: string) => {
    function hashString(str: string) {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i)
            hash = hash & hash
        }
        return Math.abs(hash)
    }

    const hash = hashString(seedValue || '')
    const firstIndex = hash % FIRST_NAMES.length
    const lastIndex = Math.floor(hash / FIRST_NAMES.length) % LAST_NAMES.length

    return {
        firstName: FIRST_NAMES[firstIndex],
        lastName: LAST_NAMES[lastIndex],
    }
}

// Generates a sanitized email using full name if provided.
const sanitizeEmail = (
    email: string,
    fullName?: {
        firstName: string
        lastName: string
    }
) => {
    const { firstName, lastName } = fullName
        ? fullName
        : generateFakeName(email)
    const fakeName = `${firstName}.${lastName}`.toLowerCase()
    return `${fakeName}@example.com`
}

// Sanitize common properties of contacts. Using names to provide consistent sanitized full name and email.
const sanitizeContact = ({
    name,
    email,
}: {
    name?: string
    email?: string
}) => {
    // If a name is passed, use it to generate both sanitized name and email for consistency
    if (name) {
        const { firstName, lastName } = generateFakeName(name)

        return {
            name: `${firstName} ${lastName}`,
            email: email
                ? sanitizeEmail(email, { firstName, lastName })
                : undefined,
        }
    } else {
        // If no name is passed, we then used the email to generate a sanitized email or undefined if email was undefined.
        return {
            name: undefined,
            email: email ? sanitizeEmail(email) : undefined,
        }
    }
}

// Sanitizes document data so it does not point to a real document
const sanitizeDocument = ({ s3URL }: { s3URL: string }) => {
    // Sanitize URL with fake bucket and path
    const sanitizedS3URL = () => {
        const parts = s3URL.split('/')
        const filename = parts[parts.length - 1]

        // Generate a fake bucket and key path
        return `s3://uploads-sanitized/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.pdf/${filename}`
    }

    // Generate a new hash not using the file contents.
    const sanitizedSHA256 = () => {
        const chars = '0123456789abcdef'
        let hash = ''
        for (let i = 0; i < 64; i++) {
            hash += chars[Math.floor(Math.random() * chars.length)]
        }
        return hash
    }

    return {
        s3URL: sanitizedS3URL(),
        sha256: sanitizedSHA256(),
    }
}

// Sanitize decoded protobuf formData to remove PII and anonymize names.
const sanitizeFromData = (
    decodedFormData:
        | UnlockedHealthPlanFormDataType
        | LockedHealthPlanFormDataType
) => {
    return {
        ...decodedFormData,
        stateContacts: decodedFormData.stateContacts.map((contact) => ({
            ...contact,
            ...sanitizeContact(contact),
        })),
        addtlActuaryContacts: decodedFormData.addtlActuaryContacts.map(
            (contact) => ({
                ...contact,
                ...sanitizeContact(contact),
            })
        ),
        contractDocuments: decodedFormData.contractDocuments.map((doc) => ({
            ...doc,
            ...sanitizeDocument(doc),
        })),
        documents: decodedFormData.documents.map((doc) => ({
            ...doc,
            ...sanitizeDocument(doc),
        })),
        rateInfos: decodedFormData.rateInfos.map((rate) => {
            return {
                ...rate,
                rateDocuments: rate.rateDocuments.map((doc) => ({
                    ...doc,
                    ...sanitizeDocument(doc),
                })),
                supportingDocuments: rate.supportingDocuments.map((doc) => ({
                    ...doc,
                    ...sanitizeDocument(doc),
                })),
                actuaryContacts: rate.actuaryContacts.map((contact) => ({
                    ...contact,
                    ...sanitizeContact(contact),
                })),
                addtlActuaryContacts: rate.addtlActuaryContacts
                    ? rate.addtlActuaryContacts.map((contact) => ({
                          ...contact,
                          ...sanitizeContact(contact),
                      }))
                    : undefined,
            }
        }),
    }
}

export const runProtoMigration = async (
    tx: PrismaTransactionType,
    stageName?: string
): Promise<string> => {
    // get revision where formData has not been populated
    const hppRevisions = await tx.healthPlanRevisionTable.findMany({
        where: {
            formData: undefined,
        },
    })

    // skip if no revisions were found
    if (hppRevisions.length === 0) {
        return 'Protobuf migration aborted: No revisions to migrate'
    }

    // Do the migration
    for (const revision of hppRevisions) {
        let decodedFormData = toDomain(revision.formDataProto)

        if (decodedFormData instanceof Error) {
            throw new Error(
                `Protobuf migration failed: Error decoding formDataProto in revision with id ${revision.id}.`
            )
        }

        await tx.healthPlanRevisionTable.update({
            where: {
                id: revision.id,
            },
            data: {
                // We dumped data from prod to val awhile back. The submission data was sanitized
                // to remove PII and document data. This was not done for the protobuf data
                // so here we will do the sanitization but only in val.
                formData:
                    stageName === 'val'
                        ? sanitizeFromData(decodedFormData)
                        : decodedFormData,
                unlockedBy:
                    revision.unlockedBy && stageName === 'val'
                        ? sanitizeEmail(revision.unlockedBy)
                        : revision.unlockedBy,
                submittedBy:
                    revision.submittedBy && stageName === 'val'
                        ? sanitizeEmail(revision.submittedBy)
                        : revision.submittedBy,
            },
        })
    }

    return `Protobuf migration successful: ${hppRevisions.length} revision(s) migrated`
}

function fmtError(error: string): APIGatewayProxyResultV2 {
    return {
        statusCode: 500,
        body: JSON.stringify({
            success: false,
            error,
        }),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}

export { main }
