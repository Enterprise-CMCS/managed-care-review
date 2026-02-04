import { adminUser } from '../../utils/apollo-test-utils'

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

    // OAuth API request with a delegated user test
    it('can make delegated API request', () => {
        const url = Cypress.env('API_URL')
        const api_url = url + '/v1/graphql/external'
        const token_url = url + '/oauth/token'

        // Log in as our API and delegated users to seed the DB
        cy.logInAsCMSUser({ cmsUser: 'ZUKO' }) // our OAuth client user
        cy.logOut()

        cy.logInAsCMSUser({ cmsUser: 'AZULA' }) // our delegated user
        cy.logOut()

        // Create the OAuth client using ZUKO
        cy.apiCreateOAuthClient(adminUser(), 'ZUKO', 'AZULA').then((response) => {
            const { client, delegatedUser } = response
            cy.log('OAuth client ID: ' + client.clientId)
            cy.log('Delegated user ID: ' + delegatedUser.id)
            console.log(
                'Full apiCreateOAuthClient response:',
                JSON.stringify(response, null, 2)
            )

            // Use window.fetch with credentials: 'omit' for both token and delegated requests
            // to avoid Cypress sending session cookies that interfere with OAuth flows.
            cy.window().then((win) =>
                win.fetch(token_url, {
                    method: 'POST',
                    credentials: 'omit',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        grant_type: 'client_credentials',
                        client_id: client.clientId,
                        client_secret: client.clientSecret,
                    }).toString(),
                }).then((fetchRes) =>
                    fetchRes.json().then((body) => ({
                        status: fetchRes.status,
                        body,
                    }))
                )
            ).then((res) => {
                expect(res.status).to.equal(200) // okay

                const token = res.body.access_token

                expect(token).to.exist

                //Make a delegated request using window.fetch with credentials omit
                //to avoid cy.request sending session cookies that interfere with OAuth delegation.
                cy.window().then((win) =>
                    win.fetch(api_url, {
                        method: 'POST',
                        credentials: 'omit',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                            'X-Acting-As-User': `${delegatedUser.id}`,
                        },
                        body: JSON.stringify({
                            query: `query FetchCurrentUser {
                              fetchCurrentUser {
                                ... on CMSUser {
                                  id
                                  role
                                  email
                                  givenName
                                  familyName
                                  divisionAssignment
                                }
                                ... on CMSApproverUser {
                                  id
                                  role
                                  email
                                  givenName
                                  familyName
                                  divisionAssignment
                                }
                              }
                            }`,
                        }),
                    }).then((fetchRes) =>
                        fetchRes.json().then((body) => ({
                            status: fetchRes.status,
                            body,
                        }))
                    )
                ).then((res) => {
                    cy.log('Delegated request status: ' + res.status)
                    cy.log(
                        'Delegated request body: ' +
                            JSON.stringify(res.body)
                    )
                    cy.log(
                        'Delegated request headers sent - X-Acting-As-User: ' +
                            delegatedUser.id
                    )
                    console.log(
                        'Full delegated response:',
                        JSON.stringify(res.body, null, 2)
                    )
                    expect(res.status).to.equal(200) // okay

                    const user = res.body.data.fetchCurrentUser

                    // validate fetchCurrentUser returns the delegated user info.
                    expect(user.id).to.equal(delegatedUser.id)
                })
            })
        })
    })
})
