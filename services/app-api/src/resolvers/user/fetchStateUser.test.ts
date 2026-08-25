import { v4 as uuidv4 } from 'uuid'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import type { InsertUserArgsType } from '../../postgres'
import { NewPostgresStore } from '../../postgres'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { testAdminUser } from '../../testHelpers/userHelpers'
import { FetchStateUserDocument } from '../../gen/gqlClient'

describe('fetchStateUser', () => {
    const insertTestUsers = async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        const stateUserToInsert: InsertUserArgsType = {
            userID: uuidv4(),
            role: 'STATE_USER',
            givenName: 'Aang',
            familyName: 'Avatar',
            email: `aang+${uuidv4()}@example.com`,
            stateCode: 'VA',
        }

        const cmsUserToInsert: InsertUserArgsType = {
            userID: uuidv4(),
            role: 'CMS_USER',
            givenName: 'Zuko',
            familyName: 'Firebender',
            email: `zuko+${uuidv4()}@example.com`,
        }

        const newUsers = await postgresStore.insertManyUsers([
            stateUserToInsert,
            cmsUserToInsert,
        ])

        if (newUsers instanceof Error) {
            throw newUsers
        }

        return { postgresStore, stateUserToInsert, cmsUserToInsert }
    }

    it('returns the state user matching the given email', async () => {
        const { postgresStore, stateUserToInsert } = await insertTestUsers()

        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser(),
            },
        })

        const res = await executeGraphQLOperation(server, {
            query: FetchStateUserDocument,
            variables: {
                input: { email: stateUserToInsert.email },
            },
        })

        expect(res.errors).toBeUndefined()

        const user = res.data?.fetchStateUser.user
        expect(user).toEqual(
            expect.objectContaining({
                id: stateUserToInsert.userID,
                role: 'STATE_USER',
                email: stateUserToInsert.email,
                givenName: stateUserToInsert.givenName,
                familyName: stateUserToInsert.familyName,
            })
        )
        expect(user.state.code).toBe(stateUserToInsert.stateCode)
    })

    it('returns the most recent created user if email is found multiple times', async () => {
        const { postgresStore, stateUserToInsert } = await insertTestUsers()

        const newerUser = await postgresStore.insertUser({
            ...stateUserToInsert,
            userID: uuidv4(),
        })
        if (newerUser instanceof Error) {
            throw newerUser
        }

        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser(),
            },
        })

        const res = await executeGraphQLOperation(server, {
            query: FetchStateUserDocument,
            variables: {
                input: { email: stateUserToInsert.email },
            },
        })

        expect(res.errors).toBeUndefined()
        expect(res.data?.fetchStateUser.user.id).toBe(newerUser.id)
    })
})
