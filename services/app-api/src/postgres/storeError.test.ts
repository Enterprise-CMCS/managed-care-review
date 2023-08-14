/* eslint-disable jest/no-conditional-expect */
import { v4 as uuidv4 } from 'uuid'
import { PrismaClient } from '@prisma/client'
import type { UnlockedHealthPlanFormDataType } from '../../../app-web/src/common-code/healthPlanFormDataType'
import { toProtoBuffer } from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
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
            await badPrismaClient.healthPlanPackageTable.findFirst()

            throw new Error('should not be able to connect to bad port')
        } catch (e: unknown) {
            const storeErr = convertPrismaErrorToStoreError(e)

            expect(storeErr.code).toBe('CONNECTION_ERROR')
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
            await badPrismaClient.healthPlanPackageTable.findFirst()

            throw new Error('should not be able to connect to bad port')
        } catch (e: unknown) {
            const storeErr = convertPrismaErrorToStoreError(e)

            expect(storeErr.code).toBe('CONNECTION_ERROR')
        }
    })

    it('errors on double insert', async () => {
        const client = await sharedTestPrismaClient()

        const doubledID = uuidv4()

        const draft: UnlockedHealthPlanFormDataType = {
            id: doubledID,
            createdAt: new Date(),
            updatedAt: new Date(),
            stateNumber: 4,
            status: 'DRAFT',
            submissionType: 'CONTRACT_ONLY',
            riskBasedContract: false,
            programIDs: ['smmc'],
            submissionDescription: 'description',
            stateCode: 'FL',
            rateInfos: [],
            documents: [],
            contractDocuments: [],
            stateContacts: [],
            addtlActuaryContacts: [],
            managedCareEntities: [],
            federalAuthorities: [],
        }

        // we want to figure out what error is returned for a constraint violation.
        const protobuf = toProtoBuffer(draft)

        const buffer = Buffer.from(protobuf)

        try {
            await client.healthPlanPackageTable.create({
                data: {
                    id: draft.id,
                    stateCode: draft.stateCode,
                    revisions: {
                        create: {
                            id: uuidv4(),
                            createdAt: new Date(),
                            formDataProto: buffer,
                        },
                    },
                },
            })

            await client.healthPlanPackageTable.create({
                data: {
                    id: draft.id,
                    stateCode: draft.stateCode,
                    revisions: {
                        create: {
                            id: uuidv4(),
                            createdAt: new Date(),
                            formDataProto: buffer,
                        },
                    },
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
