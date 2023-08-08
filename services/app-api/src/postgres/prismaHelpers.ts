const updateInfoIncludeUpdater = {
    include: {
        updatedBy: true,
    },
}

const draftContractRevisionsWithDraftRates = {
    stateContacts: true,
    contractDocuments: true,
    supportingDocuments: true,
    draftRates: {
        include: {
            revisions: {
                include: {
                    rateDocuments: true,
                    supportingDocuments: true,
                    certifyingActuaryContacts: true,
                    addtlActuaryContacts: true,
                    submitInfo: updateInfoIncludeUpdater,
                    unlockInfo: updateInfoIncludeUpdater,
                    draftContracts: true,
                },
                where: {
                    submitInfoID: { not: null },
                },
                take: 1,
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    },
} as const

export { draftContractRevisionsWithDraftRates, updateInfoIncludeUpdater }
