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
                    submitInfo: updateInfoIncludeUpdater,
                    unlockInfo: updateInfoIncludeUpdater,
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
