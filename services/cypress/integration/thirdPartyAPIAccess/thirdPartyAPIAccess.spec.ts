describe('thirdPartyAPIAccess', () => {

    beforeEach(() => {
        cy.stubFeatureFlags()
        cy.interceptGraphQL()
    })


    it('gets an error back without authentication', () => {
        
        // get the API URL!
        const url = Cypress.env('API_URL')
        const api_url = url + '/v1/graphql/external'

        cy.request({
            url: api_url,
            headers: {
                'Authorization': 'Bearer foobar'
            },
            failOnStatusCode: false,
        }).then(res => {
            expect(res.status).to.equal(403) // unauthenticated??
        })

    })

    it('gets an error back without no auth header sent', () => {
        
        // get the API URL!
        const url = Cypress.env('API_URL')
        const api_url = url + '/v1/graphql/external'

        cy.request({
            url: api_url,
            failOnStatusCode: false,
        }).then(res => {
            expect(res.status).to.equal(401) // unauthenticated
        })
    })

    it('works with a valid key', () => {
    
        // get the API URL!
        const url = Cypress.env('API_URL')
        const api_url = url + '/v1/graphql/external'

        // sign in and get to the api key url
        cy.logInAsCMSUser()

        cy.visit('/dev/api-access')

        cy.findByRole('button', {
            name: "Generate API Key",
        }).click()


        cy.get("[aria-label='API Key Text']").then((codeBlock) => {

            const apiKey = codeBlock.text().trim()
            const bearer = `Bearer ${apiKey}`

            cy.request({
                method: 'post',
                url: api_url,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: bearer,
                },
                body: '{"query":"query IndexRates { indexRates { totalCount edges { node {  id } } } }"}',
                failOnStatusCode: false,
            }).then(res => {
                expect(res.status).to.equal(200) // okay 
            })

        })        
    })

})
