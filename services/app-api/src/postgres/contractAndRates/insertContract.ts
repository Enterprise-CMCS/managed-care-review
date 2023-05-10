import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { Contract } from "./contractType";

// creates a new contract, with a new revision
async function insertDraftContract(
                                                        client: PrismaClient, 
                                                        formData: string,
                                                    ): Promise<Contract | Error> {

    try {

        const contract = await client.contractTable.create({ 
            data: { 
                id: uuidv4(), 
                revisions: {
                    create: {
                        id: uuidv4(),
                        name: formData,
                    }
                }
            }, 
            include: {
                revisions: {
                    include: {
                        rateRevisions: {
                            include: {
                                rateRevision: true,
                            }
                        },
                    }
                }
            }
        })

        console.log('created', contract)

        return {
            id: contract.id,
            revisions: contract.revisions.map( (cr) => ({
                id: cr.id,
                contractFormData: cr.name,
                rateRevisions: cr.rateRevisions.map( (rr) => ({
                    id: rr.rateRevisionID,
                    revisionFormData: rr.rateRevision.rateCertURL || 'NOTHING MUCH',
                }))
            }))
        }

    } catch (err) {
        console.log("CONTRACT PRISMA ERR", err)
    }

    return new Error('nope')
}

export {
    insertDraftContract,
}
