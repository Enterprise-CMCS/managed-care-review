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

function arrayEquals<T>(a: T[], b: T[]) {
    return (
        Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index])
    )
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
            type RateRevisionWithSubmitInfo = RateRevisionTable & {
                submitInfo: UpdateInfoTable | null
                unlockInfo: UpdateInfoTable | null
            }

            interface RateSet {
                revs: RateRevisionWithSubmitInfo[]
            }

            // let firstPass = true
            const finalRates: RateSet[] = []
            // look at every contract revision from old to new
            console.info('REVS', contract.revisions.length)
            for (const contractRev of contract.revisions) {
                console.info('Start: ', finalRates)

                let associatedRates: RateRevisionWithSubmitInfo[] = []
                // if this revision has any rates, lets start a rate list
                if (contractRev.submitInfo) {
                    const submittedAt = contractRev.submitInfo.updatedAt

                    // Initial Rates
                    let initialRateJoins = contractRev.rateRevisions.filter(
                        (rr) => rr.validAfter <= submittedAt
                    )

                    console.info(
                        'any rates from before? ',
                        contractRev.rateRevisions.map((rr) => rr.validAfter),
                        submittedAt
                    )

                    // because we're adding entries for removals, we can have more than just
                    // the initial set here.
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

                // console.info('all rates', contractRev.rateRevisions)
                console.info('Matchign Rates: ', associatedRates.length)
                console.info('Second Pass')

                for (let idx = 0; idx < associatedRates.length; idx++) {
                    const rateRev = associatedRates[idx]

                    // submit info was getting messed up by our extra creations.
                    rateRev.submitInfo = contractRev.submitInfo
                    rateRev.unlockInfo = contractRev.unlockInfo

                    let foundMatch = false

                    // programs they cover is a very good sign
                    for (const rateSet of finalRates) {
                        // console.info('Checking', rateSet)
                        if (
                            arrayEquals(
                                rateSet.revs[0].rateProgramIDs,
                                rateRev.rateProgramIDs
                            )
                        ) {
                            console.info(
                                'Matchied',
                                rateSet.revs[0].rateProgramIDs,
                                rateRev.rateProgramIDs
                            )
                            // These match!
                            rateSet.revs.push(rateRev)
                            allRateRevisionsConnectedToContractsIDs.push(
                                rateRev.id
                            )
                            foundMatch = true
                        }
                    }

                    console.info('Finished checking')

                    // TODO: check doc filename?
                    // if two rateRevs have the same document filename, that's a great sign

                    if (!foundMatch) {
                        console.info('pusthing newbie')
                        finalRates.push({
                            revs: [rateRev],
                        })
                        allRateRevisionsConnectedToContractsIDs.push(rateRev.id)
                    }
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
                                draftRateIDs.push(rateSet.revs[0].rateID)
                                continue
                            }
                        }
                    }
                }

                console.info('setting draft rates', draftRateIDs)
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

            console.info('Got Rate Set', finalRates)

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
