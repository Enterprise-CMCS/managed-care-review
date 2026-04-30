import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import type { GraphQLError } from 'graphql'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MutationResolvers } from '../../gen/gqlServer'
import { testAdminUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    triggerValidationResolver,
    type ValidationResolverConfig,
} from './triggerValidation'
import type { Store } from '../../postgres'
import type { Context } from '../../handlers/apollo_gql'

const {
    spawnMock,
    childStdinEndMock,
    childStderrOnMock,
    childOnMock,
    childKillMock,
    childUnrefMock,
} = vi.hoisted(() => ({
    spawnMock: vi.fn(),
    childStdinEndMock: vi.fn(),
    childStderrOnMock: vi.fn(),
    childOnMock: vi.fn(),
    childKillMock: vi.fn(),
    childUnrefMock: vi.fn(),
}))

vi.mock('node:child_process', () => ({
    spawn: spawnMock,
}))

const baseConfig: ValidationResolverConfig = {
    validationFunctionName: 'test-validation-function',
    artifactBucket: 'ai-form-augmentation-artifacts',
    region: 'us-east-1',
    useLocalS3: false,
    defaultWorkSelectionMode: 'gated-first-pass',
}

const buildStore = (result: unknown): Store =>
    ({
        findContractWithHistory: vi.fn().mockResolvedValue(result),
    }) as unknown as Store

const buildContractWithDraft = (documentKeys: Array<string | undefined>) => ({
    stateCode: 'FL',
    draftRevision: {
        formData: {
            contractDateStart: new Date(Date.UTC(2025, 0, 1)),
            contractDateEnd: new Date(Date.UTC(2025, 11, 31)),
            contractDocuments: documentKeys.map((s3Key, index) => ({
                id: `doc-${index}`,
                name: `Document ${index}`,
                sha256: `sha-${index}`,
                s3URL: s3Key
                    ? `s3://local-uploads/${s3Key.replace(/^allusers\//, '')}/Document ${index}.pdf`
                    : '',
                s3BucketName: 'local-uploads',
                s3Key,
            })),
        },
    },
})

const buildContractWithDraftDocuments = (
    contractDocuments: Array<Record<string, unknown>>
) => ({
    stateCode: 'FL',
    draftRevision: {
        formData: {
            contractDateStart: new Date(Date.UTC(2025, 0, 1)),
            contractDateEnd: new Date(Date.UTC(2025, 11, 31)),
            contractDocuments,
        },
    },
})

