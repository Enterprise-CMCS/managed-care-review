import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import type { GraphQLError } from 'graphql'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    triggerValidationResolver,
    type ValidationResolverConfig,
} from './triggerValidation'
import type { Store } from '../../postgres'

const {
    spawnMock,
    childStdinEndMock,
    childStderrOnMock,
    childOnMock,
} = vi.hoisted(() => ({
    spawnMock: vi.fn(),
    childStdinEndMock: vi.fn(),
    childStderrOnMock: vi.fn(),
    childOnMock: vi.fn(),
}))

vi.mock('node:child_process', () => ({
    spawn: spawnMock,
}))

const baseConfig: ValidationResolverConfig = {
    validationFunctionName: 'test-validation-function',
    artifactBucket: 'ai-form-augmentation-artifacts',
    region: 'us-east-1',
    useLocalS3: false,
}

const buildStore = (result: unknown): Store =>
    ({
        findContractWithHistory: vi.fn().mockResolvedValue(result),
    }) as unknown as Store

const buildContractWithDraft = (documentKeys: Array<string | undefined>) => ({
    draftRevision: {
        formData: {
            contractDateStart: new Date(Date.UTC(2025, 0, 1)),
            contractDateEnd: new Date(Date.UTC(2025, 11, 31)),
            contractDocuments: documentKeys.map((s3Key, index) => ({
                id: `doc-${index}`,
                name: `Document ${index}`,
                s3URL: s3Key
                    ? `s3://local-uploads/${s3Key.replace(/^allusers\//, '')}/Document ${index}.pdf`
                    : '',
                s3BucketName: 'local-uploads',
                s3Key,
            })),
        },
    },
})

const invokeTriggerValidationResolver = async (
    resolver: NonNullable<MutationResolvers['triggerValidation']>,
    contractID = 'test-abc-123'
) => {
    if (typeof resolver === 'function') {
        return resolver({}, { input: { contractID } }, {} as never, {} as never)
    }

    return resolver.resolve(
        {},
        { input: { contractID } },
        {} as never,
        {} as never
    )
}

