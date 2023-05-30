import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitContract } from './submitContract'
import { insertDraftContract } from './insertContract'

// async function delay(ms: number) {
//     return new Promise((resolve) => setTimeout(resolve, ms))
// }

// For use in TESTS only. Throws a returned error
function must<T>(maybeErr: T | Error): T {
    if (maybeErr instanceof Error) {
        throw maybeErr
    }
    return maybeErr
}

describe('submitContract', () => {
    it('creates a submission from a draft', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        // const cmsUser = await client.user.create({
        //     data: {
        //         id: uuidv4(),
        //         givenName: 'Zuko',
        //         familyName: 'Hotman',
        //         email: 'zuko@example.com',
        //         role: 'CMS_USER',
        //     },
        // })

        // submitting before there's a draft should be an error
        expect(
            await submitContract(client, '1111', '1111', 'failed submit')
        ).toBeInstanceOf(Error)

        // create a draft contract
        const contractA = must(
            await insertDraftContract(client, 'one contract')
        )
        // submit the draft contract
        const result = must(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'initial submit'
            )
        )
        expect(result.revisions[0].submitInfo?.updatedReason).toBe(
            'initial submit'
        )
        // resubmitting should be an error
        expect(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'initial submit'
            )
        ).toBeInstanceOf(Error)
    })
})
