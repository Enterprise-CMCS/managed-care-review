import { useState, useEffect} from 'react'
import { usePage } from "../contexts/PageContext"
import { useStatePrograms } from './useStatePrograms'
import { useFetchHealthPlanPackageWrapper} from '../gqlHelpers'
import {
    SubmissionType as SubmissionTypeT,
    CreateContractInput,
    useFetchContractQuery,
    useCreateContractMutation,
    useUpdateContractMutation,
    useUpdateDraftContractRatesMutation,
    ContractRevision,
    UpdateInformation,
    UnlockedContract,
    Contract
} from '../gen/gqlClient'
import { UnlockedHealthPlanFormDataType, packageName } from '../common-code/healthPlanFormDataType'
import { domainToBase64 } from '../common-code/proto/healthPlanFormDataProto'
import { recordJSException } from '../otelHelpers'
import { handleApolloError } from '../gqlHelpers/apolloErrors'
import { ApolloError } from '@apollo/client'
import { makeDocumentDateTable, makeDocumentS3KeyLookup } from '../documentHelpers'
import { DocumentDateLookupTableType } from '../documentHelpers/makeDocumentDateLookupTable'
import type { InterimState } from '../pages/StateSubmission/ErrorOrLoadingPage'


type  UseContractForm = {
    draftSubmission?: ContractRevision
    unlockInfo?: UpdateInformation
    showPageErrorMessage: string | boolean
    previousDocuments?: string[]
    updateDraft: (
        input: Contract
    ) => Promise<Contract | Error>
    createDraft: (input: CreateContractInput) => Promise<Contract | Error>
    documentDateLookupTable?: DocumentDateLookupTableType
    interimState?:  InterimState
    submissionName?: string
}

const useContractForm = (contractID: string): UseContractForm => {
    // Set up defaults for the return value for hook
    let interimState: UseContractForm['interimState'] = undefined // enum to determine what Interim UI should override form page
    let previousDocuments: UseContractForm['previousDocuments'] = [] // used for document upload tables
    let draftSubmission: UseContractForm['draftSubmission'] = undefined // form data from current package revision, used to load form
    let unlockInfo: UseContractForm['unlockInfo'] = undefined
    let documentDateLookupTable = undefined
    const [showPageErrorMessage, setShowPageErrorMessage] = useState<boolean | string>(false) // string is a custom error message, defaults to generic of true
    const { updateHeading } = usePage()
    const [pkgNameForHeading, setPkgNameForHeading] = useState<string | undefined>(undefined)

    useEffect(() => {
        updateHeading({ customHeading: pkgNameForHeading })
    }, [pkgNameForHeading, updateHeading])

    const statePrograms = useStatePrograms()

    const { 
        data: fetchResultData,
        error: fetchResultError,
        loading: fetchResultLoading
     } = useFetchContractQuery({variables: {
        input: {
            contractID: contractID
        }
    }})
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
    const [updateFormData] = useUpdateDraftContractRatesMutation()

    const updateDraft: UseContractForm['updateDraft']  = async (
        input: Contract
    ): Promise<Contract | Error> => {

        setShowPageErrorMessage(false)
        try {
            const updateResult = await updateFormData({
                variables: {
                    input: {
                        contractID: contract!.id,
                        lastSeenUpdatedAt: '',
                        updatedRates: []
                    },
                },
            })
            const updatedSubmission =
                updateResult?.data?.updateDraftContractRates.contract

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

    // pull out the latest revision and document lookups
    const latestRevision = contract.draftRevision
    // const formDataFromLatestRevision =
    //     revisionsLookup[latestRevision.id].formData
    // const documentDates = makeDocumentDateTable(revisionsLookup)
    // const documentLists = makeDocumentS3KeyLookup(revisionsLookup)
    // previousDocuments = documentLists.previousDocuments

    // if we've gotten back a submitted revision, it can't be edited
    // if (formDataFromLatestRevision.status !== 'DRAFT') {
    //     interimState = 'INVALID_STATUS'
    //     return {createDraft, updateDraft,  showPageErrorMessage}
    // }

    // const submissionName = packageName(
    //     formDataFromLatestRevision.stateCode,
    //     formDataFromLatestRevision.stateNumber,
    //     formDataFromLatestRevision.programIDs,
    //     statePrograms
    // )
    const submissionName = 'test'
    if (pkgNameForHeading !== submissionName) {
        setPkgNameForHeading(submissionName)
    }

    // set up data to return
    draftSubmission = contract.draftRevision!
    unlockInfo =  latestRevision!.unlockInfo ?? undefined // An unlocked revision is defined by having unlockInfo on it, pull it out here if it exists
    // documentDateLookupTable = documentDates
    return {draftSubmission, unlockInfo, previousDocuments, documentDateLookupTable,  updateDraft, createDraft, interimState, showPageErrorMessage, submissionName }
}

export {useContractForm}
export type {UseContractForm}
