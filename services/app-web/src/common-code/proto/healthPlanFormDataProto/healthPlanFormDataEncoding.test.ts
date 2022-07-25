import { ZodError } from 'zod'
import { mcreviewproto } from '../../../gen/healthPlanFormDataProto'
import {
    basicLockedHealthPlanFormData,
    basicHealthPlanFormData,
    contractOnly,
    contractAmendedOnly,
    unlockedWithALittleBitOfEverything,
    unlockedWithContacts,
    unlockedWithDocuments,
    unlockedWithFullContracts,
    unlockedWithFullRates,
    newHealthPlanFormData,
} from '../../healthPlanFormDataMocks'
import {
    UnlockedHealthPlanFormDataType,
    isLockedHealthPlanFormData,
    LockedHealthPlanFormDataType,
} from '../../healthPlanFormDataType'
import { toDomain } from './toDomain'
import { toProtoBuffer } from './toProtoBuffer'
import fs from 'fs'
import path from 'path'

// this is relative to app-web since that's where tests are run from
const TEST_DATA_PATH = 'src/common-code/proto/healthPlanFormDataProto/testData/'

describe('Validate encoding to protobuf and decoding back to domain model', () => {
    if (!isLockedHealthPlanFormData(basicLockedHealthPlanFormData())) {
        throw new Error(
            'Bad test, the state submission is not a state submission'
        )
    }

    interface testType {
        [name: string]: () =>
            | UnlockedHealthPlanFormDataType
            | LockedHealthPlanFormDataType
    }

    test.each<testType>([
        { newHealthPlanFormData },
        { basicHealthPlanFormData },
        { contractOnly },
        { unlockedWithContacts },
        { unlockedWithDocuments },
        { unlockedWithFullRates },
        { unlockedWithFullContracts },
        { unlockedWithALittleBitOfEverything },
        { basicLockedHealthPlanFormData },
        { contractAmendedOnly },
    ])(
        'given valid domain model %j expect protobufs to be symmetric)',
        (testCase: testType) => {
            const testName = Object.keys(testCase)[0]
            const domainObjectGenerator = testCase[testName]
            const domainObject = domainObjectGenerator()
            const protoBytes = toProtoBuffer(domainObject)
            const fileDate = new Date().toISOString().split('T')[0]
            const fileName = `${testName}-${fileDate}.proto`
            const filePath = path.join(TEST_DATA_PATH, fileName)

            // TODO: Only writeFileSync when something has changed?
            // --- if the most recent proto is different from todays, we write a new one
            // --- if the most recent solution is different from todays, we write a new one? -- we offer to write a new one?
            // --- if we change the solution, we can't still expect old protos to match? Just new ones?
            // --- if we add a field, we expect an old one to still decode, but to have undefined for the new fields.

            fs.writeFileSync(filePath, protoBytes)

            // find all test data that is associated with this specific test
            // assert that it decodes correctly

            // find every file in testData
            const testFiles = fs.readdirSync(TEST_DATA_PATH)
            const testCaseFileNames = testFiles.filter((f) =>
                f.startsWith(testName + '-')
            )

            for (const testInputFileName of testCaseFileNames) {
                const testFilePath = path.join(
                    TEST_DATA_PATH,
                    testInputFileName
                )
                const testProtoBytes = fs.readFileSync(testFilePath)

                expect(toDomain(testProtoBytes)).toEqual(domainObject)
            }

            expect(toDomain(protoBytes)).toEqual(domainObject)
        }
    )
})

describe('handles invalid data as expected', () => {
    it('toDomain errors when passed an empty proto message', () => {
        const protoMessage = new mcreviewproto.HealthPlanFormData({})
        const encodedEmpty =
            mcreviewproto.HealthPlanFormData.encode(protoMessage).finish()

        const maybeError = toDomain(encodedEmpty)

        expect(maybeError).toBeInstanceOf(Error)
        expect(maybeError.toString()).toBe(
            'Error: Unknown or missing status on this proto. Cannot decode.'
        )
    })

    it('toDomain returns a decode error when passed an invalid FormData', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invalidDraft = Object.assign({}, basicHealthPlanFormData()) as any
        delete invalidDraft.id
        delete invalidDraft.stateNumber
        invalidDraft.submissionType = 'nonsense'

        const encoded = toProtoBuffer(invalidDraft)
        const decodeErr = toDomain(encoded)

        expect(decodeErr).toBeInstanceOf(Error)

        // the zod error should note these three fields are wrong
        const zErr = decodeErr as ZodError
        expect(zErr.issues.flatMap((zodErr) => zodErr.path)).toEqual([
            'id',
            'stateNumber',
            'submissionType',
        ])
    })

    it('toDomain returns a decode error when passed an invalid StateSubmission', () => {
        const invalidSubmission = Object.assign(
            {},
            basicLockedHealthPlanFormData()
        ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
        delete invalidSubmission.id
        delete invalidSubmission.stateNumber
        invalidSubmission.documents = []
        invalidSubmission.submissionType = 'nonsense'

        const encoded = toProtoBuffer(invalidSubmission)
        const decodeErr = toDomain(encoded)

        expect(decodeErr).toBeInstanceOf(Error)
        expect(decodeErr.toString()).toBe(
            'Error: ERROR: attempting to parse state submission proto failed'
        )
    })
})
