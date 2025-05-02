import { SecretsManager } from './secrets'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
    _Object,
} from '@aws-sdk/client-s3'
import { SecretDict } from './types'

// Environment variables
const REGION = process.env.AWS_REGION || 'us-east-1'
const S3_BUCKET = process.env.S3_BUCKET
const DB_SECRET_ARN = process.env.DB_SECRET_ARN
const TMP_DIR = '/tmp'
const S3_PREFIX = 'db_dump'

const s3Client = new S3Client({ region: REGION })

/**
 * Finds the most recent database dump file in the S3 bucket
 * @returns The S3 key of the latest dump file
 */
async function findLatestDbDumpFile(): Promise<string> {
    console.info(`Listing files in s3://${S3_BUCKET}/${S3_PREFIX}/...`)

    const listResult = await s3Client.send(
        new ListObjectsV2Command({
            Bucket: S3_BUCKET,
            Prefix: S3_PREFIX,
        })
    )

    if (!listResult.Contents || listResult.Contents.length === 0) {
        throw new Error(
            `No dump files found in s3://${S3_BUCKET}/${S3_PREFIX}/`
        )
    }

    // Sort by last modified date, newest first
    const sortedFiles = listResult.Contents.sort((a: _Object, b: _Object) => {
        return (
            (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
        )
    })

    const latestDumpKey = sortedFiles[0].Key
    if (!latestDumpKey) {
        throw new Error('Failed to determine latest dump file key')
    }

    console.info(`Latest dump file: ${latestDumpKey}`)
    return latestDumpKey
}

/**
 * Downloads a file from S3 to the local filesystem
 * @param s3Key The S3 key of the file to download
 * @param localPath The local path to save the file to
 */
async function downloadS3File(s3Key: string, localPath: string): Promise<void> {
    console.info(`Downloading s3://${S3_BUCKET}/${s3Key} to ${localPath}...`)

    try {
        const getObjectCommand = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
        })

        const response = await s3Client.send(getObjectCommand)

        if (!response.Body) {
            throw new Error(`Empty response body from S3 for key: ${s3Key}`)
        }

        // Create a write stream to the file
        const fileStream = fs.createWriteStream(localPath)

        // Pipe the response body to the file stream
        // @ts-expect-error - AWS SDK types don't fully represent the pipe capability
        response.Body.pipe(fileStream)

        // Wait for the file to be fully written
        await new Promise<void>((resolve, reject) => {
            fileStream.on('finish', resolve)
            fileStream.on('error', reject)
        })

        console.info(`Dump file downloaded successfully to ${localPath}`)
    } catch (error) {
        console.error('Error downloading file from S3:', error)
        throw new Error(
            `Failed to download dump file: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

/**
 * Get database credentials from Secrets Manager
 */
async function getDatabaseCredentials(): Promise<SecretDict> {
    if (!DB_SECRET_ARN) {
        throw new Error('DB_SECRET_ARN environment variable is not set')
    }

    console.info(`Getting secrets from ${DB_SECRET_ARN}...`)
    const sm = new SecretsManager()
    const dbCredentials: SecretDict = await sm.getSecretDict(
        DB_SECRET_ARN,
        'AWSCURRENT'
    )

    if (!dbCredentials || !dbCredentials.host) {
        throw new Error(
            `Invalid database credentials from secret ${DB_SECRET_ARN}`
        )
    }

    return dbCredentials
}

/**
 * Execute a PostgreSQL command with proper error handling
 * @param command The command to execute
 * @param description Description of what the command does (for error messages)
 * @param dbCredentials Database credentials
 * @returns The output of the command
 */
function executeDbCommand(
    command: string,
    description: string,
    dbCredentials: SecretDict
): string {
    try {
        // Set environment variables for psql
        process.env.PGPASSWORD = dbCredentials.password

        // Execute the command
        const result = execSync(command, { encoding: 'utf8' })
        return result
    } catch (error) {
        console.error(`Error ${description}:`, error)
        throw new Error(
            `Failed to ${description}: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

/**
 * Prepare the database for import (create if needed, drop existing tables)
 * @param dbCredentials Database credentials
 */
function prepareDatabase(dbCredentials: SecretDict): void {
    const dbname = dbCredentials.dbname || 'postgres'
    const port = dbCredentials.port || '5432'

    console.info('Checking if database exists...')

    // Check if database exists
    const checkDbCmd = [
        'psql',
        `-h ${dbCredentials.host}`,
        `-p ${port}`,
        `-U ${dbCredentials.username}`,
        `-d postgres`,
        `-c "SELECT 1 FROM pg_database WHERE datname = '${dbname}';"`,
    ].join(' ')

    const dbCheckResult = executeDbCommand(
        checkDbCmd,
        'check if database exists',
        dbCredentials
    )

    // If database doesn't exist, create it
    if (!dbCheckResult.includes('(1 row)')) {
        console.info(`Database ${dbname} does not exist, creating it...`)
        const createDbCmd = [
            'psql',
            `-h ${dbCredentials.host}`,
            `-p ${port}`,
            `-U ${dbCredentials.username}`,
            `-d postgres`,
            `-c "CREATE DATABASE ${dbname};"`,
        ].join(' ')

        executeDbCommand(createDbCmd, 'create database', dbCredentials)
        console.info(`Database ${dbname} created successfully`)
    } else {
        console.info(`Database ${dbname} already exists`)
    }

    // Check if database is empty or has tables already
    const checkTablesCmd = [
        'psql',
        `-h ${dbCredentials.host}`,
        `-p ${port}`,
        `-U ${dbCredentials.username}`,
        `-d ${dbname}`,
        `-c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`,
    ].join(' ')

    const tableCheckResult = executeDbCommand(
        checkTablesCmd,
        'check existing tables',
        dbCredentials
    )
    const tableCount = parseInt(
        tableCheckResult.trim().split('\n')[2].trim(),
        10
    )

    if (tableCount > 0) {
        console.info(
            `Database ${dbname} has ${tableCount} existing tables. They will be replaced during import.`
        )

        // Drop all existing tables for a clean import
        const dropAllTablesCmd = [
            'psql',
            `-h ${dbCredentials.host}`,
            `-p ${port}`,
            `-U ${dbCredentials.username}`,
            `-d ${dbname}`,
            `-c "DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END $$;"`,
        ].join(' ')

        executeDbCommand(
            dropAllTablesCmd,
            'drop existing tables',
            dbCredentials
        )
        console.info('Dropped all existing tables for clean import')
    } else {
        console.info(`Database ${dbname} is empty and ready for import`)
    }
}

/**
 * Import the database dump file into PostgreSQL
 * @param dumpFilePath Path to the dump file
 * @param dbCredentials Database credentials
 */
function importDatabase(dumpFilePath: string, dbCredentials: SecretDict): void {
    const dbname = dbCredentials.dbname || 'postgres'
    const port = dbCredentials.port || '5432'

    console.info(`Importing database dump from ${dumpFilePath}...`)

    try {
        // Construct the psql command to import
        const psqlCmd = [
            'psql',
            `-h ${dbCredentials.host}`,
            `-p ${port}`,
            `-U ${dbCredentials.username}`,
            `-d ${dbname}`,
            `-f ${dumpFilePath}`,
        ].join(' ')

        // Execute psql with specific options for import
        process.env.PGPASSWORD = dbCredentials.password
        execSync(psqlCmd, {
            stdio: 'inherit',
            env: {
                ...process.env,
                PGOPTIONS: '-c client_min_messages=warning', // Reduce verbose output
            },
        })

        console.info('Database import completed successfully')
    } catch (error) {
        console.error('Error executing psql import:', error)
        throw new Error(
            `Database import failed: ${error instanceof Error ? error.message : String(error)}`
        )
    } finally {
        // Clear password from environment
        delete process.env.PGPASSWORD
    }
}

/**
 * Lambda handler function
 * Orchestrates the process of finding, downloading, and importing the latest database dump
 */
export const handler = async () => {
    console.info('Starting database import process...')

    if (!S3_BUCKET) {
        throw new Error('S3_BUCKET environment variable is not set')
    }

    try {
        // Find the latest dump file in S3
        const latestDumpKey = await findLatestDbDumpFile()
        const dumpFilename = path.basename(latestDumpKey)
        const dumpFilePath = path.join(TMP_DIR, dumpFilename)

        // Download the dump file to the Lambda's temp directory
        await downloadS3File(latestDumpKey, dumpFilePath)

        // Get the database credentials
        const dbCredentials = await getDatabaseCredentials()

        // Prepare the database for import
        prepareDatabase(dbCredentials)

        // Import the database dump
        importDatabase(dumpFilePath, dbCredentials)

        // Clean up temporary files
        fs.unlinkSync(dumpFilePath)
        console.info('Temporary files cleaned up')

        // Return success
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Database import completed successfully',
                importedFile: dumpFilename,
                databaseName: dbCredentials.dbname || 'postgres',
            }),
        }
    } catch (err) {
        console.error('Error in db import process:', err)

        // Make sure we clean up the password from environment in case of error
        delete process.env.PGPASSWORD

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error during db import process',
                error: err instanceof Error ? err.message : String(err),
            }),
        }
    }
}
