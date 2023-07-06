import {
    PrismaClient,
    SubmissionType,
    UpdateInfoTable,
    User,
} from '@prisma/client'

// This is the type returned by client.$transaction
type PrismaTransactionType = Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>

// For use in prisma queries, include the updater in an updateInfo
const updateInfoIncludeUpdater = {
    include: {
        updatedBy: true,
    },
}

type UpdateInfoTableWithUpdater = UpdateInfoTable & { updatedBy: User }

type ContractFormData = {
    stateCode: string
    submissionType: SubmissionType
    submissionDescription?: string
}

type RateFormData = {
    stateCode: string
    name: string
}

export type {
    PrismaTransactionType,
    UpdateInfoTableWithUpdater,
    ContractFormData,
    RateFormData,
}

export { updateInfoIncludeUpdater }
