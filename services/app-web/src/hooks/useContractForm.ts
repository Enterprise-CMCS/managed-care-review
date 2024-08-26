import { useState, useEffect} from 'react'
import { usePage } from "../contexts/PageContext"
import {
    CreateContractInput,
    useFetchContractQuery,
    useCreateContractMutation,
    useUpdateContractDraftRevisionMutation,
    Contract,
    Rate,
    GenericDocument,
    GenericDocumentInput,
    StateContactInput,
    StateContact,
    UnlockedContract,
    UpdateContractDraftRevisionInput,
    ContractPackageSubmission
} from '../gen/gqlClient'
import {
    wrapApolloResult,
} from '../gqlHelpers/apolloQueryWrapper'
import { recordJSException } from '../otelHelpers'
import { handleApolloError } from '../gqlHelpers/apolloErrors'
import { ApolloError } from '@apollo/client'
import type { InterimState } from '../pages/StateSubmission/ErrorOrLoadingPage'


type  UseContractForm = {
    draftSubmission?: UnlockedContract
    showPageErrorMessage: string | boolean
    previousDocuments?: string[]
    updateDraft: (
        input: UpdateContractDraftRevisionInput
    ) => Promise<Contract | Error>
    createDraft: (input: CreateContractInput) => Promise<Contract | Error>
    interimState?:  InterimState
}

const documentsInput = (documents: GenericDocument[]): GenericDocumentInput[] => {
    return documents.map((doc) => {
        return {
            downloadURL: doc.downloadURL,
            name: doc.name,
            s3URL: doc.s3URL,
            sha256: doc.sha256
        }
    })
}

const stateContactsInput = (contacts: StateContact[]): StateContactInput[] => {
    return contacts.map((contact) => {
        return {
            email: contact.email,
            name: contact.name,
            titleRole: contact.titleRole,
        }
    })
}

