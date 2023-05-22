import { unlockedWithALittleBitOfEverything } from '../../healthPlanFormDataMocks'
import {
    UnlockedHealthPlanFormDataType,
    LockedHealthPlanFormDataType,
} from '../../healthPlanFormDataType'
import { toProtoBuffer } from './toProtoBuffer'
import fs from 'fs'
import path from 'path'

import { test, expect } from '@jest/globals'

// this is relative to app-web since that's where tests are run from
const TEST_DATA_PATH = './src/proto/healthPlanFormDataProto/testData'

// This "test" makes no assertions, instead it monitors our mock protos (unlockedWithALittleBitOfEverything
// at the time of this writing) and if it's serialized protobuf representation changes, it writes that to a new .proto
// file to our testData directory where it can be tested.
describe('If our test domain models have changed, write a new .proto to testData', () => {
    interface testType {
        [name: string]: () =>
            | UnlockedHealthPlanFormDataType
            | LockedHealthPlanFormDataType
    }

    test.each([
        { unlockedWithALittleBitOfEverything },
        // { basicLockedHealthPlanFormData },
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
            console.info('Writing initial test file for', testName)
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
            // This should probably be overrideable at some point if we don't want to make a new proto
            if (!mostRecentProtoBytes.equals(protoBytes)) {
                console.info(testName, 'has changed, writing a new version')
                fs.writeFileSync(filePath, protoBytes)
            }
        }
        expect(protoBytes).not.toBe([])
    })
})
