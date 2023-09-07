import type {
    PrismaClient,
    HealthPlanRevisionTable,
    ContractDocument,
    ContractSupportingDocument,
    RateDocument,
    RateSupportingDocument,
} from '@prisma/client'
import { v4 as uuid } from 'uuid'
import type { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'

type documentResults =
    | {
          contractDocuments: ContractDocument[]
          contractSupportingDocuments: ContractSupportingDocument[]
          rateDocuments: RateDocument[]
          rateSupportingDocuments: RateSupportingDocument[]
      }
    | Error

async function migrateDocuments(
    client: PrismaClient,
    revision: HealthPlanRevisionTable,
    formData: HealthPlanFormDataType
): Promise<documentResults> {
    const results: documentResults = {
        contractDocuments: [],
        contractSupportingDocuments: [],
        rateDocuments: [],
        rateSupportingDocuments: [],
    }

    try {
        // Handle Contract Documents
        for (const doc of formData.documents) {
            const existingContractDoc = await client.contractDocument.findFirst(
                {
                    where: {
                        sha256: doc.sha256 ?? undefined,
                        contractRevisionID: revision.id,
                    },
                }
            )

            if (!existingContractDoc) {
                const contractDoc: ContractDocument = {
                    id: uuid(),
                    createdAt: revision.createdAt,
                    updatedAt: new Date(),
                    name: doc.name,
                    s3URL: doc.s3URL,
                    sha256: doc.sha256 ?? '',
                    contractRevisionID: revision.id,
                }

                const createdContractDoc = await client.contractDocument.create(
                    {
                        data: contractDoc,
                    }
                )

                results.contractDocuments.push(createdContractDoc)
            }
        }

        // Handle Contract Supporting Documents
        for (const supportDoc of formData.contractDocuments) {
            const existingContractSupportDoc =
                await client.contractSupportingDocument.findFirst({
                    where: {
                        sha256: supportDoc.sha256 ?? '',
                        contractRevisionID: revision.id,
                    },
                })

            if (!existingContractSupportDoc) {
                const contractSupportDoc: ContractSupportingDocument = {
                    id: uuid(),
                    createdAt: revision.createdAt,
                    updatedAt: new Date(),
                    name: supportDoc.name,
                    s3URL: supportDoc.s3URL,
                    sha256: supportDoc.sha256 ?? '',
                    contractRevisionID: revision.id,
                }

                const createdContractSupportDoc =
                    await client.contractSupportingDocument.create({
                        data: contractSupportDoc,
                    })

                results.contractSupportingDocuments.push(
                    createdContractSupportDoc
                )
            }
        }

        // Handle Rate and Rate Supporting Documents
        for (const rateInfo of formData.rateInfos) {
            const rateRevision = await client.rateRevisionTable.findFirst({
                where: {
                    rateID: revision.pkgID,
                    rateType: rateInfo.rateType,
                    rateCapitationType: rateInfo.rateCapitationType,
                    rateDateStart: rateInfo.rateDateStart,
                    rateDateEnd: rateInfo.rateDateEnd,
                },
            })

            if (rateRevision) {
                for (const rateDoc of rateInfo.rateDocuments) {
                    const existingRateDoc = await client.rateDocument.findFirst(
                        {
                            where: {
                                sha256: rateDoc.sha256 ?? '',
                                rateRevisionID: rateRevision.id,
                            },
                        }
                    )

                    if (!existingRateDoc) {
                        const rateDocument: RateDocument = {
                            id: uuid(),
                            createdAt: revision.createdAt,
                            updatedAt: new Date(),
                            name: rateDoc.name,
                            s3URL: rateDoc.s3URL,
                            sha256: rateDoc.sha256 ?? '',
                            rateRevisionID: rateRevision.id,
                        }

                        const createdRateDoc = await client.rateDocument.create(
                            {
                                data: rateDocument,
                            }
                        )

                        results.rateDocuments.push(createdRateDoc)
                    }
                }

                for (const supportRateDoc of rateInfo.supportingDocuments) {
                    const existingRateSupportDoc =
                        await client.rateSupportingDocument.findFirst({
                            where: {
                                sha256: supportRateDoc.sha256 ?? '',
                                rateRevisionID: rateRevision.id,
                            },
                        })

                    if (!existingRateSupportDoc) {
                        const rateSupportDocument: RateSupportingDocument = {
                            id: uuid(),
                            createdAt: revision.createdAt,
                            updatedAt: new Date(),
                            name: supportRateDoc.name,
                            s3URL: supportRateDoc.s3URL,
                            sha256: supportRateDoc.sha256 ?? '',
                            rateRevisionID: rateRevision.id,
                        }

                        const createdRateSupportDoc =
                            await client.rateSupportingDocument.create({
                                data: rateSupportDocument,
                            })

                        results.rateSupportingDocuments.push(
                            createdRateSupportDoc
                        )
                    }
                }
            }
        }

        return results
    } catch (error) {
        const err = new Error(
            `Error migrating documents: ${JSON.stringify(error)}`
        )
        return err
    }
}

export { migrateDocuments }
