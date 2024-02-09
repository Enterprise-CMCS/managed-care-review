import { dayjs } from '../../../app-web/src/common-code/dateHelpers'
import {
    SubmissionDocument,
    ActuaryContact,
} from '../common-code/healthPlanFormDataType'
import { FileItemT } from '../components'
import { GenericDocument, ActuaryContact as  GQLActuaryContact } from '../gen/gqlClient'
import { S3ClientT } from '../s3'
import { v4 as uuidv4 } from 'uuid'

const formatUserInputDate = (initialValue?: string): string | undefined => {
    const dayjsValue = dayjs(initialValue)
    return initialValue && dayjsValue.isValid()
        ? dayjs(initialValue).format('YYYY-MM-DD')
        : initialValue // preserve undefined to show validations later
}
// Convert form fields to pass data to api. GQL handles null for empty fields.
const formatForApi = (attribute: string): string | null => {
    if (attribute === '') {
        return null
    }
    return attribute
}

// Convert api data for use in form.  Form fields must be a string.
// Empty values as an empty string, dates in date picker as YYYY-MM-DD, boolean as "Yes" "No" values
const formatForForm = (
    attribute: boolean | Date | string | null | undefined
): string => {
    if (attribute === null || attribute === undefined) {
        return ''
    } else if (attribute instanceof Date) {
        return dayjs(attribute).utc().format('YYYY-MM-DD')
    } else if (typeof attribute === 'boolean') {
        return attribute ? 'YES' : 'NO'
    } else {
        return attribute
    }
}

// This function can be cleaned up when we move off domain types and only use graphql
const formatActuaryContactsForForm = (actuaryContacts?: ActuaryContact[] | GQLActuaryContact[]) : ActuaryContact[] => {
    return actuaryContacts &&  actuaryContacts.length > 0
        ? actuaryContacts.map( (contact) => {
            const {name, titleRole,email,actuarialFirm, actuarialFirmOther} = contact
                    return {
                    name: name ?? '',
                    titleRole: titleRole ?? '',
                    email: email ?? '',
                    actuarialFirmOther: actuarialFirmOther ?? undefined,
                    actuarialFirm: actuarialFirm ?? undefined,
                }
        })
        : [
              {
                  name: '',
                  titleRole: '',
                  email: '',
                  actuarialFirm: undefined,
                  actuarialFirmOther: '',
              },
          ]
}



const formatFormDateForGQL = (attribute: string): string | undefined => {
    return (attribute === '') ? undefined :  attribute
}

const formatDocumentsForGQL = (
    fileItems: FileItemT[]
): GenericDocument[] => {
    return fileItems.reduce((cleanedFileItems, fileItem) => {
        if (fileItem.status === 'UPLOAD_ERROR') {
            console.info(
                'Attempting to save files that failed upload, discarding invalid files'
            )
        } else if (fileItem.status === 'SCANNING_ERROR') {
            console.info(
                'Attempting to save files that failed scanning, discarding invalid files'
            )
        } else if (fileItem.status === 'DUPLICATE_NAME_ERROR') {
            console.info(
                'Attempting to save files that are duplicate names, discarding duplicate'
            )
        } else if (!fileItem.s3URL) {
            console.info(
                'Attempting to save a seemingly valid file item is not yet uploaded to S3, this should not happen on form submit. Discarding file.'
            )
        } else if (!fileItem.sha256) {
            console.info(
                'Attempting to save a seemingly valid file item does not have a sha256 yet. this should not happen on form submit. Discarding file.'
            )
        } else {
            cleanedFileItems.push({
                name: fileItem.name,
                s3URL: fileItem.s3URL,
                sha256: fileItem.sha256,
            })
        }
        return cleanedFileItems
    }, [] as GenericDocument[])
}

const formatDocumentsForForm = ({
    documents,
    getKey,
}: {
    documents?: SubmissionDocument[] | GenericDocument[]
    getKey: S3ClientT['getKey'] // S3 function to call when formatting to double check we have valid documents, probably the backend should be doing this to reduce client async errors handling with bad data
}): FileItemT[] => {
    if (!documents) return []

    return (
        documents.map((doc) => {
            const key = getKey(doc.s3URL)
            if (!key) {
                // If there is no key, this means the file saved on a submission cannot be parsed or does not exist on s3.
                // We still include the file in the list displayed to the user, but with an error.
                return {
                    id: uuidv4(),
                    name: doc.name,
                    key: 'INVALID_KEY',
                    s3URL: undefined,
                    sha256: doc.sha256,
                    status: 'UPLOAD_ERROR',
                }
            }
            return {
                id: uuidv4(),
                name: doc.name,
                key: key,
                s3URL: doc.s3URL,
                sha256: doc.sha256,
                status: 'UPLOAD_COMPLETE',
            }
        }) || []
    )
}

// DEPRECATED
// Domain helpers are for HPP code. We are migrating off this in favor of directly using GQL utilities

const formatFormDateForDomain = (attribute: string): Date | undefined => {
    if (attribute === '') {
        return undefined
    }
    return dayjs.utc(attribute).toDate()
}



const formatDocumentsForDomain = (
    fileItems: FileItemT[]
): SubmissionDocument[] => {
    return fileItems.reduce((cleanedFileItems, fileItem) => {
        if (fileItem.status === 'UPLOAD_ERROR') {
            console.info(
                'Attempting to save files that failed upload, discarding invalid files'
            )
        } else if (fileItem.status === 'SCANNING_ERROR') {
            console.info(
                'Attempting to save files that failed scanning, discarding invalid files'
            )
        } else if (fileItem.status === 'DUPLICATE_NAME_ERROR') {
            console.info(
                'Attempting to save files that are duplicate names, discarding duplicate'
            )
        } else if (!fileItem.s3URL) {
            console.info(
                'Attempting to save a seemingly valid file item is not yet uploaded to S3, this should not happen on form submit. Discarding file.'
            )
        } else if (!fileItem.sha256) {
            console.info(
                'Attempting to save a seemingly valid file item does not have a sha256 yet. this should not happen on form submit. Discarding file.'
            )
        } else {
            cleanedFileItems.push({
                name: fileItem.name,
                s3URL: fileItem.s3URL,
                sha256: fileItem.sha256,
            })
        }
        return cleanedFileItems
    }, [] as SubmissionDocument[])
}

const formatYesNoForProto = (
    attribute: string | undefined
): boolean | undefined => {
    if (attribute === 'YES') {
        return true
    }
    if (attribute === 'NO') {
        return false
    }
    return undefined
}

export {
    formatForApi,
    formatForForm,
    formatUserInputDate,
    formatYesNoForProto,
    formatFormDateForDomain,
    formatDocumentsForDomain,
    formatDocumentsForForm,
    formatActuaryContactsForForm,
    formatDocumentsForGQL,
    formatFormDateForGQL
}