const invokeTriggerValidationResolver = async (
    resolver: NonNullable<MutationResolvers['triggerValidation']>,
    contractID = 'test-abc-123',
    context: Context = { user: testAdminUser() }
) => {
    if (typeof resolver === 'function') {
        return resolver({}, { input: { contractID } }, context, {} as never)
    }

    return resolver.resolve({}, { input: { contractID } }, context, {} as never)
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
            kill: childKillMock,
            unref: childUnrefMock,
        } as unknown as ChildProcessWithoutNullStreams)
    })

    afterEach(() => {
        vi.useRealTimers()
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
            [
                '--filter',
                'ai-form-augmentation',
                'exec',
                'tsx',
                'src/runValidation.ts',
            ],
            expect.objectContaining({
                cwd: expect.stringMatching(/managed-care-review$/),
                stdio: ['pipe', 'ignore', 'pipe'],
            })
        )
        expect(childUnrefMock).toHaveBeenCalledTimes(1)
        expect(childStdinEndMock).toHaveBeenCalledTimes(1)

        const serializedPayload = childStdinEndMock.mock.calls[0][0]
        expect(JSON.parse(serializedPayload)).toEqual(
            expect.objectContaining({
                formId: 'test-abc-123',
                bucket: 'ai-form-augmentation-artifacts',
                artifactVersion: expect.any(String),
                triggerAcceptedAt: expect.any(String),
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
                        sourceSha256: 'sha-0',
                    },
                    {
                        documentName: 'Document 1',
                        sourceBucket: 'local-uploads',
                        sourceKey: '1776374348126-doc-b.pdf',
                        sourceSha256: 'sha-1',
                    },
                ],
                workSelectionMode: 'gated-first-pass',
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

    it('resolves the local worker cwd independently of process cwd', async () => {
        const processCwdSpy = vi
            .spyOn(process, 'cwd')
            .mockReturnValue('/tmp/not-the-repo-root')
        const store = buildStore(
            buildContractWithDraft(['allusers/1776374348125-doc-a.pdf'])
        )
        const resolver = triggerValidationResolver(store, {
            ...baseConfig,
            useLocalS3: true,
        }) as NonNullable<MutationResolvers['triggerValidation']>

        await invokeTriggerValidationResolver(resolver)

        expect(processCwdSpy).not.toHaveBeenCalled()
        expect(spawnMock).toHaveBeenCalledWith(
            'pnpm',
            expect.any(Array),
            expect.objectContaining({
                cwd: expect.stringMatching(/managed-care-review$/),
            })
        )
    })

    it('terminates a stalled local worker after the timeout window', async () => {
        vi.useFakeTimers()

        const store = buildStore(
            buildContractWithDraft(['allusers/1776374348125-doc-a.pdf'])
        )
        const resolver = triggerValidationResolver(store, {
            ...baseConfig,
            useLocalS3: true,
        }) as NonNullable<MutationResolvers['triggerValidation']>

        await invokeTriggerValidationResolver(resolver)
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

        expect(childKillMock).toHaveBeenCalledWith('SIGTERM')
    })

    it('logs local worker stderr one trimmed line at a time', async () => {
        const consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined)
        const store = buildStore(
            buildContractWithDraft(['allusers/1776374348125-doc-a.pdf'])
        )
        const resolver = triggerValidationResolver(store, {
            ...baseConfig,
            useLocalS3: true,
        }) as NonNullable<MutationResolvers['triggerValidation']>

        await invokeTriggerValidationResolver(resolver)

        const stderrHandler = childStderrOnMock.mock.calls.find(
            ([event]) => event === 'data'
        )?.[1] as ((chunk: Buffer) => void) | undefined
        const exitHandler = childOnMock.mock.calls.find(
            ([event]) => event === 'exit'
        )?.[1] as ((code: number | null) => void) | undefined

        stderrHandler?.(Buffer.from('first line\nsecond'))
        stderrHandler?.(Buffer.from(' line\n'))
        exitHandler?.(0)

        expect(consoleErrorSpy).toHaveBeenCalledWith({
            message: 'triggerValidation.localExecution failed',
            operation: 'triggerValidation.localExecution',
            status: 'ERROR',
            error: 'first line',
        })
        expect(consoleErrorSpy).toHaveBeenCalledWith({
            message: 'triggerValidation.localExecution failed',
            operation: 'triggerValidation.localExecution',
            status: 'ERROR',
            error: 'second line',
        })
    })

    it('changes artifactVersion when document content fingerprint changes at the same key', async () => {
        const contractID = 'test-abc-123'
        const buildContract = (sha256: string) =>
            buildContractWithDraftDocuments([
                {
                    id: 'doc-0',
                    name: 'Document 0',
                    sha256,
                    s3URL: 's3://local-uploads/1776374348125-doc-a.pdf/Document 0.pdf',
                    s3BucketName: 'local-uploads',
                    s3Key: 'allusers/1776374348125-doc-a.pdf',
                },
            ])

        const firstResolver = triggerValidationResolver(
            buildStore(buildContract('sha-a')),
            {
                ...baseConfig,
                useLocalS3: true,
            }
        ) as NonNullable<MutationResolvers['triggerValidation']>
        const secondResolver = triggerValidationResolver(
            buildStore(buildContract('sha-b')),
            {
                ...baseConfig,
                useLocalS3: true,
            }
        ) as NonNullable<MutationResolvers['triggerValidation']>

        const firstResult = await invokeTriggerValidationResolver(
            firstResolver,
            contractID
        )
        const secondResult = await invokeTriggerValidationResolver(
            secondResolver,
            contractID
        )

        expect(firstResult.artifactVersion).not.toEqual(
            secondResult.artifactVersion
        )
    })

    it('forbids a state user from triggering validation for another state contract', async () => {
        const store = buildStore({
            ...buildContractWithDraft(['uploads/contracts/doc-a.pdf']),
            stateCode: 'MN',
        })
        const resolver = triggerValidationResolver(
            store,
            baseConfig
        ) as NonNullable<MutationResolvers['triggerValidation']>

        const result = invokeTriggerValidationResolver(
            resolver,
            'test-abc-123',
            {
                user: testStateUser({ stateCode: 'FL' }),
            }
        )

        await expect(result).rejects.toMatchObject({
            message:
                'User from state FL not allowed to access contract from MN',
            extensions: {
                code: 'FORBIDDEN',
                cause: 'INVALID_STATE_REQUESTER',
            },
        })

        expect(spawnMock).not.toHaveBeenCalled()
    })

    it('forbids an OAuth client without read permission from triggering validation', async () => {
        const store = buildStore(
            buildContractWithDraft(['uploads/contracts/doc-a.pdf'])
        )
        const resolver = triggerValidationResolver(
            store,
            baseConfig
        ) as NonNullable<MutationResolvers['triggerValidation']>

        const result = invokeTriggerValidationResolver(
            resolver,
            'test-abc-123',
            {
                user: testStateUser(),
                oauthClient: {
                    clientId: 'client-123',
                    iss: 'https://issuer.example',
                    grants: ['authorization_code'],
                    scopes: [],
                    isDelegatedUser: false,
                },
            }
        )

        await expect(result).rejects.toMatchObject({
            message: 'OAuth client does not have read permissions',
            extensions: {
                code: 'FORBIDDEN',
                cause: 'INSUFFICIENT_OAUTH_GRANTS',
            },
        })

        expect(spawnMock).not.toHaveBeenCalled()
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

    it('keeps the all-doc baseline-comparison override when runtime default is overridden', async () => {
        const store = buildStore(
            buildContractWithDraft([
                'allusers/1776374348125-doc-a.pdf',
                'allusers/1776374348126-doc-b.pdf',
            ])
        )

        const resolver = triggerValidationResolver(store, {
            ...baseConfig,
            useLocalS3: true,
            defaultWorkSelectionMode: 'all-doc',
        }) as NonNullable<MutationResolvers['triggerValidation']>

        const result = await invokeTriggerValidationResolver(resolver)

        expect(result.ok).toBe(true)
        expect(childStdinEndMock).toHaveBeenCalledTimes(1)

        const serializedPayload = childStdinEndMock.mock.calls[0][0]
        expect(JSON.parse(serializedPayload)).not.toHaveProperty(
            'workSelectionMode'
        )
    })

    it('passes only eligible PDF documents to the worker and logs skipped diagnostics', async () => {
        const consoleInfoSpy = vi
            .spyOn(console, 'info')
            .mockImplementation(() => undefined)
        const store = buildStore(
            buildContractWithDraftDocuments([
                {
                    id: 'doc-0',
                    name: 'Eligible Contract.PDF',
                    s3URL: 's3://local-uploads/1776374348125-doc-a.pdf/Eligible Contract.PDF',
                    s3BucketName: 'local-uploads',
                    s3Key: 'allusers/1776374348125-doc-a.pdf',
                },
                {
                    id: 'doc-1',
                    name: 'Supporting Rate.docx',
                    s3URL: 's3://local-uploads/1776374348126-doc-b.docx',
                    s3BucketName: 'local-uploads',
                    s3Key: 'allusers/1776374348126-doc-b.docx',
                },
                {
                    id: 'doc-2',
                    name: 'Mime Mismatch.pdf',
                    s3URL: 's3://local-uploads/1776374348127-doc-c.pdf',
                    s3BucketName: 'local-uploads',
                    s3Key: 'allusers/1776374348127-doc-c.pdf',
                    contentType:
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                },
            ])
        )

        const resolver = triggerValidationResolver(store, {
            ...baseConfig,
            useLocalS3: true,
        }) as NonNullable<MutationResolvers['triggerValidation']>

        const result = await invokeTriggerValidationResolver(resolver)

        expect(result.ok).toBe(true)
        expect(childStdinEndMock).toHaveBeenCalledTimes(1)

        const serializedPayload = childStdinEndMock.mock.calls[0][0]
        expect(JSON.parse(serializedPayload)).toEqual(
            expect.objectContaining({
                triggerAcceptedAt: expect.any(String),
                documents: [
                    {
                        documentName: 'Eligible Contract.PDF',
                        sourceBucket: 'local-uploads',
                        sourceKey: '1776374348125-doc-a.pdf',
                    },
                ],
                documentDiagnostics: [
                    {
                        documentName: 'Supporting Rate.docx',
                        status: 'skipped',
                        usable: false,
                        chunkCount: 0,
                        reason: 'missing-pdf-extension',
                    },
                    {
                        documentName: 'Mime Mismatch.pdf',
                        status: 'skipped',
                        usable: false,
                        chunkCount: 0,
                        reason: 'content-type-mismatch',
                    },
                ],
            })
        )
        expect(consoleInfoSpy).toHaveBeenCalledWith(
            'triggerValidation skipped unsupported documents',
            {
                contractID: 'test-abc-123',
                skippedDocumentCount: 2,
                skippedDocumentReasons: [
                    {
                        reason: 'missing-pdf-extension',
                        count: 1,
                    },
                    {
                        reason: 'content-type-mismatch',
                        count: 1,
                    },
                ],
            }
        )
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

    it('throws BAD_USER_INPUT when no eligible PDF documents exist', async () => {
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
                cause: 'MISSING_ELIGIBLE_DOCUMENTS',
            },
        } satisfies Partial<GraphQLError>)
    })

    it('does not invoke the worker when all documents are unsupported', async () => {
        const store = buildStore(
            buildContractWithDraftDocuments([
                {
                    id: 'doc-0',
                    name: 'Supporting Rate.docx',
                    s3BucketName: 'local-uploads',
                    s3Key: 'allusers/1776374348125-doc-a.docx',
                },
            ])
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
                cause: 'MISSING_ELIGIBLE_DOCUMENTS',
            },
        } satisfies Partial<GraphQLError>)
        expect(spawnMock).not.toHaveBeenCalled()
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
