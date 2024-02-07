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

    it('expect server error when called from deployed cypress, otherwise success on local', () => {
    
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
                if (Cypress.config().baseUrl === 'http://localhost:3000') {
                    expect(res.status).to.equal(200) // okay 
                } else {
                    expect(res.body.errors[0].message).to.contain('this IP address is not in the allowed list')
                    expect(res.status).to.equal(500) // server error 
                }
            })

        })        
    })

})
