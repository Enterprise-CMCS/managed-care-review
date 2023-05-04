// See Cypress guide for gql
// https://docs.cypress.io/guides/testing-strategies/working-with-graphql

// Utility to match GraphQL mutation based on the operation name
const hasOperationName = (req, operationName) => {
    const { body } = req
    return (
        body.hasOwnProperty('operationName') &&
        body.operationName === operationName
    )
}

// Alias query if operationName matches
const aliasQuery = (req, operationName) => {
    if (hasOperationName(req, operationName)) {
        req.alias = `${operationName}Query`
    }
}

// Alias mutation if operationName matches
const aliasMutation = (req, operationName) => {
    if (hasOperationName(req, operationName)) {
        req.alias = `${operationName}Mutation`
    }
}

export { aliasQuery, aliasMutation }
