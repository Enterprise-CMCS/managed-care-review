import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testStateUser } from '../../testHelpers/userHelpers'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { must } from '../../testHelpers'
import { findDocumentById } from '.'

it('returns document', async () => {
    const client = await sharedTestPrismaClient()

    const stateServer = await constructTestPostgresServer({
        context: {
            user: testStateUser(),
        },
    })

    const contract = await createAndSubmitTestContractWithRate(stateServer)

    const fetchedDoc = must(
        await findDocumentById(
            client,
            contract.packageSubmissions[0].contractRevision.formData
                .contractDocuments[0].id!
        )
    )

    expect(fetchedDoc.id).toEqual(
        contract.packageSubmissions[0].contractRevision.formData
            .contractDocuments[0].id
    )
    expect(fetchedDoc.name).toEqual(
        contract.packageSubmissions[0].contractRevision.formData
            .contractDocuments[0].name
    )
})
