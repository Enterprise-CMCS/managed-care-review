import type {
    PrismaClient,
    HealthPlanRevisionTable,
    Prisma,
    ContractRevisionTable,
} from '@prisma/client'
import type { HealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'

export async function migrateRateInfo(
    client: PrismaClient,
    revision: HealthPlanRevisionTable,
    formData: HealthPlanFormDataType,
    contractRevision: ContractRevisionTable
): Promise<undefined | Error> {
    // get the state info
    const stateCode = formData.stateCode

    const state = await client.state.findUnique({
        where: { stateCode: stateCode },
    })

    if (!state) {
        const error = new Error(`State with code ${stateCode} not found`)
        return error
    }

    for (const rateInfo of formData.rateInfos) {
        const dataToCopy: Prisma.RateRevisionTableCreateWithoutRateInput = {
            createdAt: revision.createdAt,
            amendmentEffectiveDateStart:
                rateInfo.rateAmendmentInfo?.effectiveDateStart ?? null,
            amendmentEffectiveDateEnd:
                rateInfo.rateAmendmentInfo?.effectiveDateEnd ?? null,
            actuaryCommunicationPreference:
                rateInfo.actuaryCommunicationPreference ?? null,
            rateType: rateInfo.rateType ?? null,
            rateCapitationType: rateInfo.rateCapitationType ?? null,
            rateDateStart: rateInfo.rateDateStart ?? null,
            rateDateEnd: rateInfo.rateDateEnd ?? null,
            rateDateCertified: rateInfo.rateDateCertified ?? null,
            rateProgramIDs: rateInfo.rateProgramIDs ?? [],
            rateCertificationName: rateInfo.rateCertificationName ?? null,
        }

        // Add the unlocked info to the table if it exists
        if (formData.status === 'SUBMITTED' && revision.unlockedBy) {
            const user = await client.user.findFirst({
                where: { email: revision.unlockedBy },
            })
            if (user) {
                dataToCopy.unlockInfo = {
                    create: {
                        updatedAt: revision.unlockedAt ?? formData.updatedAt, //TODO: not sure what we want to fall back to here
                        updatedByID: user.id,
                        updatedReason:
                            revision.unlockedReason ??
                            'Migrated from previous system',
                    },
                }
            } else {
                console.warn(
                    `User with email ${revision.unlockedBy} does not exist. Skipping unlockInfo creation.`
                )
            }
        }

        // add the submit info to the table if it exists
        if (formData.status === 'SUBMITTED' && revision.submittedBy) {
            const user = await client.user.findFirst({
                where: { email: revision.submittedBy },
            })
            if (user) {
                dataToCopy.submitInfo = {
                    create: {
                        updatedAt: formData.updatedAt,
                        updatedByID: user.id,
                        updatedReason:
                            revision.submittedReason ??
                            'Migrated from previous system',
                    },
                }
            } else {
                console.warn(
                    `User with email ${revision.submittedBy} does not exist. Skipping submitInfo creation.`
                )
            }
        }

        // add the actuary contacts
        if (rateInfo.actuaryContacts) {
            dataToCopy.certifyingActuaryContacts = {
                create: rateInfo.actuaryContacts,
            }
        }

        if (formData.addtlActuaryContacts) {
            dataToCopy.addtlActuaryContacts = {
                create: formData.addtlActuaryContacts,
            }
        }
        // handle rate documents
        let rateDocPos = 0
        const rateDocsArray = []
        for (const rateDoc of rateInfo.rateDocuments) {
            const rateDocument: Prisma.RateDocumentCreateWithoutRateRevisionInput =
                {
                    createdAt: revision.createdAt,
                    updatedAt: new Date(),
                    name: rateDoc.name,
                    s3URL: rateDoc.s3URL,
                    sha256: rateDoc.sha256,
                    position: rateDocPos,
                }
            rateDocsArray.push(rateDocument)
            rateDocPos++
        }
        dataToCopy.rateDocuments = {
            create: rateDocsArray,
        }

        // handle rate revision documents
        let rateRevDocPos = 0
        const rateRevDocsArray = []
        for (const supportRateDoc of rateInfo.supportingDocuments) {
            const rateSupportDocument: Prisma.RateSupportingDocumentCreateWithoutRateRevisionInput =
                {
                    createdAt: revision.createdAt,
                    updatedAt: new Date(),
                    name: supportRateDoc.name,
                    s3URL: supportRateDoc.s3URL,
                    sha256: supportRateDoc.sha256,
                    position: rateRevDocPos,
                }
            rateRevDocsArray.push(rateSupportDocument)
            rateRevDocPos++
        }
        dataToCopy.supportingDocuments = {
            create: rateRevDocsArray,
        }

        // rate revisions on contract revisions join table
        dataToCopy.contractRevisions = {
            create: {
                contractRevisionID: contractRevision.id,
                validAfter: new Date(),
            },
        }

        // each rate revision data here belongs to a different Rate, so we need
        // to upsert that rate.
        // Critically, the ID in the HPFormData is the ID we want to use for that rate
        // since it should be stable across revisions.

        await client.$transaction(async (tx) => {
            try {
                // check if this rate exists
                const findRateResult = await tx.rateTable.findFirst({
                    where: {
                        id: rateInfo.id,
                    },
                })

                if (findRateResult === undefined || findRateResult === null) {
                    // we have to create this rate now.

                    // get the current state number:
                    const state = await tx.state.findUnique({
                        where: { stateCode: stateCode },
                    })

                    if (!state) {
                        const error = new Error(
                            `State with code ${stateCode} not found`
                        )
                        return error
                    }

                    const newRateCertNumber =
                        state.latestStateRateCertNumber + 1

                    await tx.state.update({
                        where: { stateCode: stateCode },
                        data: {
                            latestStateRateCertNumber: newRateCertNumber,
                        },
                    })

                    await tx.rateTable.create({
                        data: {
                            id: rateInfo.id,
                            state: {
                                connect: {
                                    stateCode: stateCode,
                                },
                            },
                            stateNumber: newRateCertNumber,
                            revisions: {
                                create: dataToCopy,
                            },
                        },
                    })
                } else {
                    // the rate already exists, add a new revision
                    await tx.rateTable.update({
                        where: { id: rateInfo.id },
                        data: {
                            revisions: {
                                create: dataToCopy,
                            },
                        },
                    })
                }
            } catch (e) {
                console.error('Failed to upsert Rate', e)
                return e
            }
        })
    }
}
