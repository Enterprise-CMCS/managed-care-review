import { SecretsManager } from './secrets'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
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
                '--format=plain',
                '--clean', // Add DROP statements before CREATE
                '--if-exists', // Add IF EXISTS to DROP statements
                '--no-owner', // Skip ownership commands
                '--no-acl', // Skip privilege commands
                `--file=${dumpFilePath}`,
            ].join(' ')

            // Execute pg_dump
            execSync(pgDumpCmd, { stdio: 'inherit' })

            console.info('Database dump completed successfully')

            // Read, sanitize, and write back SQL content
            console.info('Sanitizing sensitive information...')
            const sqlContent = fs.readFileSync(dumpFilePath, 'utf8')
            const sanitizedContent = sanitizeSqlDump(sqlContent)
            fs.writeFileSync(sanitizedDumpPath, sanitizedContent)
        } catch (error) {
            console.error('Error executing pg_dump:', error)
            throw new Error(`pg_dump execution failed: ${error}`)
        } finally {
            // Clear password from environment
            delete process.env.PGPASSWORD
        }

        // Upload the sanitized dump to S3
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

        console.info('Upload to S3 completed successfully')

        // Clean up temporary files
        fs.unlinkSync(dumpFilePath)
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

/**
 * Generates a deterministic hash for a string
 * @param input The string to hash
 * @returns A hex string hash
 */
function hashString(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex')
}

/**
 * Generates a fake name based on the original name
 * @param name The original name
 * @param type The type of name (first, last, or full)
 * @returns A fake name
 */
function generateFakeName(
    name: string,
    type: 'first' | 'last' | 'full' = 'full'
): string {
    if (!name) return name // Return as-is if empty

    // Use hash to create deterministic fake names
    const hash = hashString(name)
    const firstNameOptions = [
        'Aang',
        'Katara',
        'Sokka',
        'Toph',
        'Zuko',
        'Iroh',
        'Azula',
        'Suki',
        'Ty Lee',
        'Mai',
        'Jet',
        'Yue',
        'Haru',
        'Hakoda',
        'Bumi',
        'Gyatso',
        'Roku',
        'Kyoshi',
        'Korra',
        'Mako',
        'Asami',
        'Tenzin',
        'Lin',
    ]
    const lastNameOptions = [
        'Beifong',
        'Fire',
        'Water',
        'Air',
        'Earth',
        'Roku',
        'Sozin',
        'Kyoshi',
        'Kuruk',
        'Yangchen',
        'Wan',
        'Raava',
        'Vaatu',
        'Sato',
        'Agni',
        'Kai',
        'Long',
        'Lee',
        'Bei',
        'Fong',
        'Watertribe',
    ]

    // Pick a name based on hash value to ensure consistency
    const hashNum = parseInt(hash.substring(0, 8), 16)

    if (type === 'first') {
        return firstNameOptions[hashNum % firstNameOptions.length]
    } else if (type === 'last') {
        return lastNameOptions[hashNum % lastNameOptions.length]
    } else {
        const firstName = firstNameOptions[hashNum % firstNameOptions.length]
        const lastName =
            lastNameOptions[(hashNum >> 4) % lastNameOptions.length]
        return `${firstName} ${lastName}`
    }
}

/**
 * Changes the email address to use example.com
 * @param email The original email address
 * @returns A sanitized email address
 */
function sanitizeEmail(email: string): string {
    if (!email || email.indexOf('@') === -1) return email

    // Keep the username but change the domain to example.com
    const [username] = email.split('@')
    return `${username}@example.com`
}

/**
 * Sanitizes all sensitive information in a SQL dump
 * @param sqlContent The SQL dump content to sanitize
 * @returns Sanitized SQL content
 */
