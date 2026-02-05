import { adminUser } from '../../utils/apollo-test-utils'
import {
    FetchCurrentUserDocument,
    FetchCurrentUserQuery,
} from '../../gen/gqlClient'

describe('thirdPartyAPIAccess', () => {
    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })

    //Skipping tests for now until there's a final decision on what to do with the APIAccess page
    it.skip('gets an error back without authentication', () => {
        // get the API URL!
        const url = Cypress.env('API_URL')
        const api_url = url + '/v1/graphql/external'

        cy.request({
            url: api_url,
            headers: {
                Authorization: 'Bearer foobar',
            },
            failOnStatusCode: false,
        }).then((res) => {
            expect(res.status).to.equal(403) // unauthenticated??
        })
    })
    //Skipping tests for now until there's a final decision on what to do with the APIAccess page
    it.skip('gets an error back without no auth header sent', () => {
        // get the API URL!
        const url = Cypress.env('API_URL')
        const api_url = url + '/v1/graphql/external'

        cy.request({
            url: api_url,
            failOnStatusCode: false,
        }).then((res) => {
            expect(res.status).to.equal(401) // unauthenticated
        })
    })

    it('can make delegated API request', () => {
        // Log in as our API and delegated users to seed the DB
        cy.logInAsCMSUser({ cmsUser: 'ZUKO' }) // our OAuth client user
        cy.logOut()

        cy.logInAsCMSUser({ cmsUser: 'AZULA' }) // our delegated user
        cy.logOut()

        // Create the OAuth client using ZUKO
        cy.apiCreateOAuthClient(adminUser(), 'ZUKO', 'AZULA').then(
            (response) => {
                const { client, delegatedUser } = response
                cy.apiRequestOAuthToken(client).then((token) => {
                    //Make a delegated request
                    cy.thirdPartyApiRequest<FetchCurrentUserQuery>({
                        token,
                        document: FetchCurrentUserDocument,
                        delegatedUserId: delegatedUser.id,
                    }).then((result) => {
                        const user = result.data?.fetchCurrentUser

                        // expect our delegated user to be in the response data.
                        expect(user.id).to.equal(delegatedUser.id)
                    })
                })
            }
        )
    })
})
