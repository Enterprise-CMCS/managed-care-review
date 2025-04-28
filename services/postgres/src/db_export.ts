import { SecretsManager } from './secrets'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Environment variables
const REGION = process.env.AWS_REGION || 'us-east-1'
const S3_BUCKET = process.env.S3_BUCKET
const DB_SECRET_ARN = process.env.DB_SECRET_ARN
const TMP_DIR = '/tmp'
const S3_PREFIX = 'db_dump'

const s3Client = new S3Client({ region: REGION })

export const handler = async () => {
    console.info('Starting database export process...')
    if (!DB_SECRET_ARN) {
        throw new Error('DB_SECRET_ARN environment variable is not set')
    }

    if (!S3_BUCKET) {
        throw new Error('S3_BUCKET environment variable is not set')
    }

    try {
        // Get the shared database credentials
        console.info(`Getting secrets from ${DB_SECRET_ARN}...`)

        const sm = new SecretsManager()
        const dbCredentials = await sm.getSecretDict(
            DB_SECRET_ARN,
            'AWSCURRENT'
        )

        if (!dbCredentials || !dbCredentials.host) {
            throw new Error(
                `Invalid database credentials from secret ${DB_SECRET_ARN}`
            )
        }

        // Generate timestamp for the export filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const dumpFilename = `${dbCredentials.dbname || 'postgres'}_${timestamp}.sql`
        const dumpFilePath = path.join(TMP_DIR, dumpFilename)
        const plainSqlPath = path.join(TMP_DIR, `plain_${dumpFilename}`)
        const sanitizedDumpPath = path.join(
            TMP_DIR,
            `sanitized_${dumpFilename}`
        )

        // Use pg_dump from the Lambda layer to dump the database
        console.info(`Dumping database to ${dumpFilePath}...`)

        try {
            // Set environment variables for pg_dump
            process.env.PGPASSWORD = dbCredentials.password

            // Construct the pg_dump command
            const pgDumpCmd = [
                'pg_dump',
                `-h ${dbCredentials.host}`,
                `-p ${dbCredentials.port || 5432}`,
                `-U ${dbCredentials.username}`,
                `-d ${dbCredentials.dbname || 'postgres'}`,
                '--format=custom', // Using custom format for better compression
                `--file=${dumpFilePath}`,
            ].join(' ')

            // Execute pg_dump
            execSync(pgDumpCmd, { stdio: 'inherit' })

            console.info('Database dump completed successfully')

            // Convert to plain SQL
            console.info('Converting dump to plain SQL...')
            execSync(`pg_restore ${dumpFilePath} > ${plainSqlPath}`, {
                stdio: 'inherit',
            })

            // Read, sanitize, and write back SQL content
            console.info('Sanitizing email addresses...')
            const sqlContent = fs.readFileSync(plainSqlPath, 'utf8')
            const sanitizedContent = sanitizeSqlDump(sqlContent)
            fs.writeFileSync(plainSqlPath, sanitizedContent)

            // Convert back to custom format
            console.info('Creating final sanitized dump...')
            execSync(
                `pg_dump --format=custom --file=${sanitizedDumpPath} ${plainSqlPath}`,
                { stdio: 'inherit' }
            )
        } catch (error) {
            console.error('Error executing pg_dump:', error)
            throw new Error(`pg_dump execution failed: ${error}`)
        } finally {
            // Clear password from environment
            delete process.env.PGPASSWORD
        }

        // Upload the dump to S3
        const s3Key = `${S3_PREFIX}/${dumpFilename}`
        console.info(`Uploading dump to S3: s3://${S3_BUCKET}/${s3Key}`)

        const fileContent = fs.readFileSync(sanitizedDumpPath)
        await s3Client.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: s3Key,
                Body: fileContent,
                ContentType: 'application/octet-stream',
            })
        )

        console.log('Upload to S3 completed successfully')

        // Clean up the temporary file
        fs.unlinkSync(dumpFilePath)
        fs.unlinkSync(plainSqlPath)
        fs.unlinkSync(sanitizedDumpPath)
        console.info('Temporary files cleaned up')
    } catch (err) {
        console.error('Error in db export process:', err)
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error during db export process',
                error: String(err),
            }),
        }
    }
}

function sanitizeEmail(email: string): string {
    // Keep the username  but change the domain to example.com
    const [username] = email.split('@')
    return `${username}@example.com`
}

function sanitizeSqlDump(sqlContent: string): string {
    // Replace individual email fields
    sqlContent = sqlContent.replace(
        /"email"\s*=\s*'([^']+)'/g,
        (match, email) => `"email" = '${sanitizeEmail(email)}'`
    )

    // Replace array email fields (for EmailSettings model)
    const arrayEmailFields = [
        'devReviewTeamEmails',
        'cmsReviewHelpEmailAddress',
        'cmsRateHelpEmailAddress',
        'oactEmails',
        'dmcpReviewEmails',
        'dmcpSubmissionEmails',
        'dmcoEmails',
        'helpDeskEmail',
    ]

    arrayEmailFields.forEach((field) => {
        sqlContent = sqlContent.replace(
            new RegExp(`"${field}"\\s*=\\s*'\\{([^}]+)\\}'`, 'g'),
            (match, emails) => {
                const emailArray = emails
                    .split(',')
                    .map((email: string) => sanitizeEmail(email.trim()))
                return `"${field}" = '{${emailArray.join(',')}}'`
            }
        )
    })

    // Replace emailSource field
    sqlContent = sqlContent.replace(
        /"emailSource"\s*=\s*'([^']+)'/g,
        (match, email) => `"emailSource" = '${sanitizeEmail(email)}'`
    )

    return sqlContent
}
