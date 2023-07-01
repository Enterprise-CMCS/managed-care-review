import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { Rate } from './rateType'

// creates a new contract, with a new revision
async function insertDraftRate(
    client: PrismaClient,
    formData: string
): Promise<Rate | Error> {
    try {
        const rate = await client.rateTable.create({
            data: {
                id: uuidv4(),
                revisions: {
                    create: {
                        id: uuidv4(),
                        name: formData,
                    },
                },
            },
            include: {
                revisions: {
                    include: {
                        contractRevisions: {
                            include: {
                                contractRevision: true,
                            },
                        },
                    },
                },
            },
        })

        return {
            id: rate.id,
            revisions: rate.revisions.map((rr) => ({
                id: rr.id,
                revisionFormData: rr.name,
                contractRevisions: rr.contractRevisions.map((cr) => ({
                    id: cr.rateRevisionID,
                    contractFormData: cr.contractRevision.name,
                    rateRevisions: [],
                })),
            })),
        }
    } catch (err) {
        console.error('CONTRACT PRISMA ERR', err)
        return err
    }
}

export { insertDraftRate }
