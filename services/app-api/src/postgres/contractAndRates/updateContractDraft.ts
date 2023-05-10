import { PrismaClient } from "@prisma/client";
import { Contract, findContract } from "./findContract";

// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateContractDraft(
                                                client: PrismaClient, 
                                                contractID: string,
                                                formData: string,
                                                rateIDs: string[],
                                            ): Promise<Contract | Error> {

    const groupTime = new Date()
    console.log('Console Grouptime', groupTime)

    try {
        // Given all the Rates associated with this draft, find the most recent submitted 
        // rateRevision to attach to this contract on submit.
        const currentRev = await client.contractRevisionTable.findFirst({
            where: {
                contractID: contractID,
                submitInfoID: null,
            },
        })
        if (!currentRev) {
            console.log('No Draft Rev!')
            return new Error('cant find a draft rev to submit')
        }

        const rates = await client.rateTable.findMany({
            where: {
                id: { in: rateIDs}
            }
        })
        console.log("trying to set", rateIDs, rates)

        await client.contractRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                name: formData,
                draftRates: {
                    set: rateIDs.map( (rID) => ({
                        id: rID,
                    }))
                }
            },
            include: {
                rateRevisions: {
                    include: {
                        rateRevision: true,
                    }
                },
            }
        })

        return findContract(client, contractID)

    }
    catch (err) {
        console.log("SUBMIT PRISMA CONTRACT ERR", err)
    }

    return new Error('nope')
}

export {
    updateContractDraft,
}