function sanitizeSqlDump(sqlContent: string): string {
    console.info('Starting sanitization process...')

    // ---- Email Sanitization -----
    console.info('Sanitizing email addresses...')

    // 1. Replace individual email fields across specific tables (avoid UserAudit)
    const emailColumnTables = [
        '"User"',
        '"StateContact"',
        '"ActuaryContact"',
        '"EmailSettings"',
    ]

    emailColumnTables.forEach((tableName) => {
        // Match pattern that ensures we're targeting email columns in specific tables
        const tableEmailPattern = new RegExp(
            `(INSERT INTO ${tableName}|UPDATE ${tableName} SET)([\\s\\S]*?)"email"\\s*=\\s*'([^']+)'`,
            'g'
        )

        sqlContent = sqlContent.replace(
            tableEmailPattern,
            (match, stmt, beforeEmail, email) => {
                return `${stmt}${beforeEmail}"email" = '${sanitizeEmail(email)}'`
            }
        )
    })

    // 2. Replace array email fields (for EmailSettings model) - be specific
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
        const pattern = new RegExp(
            `(INSERT INTO "EmailSettings"|UPDATE "EmailSettings" SET)([\\s\\S]*?)"${field}"\\s*=\\s*'\\{([^}]+)\\}'`,
            'g'
        )

        sqlContent = sqlContent.replace(
            pattern,
            (match, stmt, beforeField, emails) => {
                const emailArray = emails
                    .split(',')
                    .map((email: string) => sanitizeEmail(email.trim()))
                return `${stmt}${beforeField}"${field}" = '{${emailArray.join(',')}}'`
            }
        )
    })

    // 3. Replace emailSource field - with specific targeting
    sqlContent = sqlContent.replace(
        /(INSERT INTO "EmailSettings"|UPDATE "EmailSettings" SET)([\s\S]*?)"emailSource"\s*=\s*'([^']+)'/g,
        (match, stmt, beforeField, email) =>
            `${stmt}${beforeField}"emailSource" = '${sanitizeEmail(email)}'`
    )

    // ----- User Table Name Sanitization ------
    console.info('Sanitizing User table names...')

    // Find all User table inserts and sanitize the names - keep more context
    const userInsertPattern =
        /INSERT INTO "User" \(([^)]+)\) VALUES \(([^)]+)\)/g
    sqlContent = sqlContent.replace(
        userInsertPattern,
        (match, columns, values) => {
            const columnsList = columns
                .split(',')
                .map((col: string) => col.trim())
            const valuesList = values.split(',')

            // Find indexes of givenName and familyName columns
            const givenNameIndex = columnsList.findIndex(
                (col: string) => col === '"givenName"'
            )
            const familyNameIndex = columnsList.findIndex(
                (col: string) => col === '"familyName"'
            )
            const emailIndex = columnsList.findIndex(
                (col: string) => col === '"email"'
            )

            if (givenNameIndex !== -1 && valuesList[givenNameIndex]) {
                // Extract the name (removing quotes) and sanitize it
                const namePart = valuesList[givenNameIndex].trim()
                if (namePart.startsWith("'") && namePart.endsWith("'")) {
                    const name = namePart.substring(1, namePart.length - 1)
                    valuesList[givenNameIndex] =
                        `'${generateFakeName(name, 'first')}'`
                }
            }

            if (familyNameIndex !== -1 && valuesList[familyNameIndex]) {
                // Extract the name (removing quotes) and sanitize it
                const namePart = valuesList[familyNameIndex].trim()
                if (namePart.startsWith("'") && namePart.endsWith("'")) {
                    const name = namePart.substring(1, namePart.length - 1)
                    valuesList[familyNameIndex] =
                        `'${generateFakeName(name, 'last')}'`
                }
            }

            if (emailIndex !== -1 && valuesList[emailIndex]) {
                // Extract the email (removing quotes) and sanitize it
                const emailPart = valuesList[emailIndex].trim()
                if (emailPart.startsWith("'") && emailPart.endsWith("'")) {
                    const email = emailPart.substring(1, emailPart.length - 1)
                    valuesList[emailIndex] = `'${sanitizeEmail(email)}'`
                }
            }

            return `INSERT INTO "User" (${columns}) VALUES (${valuesList.join(',')})`
        }
    )

    // Also catch UPDATE statements for User table - be specific to User table
    sqlContent = sqlContent.replace(
        /UPDATE "User" SET ([\s\S]*?)"givenName"\s*=\s*'([^']+)'/g,
        (match, beforeName, name) =>
            `UPDATE "User" SET ${beforeName}"givenName" = '${generateFakeName(name, 'first')}'`
    )

    sqlContent = sqlContent.replace(
        /UPDATE "User" SET ([\s\S]*?)"familyName"\s*=\s*'([^']+)'/g,
        (match, beforeName, name) =>
            `UPDATE "User" SET ${beforeName}"familyName" = '${generateFakeName(name, 'last')}'`
    )

    // ----- Contact Tables Names and Emails ------
    console.info('Sanitizing contact table data...')

    // StateContact table - handle both INSERT and UPDATE patterns (more specific)
    sqlContent = sqlContent.replace(
        /(INSERT INTO|UPDATE) "StateContact"([\s\S]*?)"name"\s*=\s*'([^']+)'/g,
        (match, stmt, beforeName, name) =>
            `${stmt} "StateContact"${beforeName}"name" = '${generateFakeName(name)}'`
    )

    // ActuaryContact table - handle both INSERT and UPDATE patterns (more specific)
    sqlContent = sqlContent.replace(
        /(INSERT INTO|UPDATE) "ActuaryContact"([\s\S]*?)"name"\s*=\s*'([^']+)'/g,
        (match, stmt, beforeName, name) =>
            `${stmt} "ActuaryContact"${beforeName}"name" = '${generateFakeName(name)}'`
    )

    // Handle email fields in StateContact and ActuaryContact tables (more specific)
    sqlContent = sqlContent.replace(
        /(INSERT INTO|UPDATE) "(StateContact|ActuaryContact)"([\s\S]*?)"email"\s*=\s*'([^']+)'/g,
        (match, stmt, table, beforeEmail, email) =>
            `${stmt} "${table}"${beforeEmail}"email" = '${sanitizeEmail(email)}'`
    )

    console.info('Sanitization complete')
    return sqlContent
}