const useContractForm = (contractID?: string): UseContractForm => {
    // Set up defaults for the return value for hook
    let interimState: UseContractForm['interimState'] = undefined // enum to determine what Interim UI should override form page
    let previousDocuments: UseContractForm['previousDocuments'] = [] // used for document upload tables
    let draftSubmission: UseContractForm['draftSubmission'] = undefined // form data from current package revision, used to load form
    const [showPageErrorMessage, setShowPageErrorMessage] = useState<boolean | string>(false) // string is a custom error message, defaults to generic of true
    const { updateHeading } = usePage()
    const [pkgNameForHeading, setPkgNameForHeading] = useState<string | undefined>(undefined)

    useEffect(() => {
        updateHeading({ customHeading: pkgNameForHeading })
    }, [pkgNameForHeading, updateHeading])

    const [createFormData] = useCreateContractMutation()

    const createDraft: UseContractForm['createDraft']  = async (
        input: CreateContractInput
    ): Promise<Contract | Error> => {
        setShowPageErrorMessage(false)
        const { populationCovered, programIDs, riskBasedContract, submissionType, submissionDescription, contractType } = input
        try {
            const createResult = await createFormData({
                variables: {
                    input: {
                        populationCovered,
                        programIDs,
                        riskBasedContract,
                        submissionType,
                        submissionDescription,
                        contractType,
                },
            }})
            const createdSubmission: Contract | undefined =
                createResult?.data?.createContract.contract

            if (!createdSubmission) {
                setShowPageErrorMessage(true)
                recordJSException(
                    `StateSubmissionForm: Apollo error reported. Error message: Failed to create form data ${createResult}`
                )
                return new Error('Failed to create form data')
            }

            return createdSubmission
        } catch (serverError) {
            setShowPageErrorMessage(true)
            recordJSException(
                `StateSubmissionForm: Apollo error reported. Error message: ${serverError.message}`
            )
            return new Error(serverError)
        }
    }
    const [updateFormData] = useUpdateContractDraftRevisionMutation()

    const updateDraft: UseContractForm['updateDraft']  = async (
        input: UpdateContractDraftRevisionInput
    ): Promise<Contract | Error> => {

        setShowPageErrorMessage(false)
        if (input.formData.contractDocuments && input.formData.contractDocuments.length > 0) {
            input.formData.contractDocuments = documentsInput(input.formData.contractDocuments)
        } if (input.formData.supportingDocuments && input.formData.supportingDocuments.length > 0) {
            input.formData.supportingDocuments = documentsInput(input.formData.supportingDocuments)
        } if (input.formData.stateContacts && input.formData.stateContacts.length > 0) {
            input.formData.stateContacts = stateContactsInput(input.formData.stateContacts)
        }

        try {
            const updateResult = await updateFormData({
                variables: {
                    input: {
                        contractID: contractID ?? 'new-draft',
                        lastSeenUpdatedAt: contract!.draftRevision!.updatedAt,
                        formData: input.formData
                    },
                },
            })
            const updatedSubmission =
                updateResult?.data?.updateContractDraftRevision.contract
            if (!updatedSubmission) {
                setShowPageErrorMessage(true)
                recordJSException(
                    `StateSubmissionForm: Apollo error reported. Error message: Failed to update form data ${updateResult}`
                )
                return new Error('Failed to update form data')
            }
            return updatedSubmission
        } catch (serverError) {
            setShowPageErrorMessage(true)
            recordJSException(
                `StateSubmissionForm: Apollo error reported. Error message: ${serverError.message}`
            )
            return new Error(serverError)
        }
    }
    const results = wrapApolloResult(useFetchContractQuery({
        variables: {
            input: {
                contractID: contractID ?? 'new-draft'
            }
        },
        skip: !contractID
    }))

    const result = results.result

    if (result.status === 'LOADING') {
        interimState = 'LOADING'
        return {interimState, createDraft, updateDraft, showPageErrorMessage }
    }

    const contract = result?.data?.fetchContract.contract
    
    // apolloQueryWrapper returns an error if query has been skipped
    // because it's intended for query to be skipped when no contract id is passed
    // do not trip skipped as an error
    if (result.status === 'ERROR' && result.error.name !== 'SKIPPED') {
        const err = result.error
        if (err instanceof ApolloError){
            handleApolloError(err, true)
            if (err.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
                    interimState = 'NOT_FOUND'
                    return {interimState, createDraft, updateDraft,  showPageErrorMessage }
            }
        }
        if (err.name !== 'SKIPPED') {
            recordJSException(err)
            interimState = 'GENERIC_ERROR'
            return { interimState, createDraft, updateDraft,  showPageErrorMessage}
        }

        if (!contract || !contract.draftRevision || !contract.draftRevision.formData ||
            contract?.status === 'RESUBMITTED' || contract?.status === 'SUBMITTED') {
            interimState = 'GENERIC_ERROR'
            return { interimState, createDraft, updateDraft,  showPageErrorMessage}
        }
        const rates:Rate[] = []
        const packageSubmissions:ContractPackageSubmission[] = []
        const unlockedContract:UnlockedContract = {
            ...contract,
            id: contract!.id,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
            stateCode: contract.stateCode,
            stateNumber: contract.stateNumber,
            status: contract.status,
            draftRevision: {
                ...contract.draftRevision,
                id: contract.id,
                contractName: contract.draftRevision.contractName,
                createdAt: contract.draftRevision.createdAt,
                updatedAt: contract.draftRevision.updatedAt,
                __typename: 'ContractRevision',
                formData: {
                    ...contract.draftRevision.formData,
                    __typename: 'ContractFormData'
                }
            },
            draftRates: contract.draftRates || rates,
            packageSubmissions: contract.packageSubmissions || packageSubmissions,
            __typename: 'UnlockedContract'
        }
        draftSubmission = unlockedContract
        return {interimState, createDraft, updateDraft, draftSubmission, showPageErrorMessage}

    }

    if (!contract || !contract.draftRevision || !contract.draftRevision.formData || contract?.status === 'RESUBMITTED' || contract?.status === 'SUBMITTED') {
        return {interimState, createDraft, updateDraft, showPageErrorMessage }
    }
    const submissionName = contract.draftRevision?.contractName
    if (pkgNameForHeading !== submissionName) {
        setPkgNameForHeading(submissionName)
    }

    const rates:Rate[] = []
        const packageSubmissions:ContractPackageSubmission[] = []
        const unlockedContract:UnlockedContract = {
            ...contract,
            id: contract!.id,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
            stateCode: contract.stateCode,
            stateNumber: contract.stateNumber,
            status: contract.status,
            draftRevision: {
                ...contract.draftRevision,
                id: contract.id,
                contractName: contract.draftRevision.contractName,
                createdAt: contract.draftRevision.createdAt,
                updatedAt: contract.draftRevision.updatedAt,
                __typename: 'ContractRevision',
                formData: {
                    ...contract.draftRevision.formData,
                    __typename: 'ContractFormData'
                }
            },
            draftRates: contract.draftRates || rates,
            packageSubmissions: contract.packageSubmissions || packageSubmissions,
            __typename: 'UnlockedContract'
        }
        // set up data to return
        draftSubmission = unlockedContract
    return {draftSubmission, previousDocuments,  updateDraft, createDraft, interimState, showPageErrorMessage }
}

export { useContractForm }
export type { UseContractForm }
