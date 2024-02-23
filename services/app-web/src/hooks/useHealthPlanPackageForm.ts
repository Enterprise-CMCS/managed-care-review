import { useState, useEffect, ReactNode } from 'react'
import { usePage } from "../contexts/PageContext"
import { useStatePrograms } from './useStatePrograms'
import { useFetchHealthPlanPackageWrapper } from '../gqlHelpers'
import { CreateHealthPlanPackageInput, HealthPlanPackage, UpdateInformation, useCreateHealthPlanPackageMutation, useUpdateHealthPlanFormDataMutation } from '../gen/gqlClient'
import { UnlockedHealthPlanFormDataType, packageName } from '../common-code/healthPlanFormDataType'
import { domainToBase64 } from '../common-code/proto/healthPlanFormDataProto'
import { recordJSException } from '../otelHelpers'
import { handleApolloError } from '../gqlHelpers/apolloErrors'
import { ApolloError } from '@apollo/client'
import { makeDocumentDateTable, makeDocumentS3KeyLookup } from '../documentHelpers'
import { DocumentDateLookupTableType } from '../documentHelpers/makeDocumentDateLookupTable'
import type { InterimState } from '../pages/StateSubmission/ErrorOrLoadingPage'


type  UseHealthPlanPackageForm = {
    draftSubmission?: UnlockedHealthPlanFormDataType
    unlockInfo?: UpdateInformation
    showPageErrorMessage: string | boolean
    previousDocuments?: string[]
    updateDraft: (
        input: UnlockedHealthPlanFormDataType
    ) => Promise<HealthPlanPackage | Error>
    createDraft: (
        input: CreateHealthPlanPackageInput
    ) => Promise<HealthPlanPackage | Error>
    documentDateLookupTable?: DocumentDateLookupTableType
   interimState?:  InterimState,
   submissionName?: string
}
// This hook is for use on form pages still relying on the old HealthPlanPackage APIS and domain model types
// This is intentionally throwaway code that replicates logic formally in StateSubmissionForm
// PLease delete and remove this file when HealthPlanPackage is fully out of the Form

const useHealthPlanPackageForm = (packageID?: string): UseHealthPlanPackageForm => {
     // Set up defaults for the return value for hook
     let interimState: UseHealthPlanPackageForm['interimState'] = undefined // enum to determine what Interim UI should override form page
     let previousDocuments: UseHealthPlanPackageForm['previousDocuments'] = [] // used for document upload tables
     let draftSubmission: UseHealthPlanPackageForm['draftSubmission'] = undefined // form data from current package revision, used to load form
     let unlockInfo: UseHealthPlanPackageForm['unlockInfo'] = undefined
     let documentDateLookupTable = undefined
     const [showPageErrorMessage, setShowPageErrorMessage] = useState<
     boolean | string
 >(false) // string is a custom error message, defaults to generic of true
    const { updateHeading } = usePage()
    const [pkgNameForHeading, setPkgNameForHeading] = useState<
    string | undefined
>(undefined)

useEffect(() => {
    updateHeading({ customHeading: pkgNameForHeading })
}, [pkgNameForHeading, updateHeading])

const statePrograms = useStatePrograms()

const { result: fetchResult } = useFetchHealthPlanPackageWrapper(packageID ?? 'new-draft', packageID? false: true)
const [createFormData] = useCreateHealthPlanPackageMutation()

const createDraft: UseHealthPlanPackageForm['createDraft']  = async (
    input: CreateHealthPlanPackageInput
): Promise<HealthPlanPackage | Error> => {
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
        const createdSubmission: HealthPlanPackage | undefined =
            createResult?.data?.createHealthPlanPackage.pkg

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
const [updateFormData] = useUpdateHealthPlanFormDataMutation()

const updateDraft: UseHealthPlanPackageForm['updateDraft']  = async (
    input: UnlockedHealthPlanFormDataType
): Promise<HealthPlanPackage | Error> => {
    const base64Draft = domainToBase64(input)

    setShowPageErrorMessage(false)
    try {
        const updateResult = await updateFormData({
            variables: {
                input: {
                    pkgID: pkg.id,
                    healthPlanFormData: base64Draft,
                },
            },
        })
        const updatedSubmission: HealthPlanPackage | undefined =
            updateResult?.data?.updateHealthPlanFormData.pkg

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

if (fetchResult.status === 'LOADING') {
    interimState = 'LOADING'
    return {interimState, createDraft, updateDraft, showPageErrorMessage }
}

if (fetchResult.status === 'ERROR') {
    const err = fetchResult.error
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

const { data, revisionsLookup } = fetchResult
const pkg = data.fetchHealthPlanPackage.pkg

// pull out the latest revision and document lookups
const latestRevision = pkg.revisions[0].node
const formDataFromLatestRevision =
    revisionsLookup[latestRevision.id].formData
const documentDates = makeDocumentDateTable(revisionsLookup)
const documentLists = makeDocumentS3KeyLookup(revisionsLookup)
previousDocuments = documentLists.previousDocuments
// if we've gotten back a submitted revision, it can't be edited
if (formDataFromLatestRevision.status !== 'DRAFT') {
 interimState = 'INVALID_STATUS'
 return {createDraft, updateDraft,  showPageErrorMessage}
}

const submissionName = packageName(
    formDataFromLatestRevision.stateCode,
    formDataFromLatestRevision.stateNumber,
    formDataFromLatestRevision.programIDs,
    statePrograms
)
if (pkgNameForHeading !== submissionName) {
    setPkgNameForHeading(submissionName)
}

    // set up data to return
    draftSubmission = formDataFromLatestRevision
    unlockInfo =  latestRevision.unlockInfo ?? undefined // An unlocked revision is defined by having unlockInfo on it, pull it out here if it exists
    documentDateLookupTable = documentDates
    return {draftSubmission, unlockInfo, previousDocuments, documentDateLookupTable,  updateDraft, createDraft, interimState, showPageErrorMessage, submissionName }
}

export {useHealthPlanPackageForm}
export type {UseHealthPlanPackageForm}