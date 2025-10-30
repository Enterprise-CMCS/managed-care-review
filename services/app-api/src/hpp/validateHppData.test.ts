import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
import { toDomain } from './proto'

it('query the data', async () => {
    const client = await sharedTestPrismaClient()

    const hpp = await client.healthPlanPackageTable.findMany({
        include: {
            revisions: true,
        },
    })

    const hppIDs = hpp.map((pkg) => pkg.id)
    const hppRevisions = hpp
        .flatMap((pkg) => pkg.revisions)
        .map((rev) => ({
            ...rev,
            formData: toDomain(rev.formDataProto),
        }))

    const validatePackages = await client.contractTable.findMany({
        where: {
            id: {
                in: hppIDs,
            },
        },
    })

    const validateRevisions = await client.contractRevisionTable.findMany({
        where: {
            id: {
                in: hppRevisions.map((rev) => rev.id),
            },
        },
    })

    // Validate that all HPP submissions exist on the Contracts table.
    expect(validatePackages.length).toBe(hppIDs.length)
    expect(validatePackages.map((pkg) => pkg.id).sort()).toEqual(hppIDs.sort())

    // Validate that all HPP revisions exit on the Contract revision table
    expect(hppRevisions.length).toBe(validateRevisions.length)
    expect(validateRevisions.map((rev) => rev.id).sort()).toEqual(
        hppRevisions.map((rev) => rev.id).sort()
    )
})
