import { findContractWithHistory } from "../../postgres/contractAndRates"
import type { PrismaTransactionType } from "../../postgres/prismaTypes"

export async function migrate(
    client: PrismaTransactionType,
    contractIDs?: string[]
): Promise<Error | undefined> {
    // Go through every single contract and construct a set of "real" rates.
    // Then delete all the rest.
    try {
        const contracts = await client.contractTable.findMany({
            where:
                contractIDs
                ? {
                      id: { in: contractIDs },
                  }
                : undefined,
            include: {
                revisions: {
                    include: {
                        submitInfo: true,
                        unlockInfo: true,
                        relatedSubmisions: true,
                        rateRevisions: {
                            orderBy: {
                                validAfter: 'asc',
                            },
                            include: {
                                rateRevision: {
                                    include: {
                                        submitInfo: true,
                                        unlockInfo: true,
                                        rateDocuments: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        })

        const testContractIDs = [
            'b9b751e5-bdb8-4710-b0e0-4a34461b637a',
            '3a678ac2-07f9-4efe-ba7d-c1bed005afd5',
            '4db9fe78-fd9e-40be-b5c2-d6b89c7d22be',
            'cdf88120-99e8-4252-b887-c122f7b20084',
        ]


        const preTestContracts = []
        for (const cID of testContractIDs) {
            const c = await findContractWithHistory(client, cID)
            preTestContracts.push(c)
        }

        const unmigrateRevisions = []
        for (const contract of contracts) {
            for (const contractRev of contract.revisions) {

                if (contractRev.relatedSubmisions.length > 0) {
                    continue
                }
                unmigrateRevisions.push(contractRev)
            }
        }

        console.log('found Unmigrated Revs: ', unmigrateRevisions.length)


        for (const contractRev of unmigrateRevisions) {
            const allLinkedRates = contractRev.rateRevisions

            const contractSubmissionTime = contractRev.submitInfo?.updatedAt

            if (contractSubmissionTime) {
                // we're in a submitted contract rev
                const concurrentlySubmittedRateRevs = allLinkedRates.filter((linkedRate) => {
                    const rateSubmissionTime = linkedRate.rateRevision.submitInfo?.updatedAt

                    if (!rateSubmissionTime) {
                        return false
                    }

                    if (Math.abs(contractSubmissionTime.getTime() - rateSubmissionTime.getTime()) < 1000) {
                        return true
                    } else {
                        return false
                    }
                })

                // console.log('filtered out related rates', contractRev.contractID, concurrentlySubmittedRateRevs.length,  allLinkedRates.length - concurrentlySubmittedRateRevs.length)

                const concurrentRateIDs = concurrentlySubmittedRateRevs.map((r)=> r.rateRevision.rateID)
                const rateIDSet: {[id: string]: boolean} = {}
                for (const rID of concurrentRateIDs) {
                    rateIDSet[rID] = true
                }
                if (concurrentRateIDs.length != Object.keys(rateIDSet).length) {
                    console.error('found a collision!', contractRev.id, concurrentRateIDs)
                    throw new Error('found a collision')
                }

                const contractSubmissionID = contractRev.submitInfoID
                if (!contractSubmissionID) {
                    throw new Error('Better have an id, we had one above')
                }

                // add contract+submitinfo to related contract submissions
                await client.contractRevisionTable.update({
                    where: {
                        id: contractRev.id
                    }, 
                    data: {
                        relatedSubmisions: {
                            connect: {
                                id: contractSubmissionID
                            }
                        }
                    }
                })

                let ratePosition = 0
                for (const rateRev of concurrentlySubmittedRateRevs) {
                    const oldSubmitInfoID = rateRev.rateRevision.submitInfo?.id

                    // set the submitInfo on each rate to be the same ID as the contract’s
                    // add rates+submitInfo to related rate submissions
                    // add join entries with rate position for contract + update info + rate rev.
                    await client.rateRevisionTable.update({
                        where: {
                            id: rateRev.rateRevisionID,
                        },
                        data: {
                            submitInfoID: contractSubmissionID,
                            relatedSubmissions: {
                                connect: {
                                    id: contractSubmissionID
                                }
                            },
                            submissionPackages: {
                                create: {
                                    submissionID: contractSubmissionID,
                                    contractRevisionID: contractRev.id,
                                    ratePosition: ratePosition,
                                }
                            }
                        }
                    })

                    if (!oldSubmitInfoID) {
                        throw new Error('Better have an old submit id, we had one above')
                    }
                    await client.updateInfoTable.delete({
                        where: {
                            id: oldSubmitInfoID,
                        }
                    })
                    ratePosition ++
                }
            }
        }


        const postTestContracts = []
        for (const cID of testContractIDs) {
            const c = await findContractWithHistory(client, cID)
            postTestContracts.push(c)
        }

        for (let i = 0; i < preTestContracts.length; i++) {
            const preContract = preTestContracts[i]
            const postContract = postTestContracts[i]

            if (preContract instanceof Error || postContract instanceof Error) {
                console.log(preContract, postContract)
                throw new Error('bad news')
            }

            if (preContract.packageSubmissions.length > 0) {
                console.log('we accidentially migrate a contract that was already migrated!', preContract)
                throw new Error('bad news 2')
            }

            if (postContract.packageSubmissions.length == 0) {
                console.log('a migrated contract has no submissions!', preContract)
                throw new Error('bad news 3')
            }

            if (preContract.revisions.length !== postContract.packageSubmissions.length) {
                console.log('this contract came back wonky', preContract, postContract)
                throw new Error('v bad news')
            }

            for (let i = 0; i < preContract.revisions.length; i++) {

                const preRev = preContract.revisions[i]
                const postPackage = postContract.packageSubmissions[preContract.revisions.length - 1 - i]

                const prevRateIDs = preRev.rateRevisions.map(r => r.id)
                const postRevIDs = postPackage.rateRevisions.map(r => r.id)
                console.log('Pre Rev ID', prevRateIDs)
                console.log('Post Rev ID', postRevIDs)


                console.log('Pre REvs', preRev)
                console.log('Post Pack', postPackage)

                expect(prevRateIDs).toEqual(postRevIDs)
            }

        }


    } catch (err) {
        console.error('Prisma Error: ', err)
        return err
    }

    return undefined
}
