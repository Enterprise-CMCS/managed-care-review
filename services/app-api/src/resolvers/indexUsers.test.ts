import { InsertUserArgsType, isStoreError, NewPostgresStore } from '../postgres'
import INDEX_USERS from '../../../app-graphql/src/queries/indexUsers.graphql'
import { v4 as uuidv4 } from 'uuid'
import { constructTestPostgresServer } from '../testHelpers/gqlHelpers'
import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
import { UserEdge, User } from '../gen/gqlServer'
import { UserType } from '../domain-models'
import { assertAnError } from '../testHelpers'

describe('indexUsers', () => {
    it('lists all known users', async () => {
        const testAdminUser: UserType = {
            id: 'd60e82de-13d7-459b-825e-61ce6ca2eb36',
            role: 'ADMIN_USER',
            email: 'iroh@example.com',
            familyName: 'Iroh',
            givenName: 'Uncle',
        }

        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser,
            },
        })

        // setup users in the db for us to index
        const usersToInsert: InsertUserArgsType[] = [
            {
                userID: uuidv4(),
                role: 'STATE_USER',
                givenName: 'Aang',
                familyName: 'Avatar',
                email: `aang+${uuidv4()}@example.com`,
                stateCode: 'VA',
            },
            {
                userID: uuidv4(),
                role: 'CMS_USER',
                givenName: 'Zuko',
                familyName: 'Firebender',
                email: `zuko+${uuidv4()}@example.com`,
            },
            {
                userID: uuidv4(),
                role: 'STATE_USER',
                givenName: 'Katara',
                familyName: 'Waterbender',
                email: `katara+${uuidv4()}@example.com`,
                stateCode: 'VA',
            },
            {
                userID: uuidv4(),
                role: 'CMS_USER',
                givenName: 'Suki',
                familyName: 'Warrior',
                email: `suki+${uuidv4()}@example.com`,
            },
            {
                userID: uuidv4(),
                role: 'ADMIN_USER',
                givenName: 'Iroh',
                familyName: 'Uncle',
                email: `iroh+${uuidv4()}@example.com`,
            },
        ]

        for (const userToInsert of usersToInsert) {
            const newUser = await postgresStore.insertUser(userToInsert)
            if (isStoreError(newUser)) {
                throw new Error(newUser.code)
            }
        }

        const updateRes = await server.executeOperation({
            query: INDEX_USERS,
        })

        expect(updateRes.data).toBeDefined()
        expect(updateRes.errors).toBeUndefined()

        const ourUserIDs = usersToInsert.map((u) => u.userID)
        const ourUsers = updateRes.data?.indexUsers.edges
            .filter((edge: UserEdge) => ourUserIDs.includes(edge.node.id))
            .map((edge: UserEdge) => edge.node)

        expect(ourUsers).toHaveLength(usersToInsert.length)

        const familyNamesInOrder = ourUsers.map((u: User) => u.familyName)
        expect(familyNamesInOrder).toEqual([
            'Avatar',
            'Firebender',
            'Uncle',
            'Warrior',
            'Waterbender',
        ])
    })

    it('returns an error if called by a State user', async () => {
        const testCMSUser: UserType = {
            id: 'd60e82de-13d7-459b-825e-61ce6ca2eb36',
            role: 'CMS_USER',
            email: 'iroh@example.com',
            familyName: 'Iroh',
            givenName: 'Uncle',
            stateAssignments: [],
        }

        const server = await constructTestPostgresServer({
            context: {
                user: testCMSUser,
            },
        })

        const updateRes = await server.executeOperation({
            query: INDEX_USERS,
            variables: {
                input: {
                    cmsUserID: uuidv4(),
                    stateAssignments: ['CA'],
                },
            },
        })

        expect(assertAnError(updateRes).message).toBe(
            'user not authorized to fetch users'
        )
    })

    it('returns an error if called by a CMS user', async () => {
        const server = await constructTestPostgresServer()

        const updateRes = await server.executeOperation({
            query: INDEX_USERS,
            variables: {
                input: {
                    cmsUserID: uuidv4(),
                    stateAssignments: ['CA'],
                },
            },
        })

        expect(assertAnError(updateRes).message).toBe(
            'user not authorized to fetch users'
        )
    })
})
