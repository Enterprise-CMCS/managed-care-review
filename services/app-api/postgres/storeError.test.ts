/* eslint-disable jest/no-conditional-expect */
/* eslint-disable jest/no-try-expect */
import { v4 as uuidv4 } from 'uuid'
import { PrismaClient } from '@prisma/client'

import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'
import { toProtoBuffer } from '../../app-web/src/common-code/proto/stateSubmission'

import { sharedTestPrismaClient } from '../testHelpers/gqlHelpers'
import { convertPrismaErrorToStoreError } from './storeError'

describe('storeError', () => {
    it('errors on a invalid connection string', async () => {
        const badPrismaClient = new PrismaClient({
            datasources: {
                db: {
                    url: 'localhost:99999',
                },
            },
        })

        try {
            await badPrismaClient.stateSubmission.findFirst()

            throw new Error('should not be able to connect to bad port')
        } catch (e: unknown) {
            const storeErr = convertPrismaErrorToStoreError(e)

            expect(storeErr.code).toEqual('CONNECTION_ERROR')
        }
    })

    it('errors on a bad connection', async () => {
        const badPrismaClient = new PrismaClient({
            datasources: {
                db: {
                    url: 'postgres://localhost:9999/foobar&pool_timeout=1',
                },
            },
        })

        try {
            await badPrismaClient.stateSubmission.findFirst()

            throw new Error('should not be able to connect to bad port')
        } catch (e: unknown) {
            const storeErr = convertPrismaErrorToStoreError(e)

            expect(storeErr.code).toEqual('CONNECTION_ERROR')
        }
    })

    it('errors on double insert', async () => {
        const client = await sharedTestPrismaClient()

        const doubledID = uuidv4()

        const draft: DraftSubmissionType = {
            id: doubledID,
            createdAt: new Date(),
            updatedAt: new Date(),
            stateNumber: 4,
            status: 'DRAFT',
            submissionType: 'CONTRACT_ONLY',
            programID: 'smmc',
            submissionDescription: 'description',
            stateCode: 'FL',

            documents: [],
            contractDocuments: [],
            rateDocuments: [],
            stateContacts: [],
            actuaryContacts: [],
            managedCareEntities: [],
            federalAuthorities: [],
        }

        // we want to figure out what error is returned for a constraint violation.
        const protobuf = toProtoBuffer(draft)

        const buffer = Buffer.from(protobuf)

        try {
            await client.stateSubmission.create({
                data: {
                    id: draft.id,
                    stateCode: draft.stateCode,
                    submissionFormProto: buffer,
                },
            })

            await client.stateSubmission.create({
                data: {
                    id: draft.id,
                    stateCode: draft.stateCode,
                    submissionFormProto: buffer,
                },
            })

            throw new Error('Inserting the same ID twice should error.')
        } catch (e) {
            const storeError = convertPrismaErrorToStoreError(e)

            expect(storeError).toEqual({
                code: 'INSERT_ERROR',
                message: 'insert failed because of invalid unique constraint',
            })
        }
    })

    it('returns unknown for non prisma errors', async () => {
        const badErr = new Error('not a pg error')

        const storeError = convertPrismaErrorToStoreError(badErr)

        expect(storeError).toEqual({
            code: 'UNEXPECTED_EXCEPTION',
            message: 'A completely unexpected prisma exception has occurred',
        })
    })
})
