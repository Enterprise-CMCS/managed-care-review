import { ZodError } from 'zod'
import { mcreviewproto } from '../../../gen/healthPlanFormDataProto'
import {
    basicLockedHealthPlanFormData,
    basicHealthPlanFormData,
    unlockedWithALittleBitOfEverything,
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
        // { newHealthPlanFormData },
        // { basicHealthPlanFormData },
        // { contractOnly },
        // { unlockedWithContacts },
        // { unlockedWithDocuments },
        // { unlockedWithFullRates },
        // { unlockedWithFullContracts },
        { unlockedWithALittleBitOfEverything },
        // { basicLockedHealthPlanFormData },
        // { contractAmendedOnly },
    ])('write proto %j to disk if changed)', (testCase: testType) => {
        const testName = Object.keys(testCase)[0]
        const domainObjectGenerator = testCase[testName]
        const domainObject = domainObjectGenerator()
        const protoBytes = toProtoBuffer(domainObject)
        const fileDate = new Date().toISOString().split('T')[0]
        const fileName = `${testName}-${fileDate}.proto`
        const filePath = path.join(TEST_DATA_PATH, fileName)

        // find every file in testData that is for this test case
        const testFiles = fs.readdirSync(TEST_DATA_PATH)
        const testCaseFileNames = testFiles.filter((f) =>
            f.startsWith(testName + '-')
        )

        if (testCaseFileNames.length === 0) {
            console.log('Writing initial test file for', testName)
            fs.writeFileSync(filePath, protoBytes)
        } else {
            // The last one is the most recent
            const mostRecentTestfileName =
                testCaseFileNames[testCaseFileNames.length - 1]
            const mostRecentTestfilePath = path.join(
                TEST_DATA_PATH,
                mostRecentTestfileName
            )
            const mostRecentProtoBytes = fs.readFileSync(mostRecentTestfilePath)

            // If our .proto bytes output has changed since the last time we wrote out a proto, write a new proto out.
            // This should probably be overrideable at some point.
            if (!mostRecentProtoBytes.equals(protoBytes)) {
                console.log(testName, 'has changed, writing a new version')
                fs.writeFileSync(filePath, protoBytes)
            }
        }
        expect(protoBytes).not.toBe([])
    })
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