describe('triggerValidationResolver', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        vi.clearAllMocks()
        spawnMock.mockReturnValue({
            stdin: {
                end: childStdinEndMock,
            },
            stderr: {
                on: childStderrOnMock,
            },
            on: childOnMock,
        } as unknown as ChildProcessWithoutNullStreams)
    })

    it('starts local validation worker process when useLocalS3 is true', async () => {
        const store = buildStore(
            buildContractWithDraft([
                'allusers/1776374348125-doc-a.pdf',
                'allusers/1776374348126-doc-b.pdf',
            ])
        )

        const sendSpy = vi
            .spyOn(LambdaClient.prototype, 'send')
            .mockResolvedValue({} as never)

        const resolver = triggerValidationResolver(store, {
            ...baseConfig,
            useLocalS3: true,
        }) as NonNullable<MutationResolvers['triggerValidation']>

        const result = await invokeTriggerValidationResolver(resolver)

        expect(result.ok).toBe(true)
        expect(result.artifactVersion).toEqual(expect.any(String))

        expect(spawnMock).toHaveBeenCalledTimes(1)
        expect(spawnMock).toHaveBeenCalledWith(
            'pnpm',
            ['--filter', 'ai-form-augmentation', 'exec', 'tsx', 'src/runValidation.ts'],
            expect.objectContaining({
                cwd: expect.stringMatching(/managed-care-review$/),
                stdio: ['pipe', 'ignore', 'pipe'],
            })
        )
        expect(childStdinEndMock).toHaveBeenCalledTimes(1)

        const serializedPayload = childStdinEndMock.mock.calls[0][0]
        expect(JSON.parse(serializedPayload)).toEqual(
            expect.objectContaining({
                formId: 'test-abc-123',
                bucket: 'ai-form-augmentation-artifacts',
                artifactVersion: expect.any(String),
                formFields: [
                    {
                        field: 'contractStartDate',
                        label: 'Contract Start Date',
                        value: '01/01/2025',
                    },
                    {
                        field: 'contractEndDate',
                        label: 'Contract End Date',
                        value: '12/31/2025',
                    },
                ],
                documents: [
                    {
                        documentName: 'Document 0',
                        sourceBucket: 'local-uploads',
                        sourceKey: '1776374348125-doc-a.pdf',
                    },
                    {
                        documentName: 'Document 1',
                        sourceBucket: 'local-uploads',
                        sourceKey: '1776374348126-doc-b.pdf',
                    },
                ],
                s3Config: expect.objectContaining({
                    region: 'us-east-1',
                    endpoint: 'http://localhost:4566',
                    forcePathStyle: true,
                    credentials: {
                        accessKeyId: 'test',
                        secretAccessKey: 'test', // pragma: allowlist secret
                    },
                }),
            })
        )

        expect(sendSpy).not.toHaveBeenCalled()
    })

    it('uses Lambda invoke when useLocalS3 is false', async () => {
        const store = buildStore(
            buildContractWithDraft([
                'uploads/contracts/doc-a.pdf',
                'uploads/contracts/doc-b.pdf',
            ])
        )

        const sendSpy = vi
            .spyOn(LambdaClient.prototype, 'send')
            .mockResolvedValue({} as never)

        const resolver = triggerValidationResolver(store, {
            ...baseConfig,
            useLocalS3: false,
        }) as NonNullable<MutationResolvers['triggerValidation']>

        const result = await invokeTriggerValidationResolver(resolver)

        expect(result.ok).toBe(true)
        expect(result.artifactVersion).toEqual(expect.any(String))

        expect(sendSpy).toHaveBeenCalledTimes(1)
        expect(spawnMock).not.toHaveBeenCalled()

        const sentCommand = sendSpy.mock.calls[0][0]
        expect(sentCommand).toBeInstanceOf(InvokeCommand)
    })

    it('throws BAD_USER_INPUT when draft revision is missing', async () => {
        const store = buildStore({
            draftRevision: null,
        })

        const resolver = triggerValidationResolver(
            store,
            baseConfig
        ) as NonNullable<MutationResolvers['triggerValidation']>

        await expect(
            invokeTriggerValidationResolver(resolver)
        ).rejects.toMatchObject({
            extensions: {
                code: 'BAD_USER_INPUT',
                cause: 'MISSING_REVISION',
            },
        } satisfies Partial<GraphQLError>)
    })

    it('throws BAD_USER_INPUT when no persisted s3 keys exist', async () => {
        const store = buildStore(
            buildContractWithDraft([undefined, undefined, undefined])
        )

        const resolver = triggerValidationResolver(
            store,
            baseConfig
        ) as NonNullable<MutationResolvers['triggerValidation']>

        await expect(
            invokeTriggerValidationResolver(resolver)
        ).rejects.toMatchObject({
            extensions: {
                code: 'BAD_USER_INPUT',
                cause: 'MISSING_DOCUMENT_KEYS',
            },
        } satisfies Partial<GraphQLError>)
    })

    it('throws BAD_USER_INPUT when no draft contract dates can be validated', async () => {
        const store = buildStore({
            draftRevision: {
                formData: {
                    contractDateStart: undefined,
                    contractDateEnd: undefined,
                    contractDocuments: [
                        {
                            id: 'doc-0',
                            name: 'Document 0',
                            s3BucketName: 'local-uploads',
                            s3Key: 'uploads/contracts/doc-a.pdf',
                        },
                    ],
                },
            },
        })

        const resolver = triggerValidationResolver(
            store,
            baseConfig
        ) as NonNullable<MutationResolvers['triggerValidation']>

        await expect(
            invokeTriggerValidationResolver(resolver)
        ).rejects.toMatchObject({
            extensions: {
                code: 'BAD_USER_INPUT',
                cause: 'MISSING_FORM_FIELDS',
            },
        } satisfies Partial<GraphQLError>)
    })
})
