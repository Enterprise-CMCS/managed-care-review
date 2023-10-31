import type {
    PrismaClient,
    RateRevisionTable,
    UpdateInfoTable,
} from '@prisma/client'

// This is the type returned by client.$transaction
type PrismaTransactionType = Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>

type RateRevisionWithSubmitInfo = RateRevisionTable & {
    submitInfo: UpdateInfoTable | null
    unlockInfo: UpdateInfoTable | null
}

interface RateSet {
    revs: RateRevisionWithSubmitInfo[]
}

export async function migrate(
    client: PrismaTransactionType,
    contractIDs?: string[]
): Promise<Error | undefined> {
    // Go through every single contract and construct a set of "real" rates.
    // Then delete all the rest.
    try {
        const contracts = await client.contractTable.findMany({
            where: contractIDs
                ? {
                      id: { in: contractIDs },
                  }
                : undefined,
            include: {
                revisions: {
                    include: {
                        submitInfo: true,
                        unlockInfo: true,
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
                        draftRates: {
                            include: {
                                revisions: {
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

        // this tracks all the rate revisions we are blessing. ALL OTHERS WILL BE DELETED
        const allRateRevisionsConnectedToContractsIDs: string[] = []
        for (const contract of contracts) {
            const finalRates: RateSet[] = []
            // look at every contract revision from old to new
            // console.info('REVS', contract.revisions.length)
            for (const contractRev of contract.revisions) {
                // console.info('Start: ', finalRates)

                // First, get the rates associated with this contract revision.
                // Different for submitted and non-submitted revs.
                let associatedRates: RateRevisionWithSubmitInfo[] = []
                if (contractRev.submitInfo) {
                    const submittedAt = contractRev.submitInfo.updatedAt

                    // Initial Rates
                    let initialRateJoins = contractRev.rateRevisions.filter(
                        (rr) => rr.validAfter <= submittedAt
                    )

                    // console.info(
                    //     'any rates from before? ',
                    //     contractRev.rateRevisions.map((rr) => rr.validAfter),
                    //     submittedAt
                    // )

                    // because we have join table entries for removals, filter out removals.
                    if (
                        initialRateJoins.some((rj) => rj.isRemoval) &&
                        initialRateJoins.some((rj) => !rj.isRemoval)
                    ) {
                        initialRateJoins = initialRateJoins.filter(
                            (rj) => !rj.isRemoval
                        )
                    }

                    associatedRates = initialRateJoins.map(
                        (rj) => rj.rateRevision
                    )
                } else {
                    // if this is an unsubmitted rate, we use draft rates to get the latest rate revision
                    associatedRates = contractRev.draftRates.map(
                        (dr) => dr.revisions[0]
                    )
                }

                // Now we have the rateRevisions associated with this contractRevision
                // console.info('Matchign Rates: ', associatedRates.length)
                // console.info('Second Pass')

                for (let idx = 0; idx < associatedRates.length; idx++) {
                    const rateRev = associatedRates[idx]

                    // submit info was getting messed up by our extra creations.
                    // copy it over from the contractRev.
                    rateRev.submitInfo = contractRev.submitInfo
                    rateRev.unlockInfo = contractRev.unlockInfo

                    // for each contractRevision, we assume that all rate revisions belong to a rate by their given index in the list
                    // this is gross and would not catch situations where someone removed a rate and added a new one at the end
                    // but since this works on prod we don't care.
                    if (finalRates[idx] === undefined) {
                        finalRates.push({
                            revs: [rateRev],
                        })
                    } else {
                        finalRates[idx].revs.push(rateRev)
                    }
                    allRateRevisionsConnectedToContractsIDs.push(rateRev.id)
                }

                // Now clean up this contractRevision's draftRates
                const draftRateIDs: string[] = []
                if (!contractRev.submitInfo) {
                    // for each rate rev in this unsubmitted contract
                    for (const rate of contractRev.draftRates) {
                        // there MUST be an entry in our rate sets.
                        for (const rateSet of finalRates) {
                            if (
                                rateSet.revs.some((rs) => rs.rateID === rate.id)
                            ) {
                                // add the draft rate revs' new rate id to the set
                                draftRateIDs.push(rateSet.revs[0].rateID)
                                continue
                            }
                        }
                    }
                }

                // console.info('setting draft rates', draftRateIDs)
                // now set to the correct rates.
                await client.contractRevisionTable.update({
                    where: {
                        id: contractRev.id,
                    },
                    data: {
                        draftRates: {
                            set: draftRateIDs.map((rid) => ({
                                id: rid,
                            })),
                        },
                    },
                })
            }

            // console.info('Got Rate Set', finalRates)

            // draftRates are going to be deleted, and we have a bug where we weren't resetting the
            // draftRates of old revisions. So let's reset the draftRates for all our contractRevisions

            // OK now we transform these revisions

            for (const rateSet of finalRates) {
                // we'll parent all the revisions to this rate
                const rateID = rateSet.revs[0].rateID

                for (const rev of rateSet.revs) {
                    await client.rateRevisionTable.update({
                        where: {
                            id: rev.id,
                        },
                        data: {
                            rate: {
                                connect: {
                                    id: rateID,
                                },
                            },
                            submitInfo: rev.submitInfo
                                ? {
                                      upsert: {
                                          create: {
                                              updatedByID:
                                                  rev.submitInfo.updatedByID,
                                              updatedAt:
                                                  rev.submitInfo.updatedAt,
                                              updatedReason:
                                                  rev.submitInfo.updatedReason,
                                          },
                                          update: {
                                              updatedByID:
                                                  rev.submitInfo.updatedByID,
                                              updatedAt:
                                                  rev.submitInfo.updatedAt,
                                              updatedReason:
                                                  rev.submitInfo.updatedReason,
                                          },
                                      },
                                  }
                                : undefined,
                            unlockInfo: rev.unlockInfo
                                ? {
                                      upsert: {
                                          create: {
                                              updatedByID:
                                                  rev.unlockInfo.updatedByID,
                                              updatedAt:
                                                  rev.unlockInfo.updatedAt,
                                              updatedReason:
                                                  rev.unlockInfo.updatedReason,
                                          },
                                          update: {
                                              updatedByID:
                                                  rev.unlockInfo.updatedByID,
                                              updatedAt:
                                                  rev.unlockInfo.updatedAt,
                                              updatedReason:
                                                  rev.unlockInfo.updatedReason,
                                          },
                                      },
                                  }
                                : undefined,
                        },
                    })
                }
            }
        }

        // now the scary part, we delete everything that wasn't saved.
        const deleteRateRevs = await client.rateRevisionTable.deleteMany({
            where: {
                id: {
                    notIn: allRateRevisionsConnectedToContractsIDs,
                },
            },
        })

        console.info(`DELETED ${deleteRateRevs.count} rate revisions`)

        // OK so now the revisions associated with contracts should be on the right rates
        // we still want to clean up the excess rates that remain

        // 1. Easy is delete all rates that have no revisions
        const deleteRates = await client.rateTable.deleteMany({
            where: {
                revisions: {
                    none: {},
                },
            },
        })

        console.info(`DELETED ${deleteRates.count} rates`)

        // reorder all our state numbers

        // Get a list of all states that exist in the db.
        const ratesByState = await client.rateTable.groupBy({
            by: ['stateCode'],
        })

        for (const stateRate of ratesByState) {
            const stateCode = stateRate.stateCode

            const rates = await client.rateTable.findMany({
                where: {
                    stateCode,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            })

            let stateNumber = 1
            for (const rate of rates) {
                await client.rateTable.update({
                    where: {
                        id: rate.id,
                    },
                    data: {
                        stateNumber,
                    },
                })
                stateNumber++
            }
            await client.state.update({
                where: {
                    stateCode,
                },
                data: {
                    latestStateRateCertNumber: stateNumber - 1,
                },
            })
        }
    } catch (err) {
        console.error('Prisma Error: ', err)
        return err
    }

    return undefined
}
