import { useState, useEffect} from 'react'
import { usePage } from "../contexts/PageContext"
import {
    CreateContractInput,
    useFetchContractQuery,
    useCreateContractMutation,
    useUpdateContractDraftRevisionMutation,
    ContractDraftRevisionFormDataInput,
    UpdateInformation,
    Contract
} from '../gen/gqlClient'
import { recordJSException } from '../otelHelpers'
import { handleApolloError } from '../gqlHelpers/apolloErrors'
import { ApolloError } from '@apollo/client'
import type { InterimState } from '../pages/StateSubmission/ErrorOrLoadingPage'


type  UseContractForm = {
    draftSubmission?: Contract
    unlockInfo?: UpdateInformation
    showPageErrorMessage: string | boolean
    previousDocuments?: string[]
    updateDraft: (
        input: Contract
    ) => Promise<Contract | Error>
    createDraft: (input: CreateContractInput) => Promise<Contract | Error>
    interimState?:  InterimState
    submissionName?: string
}

const useContractForm = (contractID?: string): UseContractForm => {
    // Set up defaults for the return value for hook
    let interimState: UseContractForm['interimState'] = undefined // enum to determine what Interim UI should override form page
    let previousDocuments: UseContractForm['previousDocuments'] = [] // used for document upload tables
    let draftSubmission: UseContractForm['draftSubmission'] = undefined // form data from current package revision, used to load form
    let unlockInfo: UseContractForm['unlockInfo'] = undefined
    const [showPageErrorMessage, setShowPageErrorMessage] = useState<boolean | string>(false) // string is a custom error message, defaults to generic of true
    const { updateHeading } = usePage()
    const [pkgNameForHeading, setPkgNameForHeading] = useState<string | undefined>(undefined)

    useEffect(() => {
        updateHeading({ customHeading: pkgNameForHeading })
    }, [pkgNameForHeading, updateHeading])

    const { 
        data: fetchResultData,
        error: fetchResultError,
        loading: fetchResultLoading
     } = useFetchContractQuery({
        variables: {
            input: {
                contractID: contractID ?? 'new-draft'
            }
        },
        skip: !contractID
    })
    const [createFormData] = useCreateContractMutation()

    const createDraft: UseContractForm['createDraft']  = async (
        input: CreateContractInput
    ): Promise<Contract | Error> => {
        setShowPageErrorMessage(false)
        const {populationCovered,programIDs,riskBasedContract, submissionType, submissionDescription, contractType} = input
        if(populationCovered === undefined || contractType === undefined) {
            return new Error('wrong')
        }
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
                console.info('Failed to update form data', createResult)
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
        input: Contract
    ): Promise<Contract | Error> => {

        setShowPageErrorMessage(false)
        try {
            const formData:ContractDraftRevisionFormDataInput = {
                submissionDescription: input.draftRevision!.formData.submissionDescription,
                submissionType: input.draftRevision!.formData.submissionType,
                contractType: input.draftRevision!.formData.contractType,
                contractDocuments: input.draftRevision!.formData.contractDocuments,
                federalAuthorities: input.draftRevision!.formData.federalAuthorities,
                managedCareEntities: input.draftRevision!.formData.managedCareEntities,
                programIDs: input.draftRevision!.formData.programIDs,
                stateContacts: input.draftRevision!.formData.stateContacts,
                supportingDocuments: input.draftRevision!.formData.supportingDocuments,
                riskBasedContract: input.draftRevision!.formData.riskBasedContract,
                populationCovered: input.draftRevision!.formData.populationCovered,
            } 
            const updateResult = await updateFormData({
                variables: {
                    input: {
                        contractID: contractID ?? 'new-draft',
                        lastSeenUpdatedAt: contract!.draftRevision!.updatedAt,
                        formData: formData
                    },
                },
            })
            const updatedSubmission =
                updateResult?.data?.updateContractDraftRevision.contract

            if (!updatedSubmission) {
                setShowPageErrorMessage(true)
                console.info('Failed to update form data', updateResult)
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

    const contract = fetchResultData?.fetchContract.contract
    if (!contract) {
        return {interimState, createDraft, updateDraft, showPageErrorMessage }
    }
    if (fetchResultLoading) {
        interimState = 'LOADING'
        return {interimState, createDraft, updateDraft, showPageErrorMessage }
    }

    if (fetchResultError) {
        const err = fetchResultError
        if (err instanceof ApolloError){
            handleApolloError(err, true)
            if (err.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
                    interimState = 'NOT_FOUND'
                    return {interimState,createDraft, updateDraft,  showPageErrorMessage }
            }
        }
        if (err.name !== 'SKIPPED') {
            recordJSException(err)
            interimState = 'GENERIC_ERROR'// api failure or protobuf decode failure
            return { interimState,  createDraft, updateDraft,  showPageErrorMessage}
        }
        return {interimState: undefined, createDraft, updateDraft,  showPageErrorMessage}

    }

    // pull out the latest revision
    const latestRevision = contract.draftRevision
    
    const submissionName = contract.draftRevision?.contractName
    if (pkgNameForHeading !== submissionName) {
        setPkgNameForHeading(submissionName)
    }

    // set up data to return
    draftSubmission = contract
    unlockInfo =  latestRevision!.unlockInfo ?? undefined // An unlocked revision is defined by having unlockInfo on it, pull it out here if it exists
    return {draftSubmission, unlockInfo, previousDocuments,  updateDraft, createDraft, interimState, showPageErrorMessage, submissionName }
}

export {useContractForm}
export type {UseContractForm}
