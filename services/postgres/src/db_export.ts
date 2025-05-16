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
 * Generates an anonymized email address
 * @param email The original email address
 * @returns A sanitized email address
 */
function sanitizeEmail(email: string): string {
    if (!email || email.indexOf('@') === -1) return email

    // Hash the original username to create a deterministic but anonymized username
    const [username] = email.split('@')
    const hashedUsername = hashString(username).substring(0, 8)

    return `user_${hashedUsername}@example.com`
}

/**
 * Sanitizes all sensitive information in a SQL dump
 * @param sqlContent The SQL dump content to sanitize
 * @returns Sanitized SQL content
 */
function sanitizeSqlDump(sqlContent: string): string {
    // ---- Email Sanitization -----
    console.info('Sanitizing email addresses...')

    // Replace individual email fields across all tables
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

    // ----- Name Sanitization ------
    console.info('Sanitizing name fields...')

    // Sanitize User table names
    sqlContent = sqlContent.replace(
        /"givenName"\s*=\s*'([^']+)'/g,
        (match, name) => `"givenName" = '${generateFakeName(name, 'first')}'`
    )

    sqlContent = sqlContent.replace(
        /"familyName"\s*=\s*'([^']+)'/g,
        (match, name) => `"familyName" = '${generateFakeName(name, 'last')}'`
    )

    // Sanitize full name fields in any table
    const namePatterns = [
        /"name"\s*=\s*'([^']+)'/g,
        /"updatedBy"\s*=\s*'([^']+)'/g,
        /"submittedBy"\s*=\s*'([^']+)'/g,
        /"unlockedBy"\s*=\s*'([^']+)'/g,
    ]

    namePatterns.forEach((pattern) => {
        sqlContent = sqlContent.replace(pattern, (match, name) => {
            // Skip sanitizing non-person names (like document names, etc.)
            const lowerName = name.toLowerCase()
            if (
                lowerName.includes('document') ||
                lowerName.includes('program') ||
                lowerName.includes('file') ||
                lowerName.includes('.pdf') ||
                lowerName.includes('.doc') ||
                lowerName.includes('.xls')
            ) {
                return match
            }

            return match.replace(name, generateFakeName(name))
        })
    })

    // Specifically target StateContact names and emails
    console.info('Sanitizing StateContact data...')
    let stateContactCount = 0
    sqlContent = sqlContent.replace(
        /INSERT INTO "StateContact"[^;]+;/g,
        (insertStatement) => {
            // Sanitize names in StateContact inserts
            const sanitizedInsert = insertStatement.replace(
                /'([^']+)'(?=\s*,\s*'[^']*',\s*'[^@]*@[^']*')/g,
                (match, name) => {
                    stateContactCount++
                    return `'${generateFakeName(name)}'`
                }
            )

            // Also sanitize emails in the same statement
            return sanitizedInsert.replace(
                /'([^']*@[^']*)'/g,
                (match, email) => `'${sanitizeEmail(email)}'`
            )
        }
    )
    console.info(`Sanitized ${stateContactCount} StateContact entries`)

    // Specifically target ActuaryContact names and emails
    console.info('Sanitizing ActuaryContact data...')
    let actuaryContactCount = 0
    sqlContent = sqlContent.replace(
        /INSERT INTO "ActuaryContact"[^;]+;/g,
        (insertStatement) => {
            // Sanitize names in ActuaryContact inserts
            const sanitizedInsert = insertStatement.replace(
                /'([^']+)'(?=\s*,\s*'[^']*',\s*'[^@]*@[^']*')/g,
                (match, name) => {
                    actuaryContactCount++
                    return `'${generateFakeName(name)}'`
                }
            )

            // Also sanitize emails in the same statement
            return sanitizedInsert.replace(
                /'([^']*@[^']*)'/g,
                (match, email) => `'${sanitizeEmail(email)}'`
            )
        }
    )
    console.info(`Sanitized ${actuaryContactCount} ActuaryContact entries`)

    // Update information
    console.info('Sanitizing UpdateInfo data...')
    let updateInfoCount = 0
    sqlContent = sqlContent.replace(
        /INSERT INTO "UpdateInfoTable"[^;]+;/g,
        (insertStatement) => {
            updateInfoCount++

            // Replace updatedReason if it contains email or name patterns
            return insertStatement.replace(
                /'([^']*(submitted by|updated by|unlocked by)[^']*)'/gi,
                (match, reason) => {
                    // Replace any name pattern "by Name" with "by [fake name]"
                    const sanitizedReason = reason.replace(
                        /(submitted by|updated by|unlocked by)\s+([A-Z][a-z]+(\s+[A-Z][a-z]+)+)/gi,
                        (nameMatch: string, prefix: string, name: string) =>
                            `${prefix} ${generateFakeName(name)}`
                    )

                    return `'${sanitizedReason}'`
                }
            )
        }
    )
    console.info(`Sanitized ${updateInfoCount} UpdateInfo entries`)

    // Catch any remaining emails that might have been missed
    console.info('Final pass for any remaining emails...')
    sqlContent = sqlContent.replace(
        /'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'/g,
        (match, email) => `'${sanitizeEmail(email)}'`
    )

    // Also catch any emails in string arrays
    sqlContent = sqlContent.replace(
        /'?\{([^{}]*@[^{}]*)\}'?/g,
        (match, emails) => {
            if (emails.includes('@')) {
                const emailArray = emails
                    .split(',')
                    .map((email: string) => email.trim())
                    .map((email: string) => {
                        if (email.includes('@')) {
                            return sanitizeEmail(email)
                        }
                        return email
                    })
                return `'{${emailArray.join(',')}}'`
            }
            return match
        }
    )

    console.info('Sanitization complete')
    return sqlContent
}
