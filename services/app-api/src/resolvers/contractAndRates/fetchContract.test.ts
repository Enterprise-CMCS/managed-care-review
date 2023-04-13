import { constructTestPostgresServer } from "../../testHelpers/gqlHelpers"
import FETCH_CONTRACT_PACKAGE from '../../../../app-graphql/src/queries/fetchContractPackage.graphql'
import { ZodContractFormDataVAll } from "../../postgres/contractAndRates/zodDomainTypes"
import { ContractPackage } from "../../gen/gqlServer"

describe('contract packages', () => {

    it('can fetch one contract', async () => {

        const server = await constructTestPostgresServer()

        const input = {
            pkgID: '2',
        }

        const result = await server.executeOperation({
            query: FETCH_CONTRACT_PACKAGE,
            variables: { input },
        })

        console.log('got back', result)

        if (!result.data) {
            throw new Error('nope')
        }

        const contractPkg: ContractPackage = result.data.fetchContractPackage.pkg

        const gqlFormData = contractPkg.contractFormData

        console.log('state: ', contractPkg.stateCode)

        const zodContractFormDataResult = ZodContractFormDataVAll.safeParse(gqlFormData)

        console.log("parsed?", zodContractFormDataResult)

        if (!zodContractFormDataResult.success) {
            throw new Error('this failed')
        }

        const zodContractFormData = zodContractFormDataResult.data

        console.log('this is real form data: ', zodContractFormData)


        // lots of ways to discriminate now
        if ('federalAuthorities' in zodContractFormData) {
            // now it's not v0
            console.log('fed auth', zodContractFormData.federalAuthorities)
        }

        if (zodContractFormData.schemaVersion == 2) {
            // now it's v2
            console.log('modified Provs', zodContractFormData.modifiedProvisions)
        }

        if ('modifiedProvisions' in zodContractFormData) {
            const modProvs = zodContractFormData.modifiedProvisions
            if ('modifiedPassThroughPayments' in modProvs) {
                console.log('this must be v3', modProvs.modifiedPassThroughPayments)
            }
        }

        expect(false).toBe(true)
    })

})
