import React from 'react'
import { gql, useMutation, useQuery } from '@apollo/client'
import { generatePath, useLocation, useNavigate } from 'react-router-dom'
import {
    SDPSubmissionDetails,
    sdpSubmissionDetailsInitialValues,
    type SDPSubmissionDetailsFormValues,
} from './SDPSubmissionDetails'
import {
    SDPDetails,
    sdpDetailsInitialValues,
    type SDPDetailsFormValues,
} from './SDPDetails'
import {
    SDPContacts,
    sdpContactsInitialValues,
    type SDPContactsFormValues,
} from './SDPContacts'
import { SDPReviewSubmit } from './SDPReviewSubmit'
import formContainerStyles from '../../../components/FormContainer/FormContainer.module.scss'
import {
    CreateSdpInput,
    GenericDocument,
    GenericDocumentInput,
} from '../../../gen/gqlClient'
import {
    formatDocumentsForForm,
    formatDocumentsForGQL,
    formatForForm,
} from '../../../formHelpers/formatters'
import { RoutesRecord } from '@mc-review/constants'
import { useRouteParams } from '../../../hooks'
import { useS3 } from '../../../contexts/S3Context'
import { Loading } from '../../../components'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'

const CREATE_SDP_MUTATION = gql`
    mutation createSDPSubmissionDraft($input: CreateSDPInput!) {
        createSDP(input: $input) {
            sdp {
                id
                draftRevision {
                    id
                    updatedAt
                }
            }
        }
    }
`

const UPDATE_SDP_MUTATION = gql`
    mutation updateSDPSubmissionDraft($input: UpdateSDPInput!) {
        updateSDP(input: $input) {
            sdp {
                id
                draftRevision {
                    id
                    updatedAt
                }
            }
        }
    }
`

const SUBMIT_SDP_MUTATION = gql`
    mutation submitSDPSubmission($input: SubmitSDPInput!) {
        submitSDP(input: $input) {
            sdp {
                id
                status
            }
        }
    }
`

const FETCH_SDP_EDIT_QUERY = gql`
    query fetchSDPSubmissionEdit($input: FetchSDPInput!) {
        fetchSDP(input: $input) {
            sdp {
                id
                status
                relatedContracts {
                    id
                }
                draftRevision {
                    id
                    updatedAt
                    formData {
                        submissionType
                        programIDs
                        changesIncluded
                        ratingPeriodStart
                        ratingPeriodEnd
                        estimatedFederalShare
                        estimatedStateShare
                        automaticallyRenewed
                        stateContacts {
                            name
                            titleRole
                            email
                        }
                    }
                    sdpDocuments {
                        id
                        name
                        s3URL
                        sha256
                        dateAdded
                    }
                }
            }
        }
    }
`

type CreatedSDPState = {
    id: string
    lastSeenUpdatedAt: string
}

type UpdateSDPInput = {
    sdpID: string
    lastSeenUpdatedAt: string
    submissionType?: SDPSubmissionDetailsFormValues['submissionType']
    programIDs?: SDPSubmissionDetailsFormValues['programIDs']
    changesIncluded?: SDPSubmissionDetailsFormValues['changesIncluded']
    ratingPeriodStart?: string
    ratingPeriodEnd?: string
    estimatedFederalShare?: string | null
    estimatedStateShare?: string | null
    automaticallyRenewed?: boolean
    sdpDocuments: GenericDocumentInput[]
    relatedContractIDs: string[]
    stateContacts: SDPContactsFormValues['stateContacts']
}

type SubmitSDPInput = {
    sdpID: string
    lastSeenUpdatedAt: string
}

type SDPNavigationState = {
    submissionDetailsValues?: SDPSubmissionDetailsFormValues
    sdpDetailsValues?: SDPDetailsFormValues
    sdpContactsValues?: SDPContactsFormValues
    draftSDP?: CreatedSDPState
}

export const SDPSubmissionForm = (): React.ReactElement => {
    const navigate = useNavigate()
    const location = useLocation()
    const { id } = useRouteParams()
    const { getKey } = useS3()
    const navigationState = location.state as SDPNavigationState | null
    const shouldHydrateFromQuery =
        Boolean(id) && !navigationState?.draftSDP?.lastSeenUpdatedAt
    const [currentPage, setCurrentPage] = React.useState<
        | 'SUBMISSIONS_TYPE'
        | 'SUBMISSIONS_CONTRACT_DETAILS'
        | 'SUBMISSIONS_SDP_CONTACTS'
        | 'SUBMISSIONS_SDP_REVIEW_SUBMIT'
    >(() => {
        if (location.pathname.endsWith('/edit/submission-details')) {
            return 'SUBMISSIONS_TYPE'
        }
        if (location.pathname.endsWith('/edit/review-and-submit')) {
            return 'SUBMISSIONS_SDP_REVIEW_SUBMIT'
        }
        if (location.pathname.endsWith('/edit/contacts')) {
            return 'SUBMISSIONS_SDP_CONTACTS'
        }
        if (location.pathname.endsWith('/edit/sdp-details')) {
            return 'SUBMISSIONS_CONTRACT_DETAILS'
        }
        return 'SUBMISSIONS_TYPE'
    })
    const [submissionDetailsValues, setSubmissionDetailsValues] =
        React.useState<SDPSubmissionDetailsFormValues>(
            navigationState?.submissionDetailsValues ??
                sdpSubmissionDetailsInitialValues
        )
    const [sdpDetailsValues, setSdpDetailsValues] =
        React.useState<SDPDetailsFormValues>(
            navigationState?.sdpDetailsValues ?? sdpDetailsInitialValues
        )
    const [sdpContactsValues, setSdpContactsValues] =
        React.useState<SDPContactsFormValues>(
            navigationState?.sdpContactsValues ?? sdpContactsInitialValues
        )
    const [draftSDP, setDraftSDP] = React.useState<CreatedSDPState | undefined>(
        navigationState?.draftSDP ??
            (id ? { id, lastSeenUpdatedAt: '' } : undefined)
    )
    const [pageErrorMessage, setPageErrorMessage] = React.useState<
        string | boolean
    >(false)

    const [createSDPDraft] = useMutation(CREATE_SDP_MUTATION)
    const [updateSDPDraft] = useMutation(UPDATE_SDP_MUTATION)
    const [submitSDPDraft] = useMutation(SUBMIT_SDP_MUTATION)
    const { data, loading, error } = useQuery(FETCH_SDP_EDIT_QUERY, {
        variables: {
            input: {
                sdpID: id ?? 'unknown-sdp',
            },
        },
        skip: !shouldHydrateFromQuery,
        fetchPolicy: 'cache-and-network',
    })

    React.useEffect(() => {
        if (location.pathname.endsWith('/edit/submission-details')) {
            setCurrentPage('SUBMISSIONS_TYPE')
            return
        }

        if (location.pathname.endsWith('/edit/review-and-submit')) {
            setCurrentPage('SUBMISSIONS_SDP_REVIEW_SUBMIT')
            return
        }

        if (location.pathname.endsWith('/edit/contacts')) {
            setCurrentPage('SUBMISSIONS_SDP_CONTACTS')
            return
        }

        if (location.pathname.endsWith('/edit/sdp-details')) {
            setCurrentPage('SUBMISSIONS_CONTRACT_DETAILS')
            return
        }

        setCurrentPage('SUBMISSIONS_TYPE')
    }, [location.pathname])

    React.useEffect(() => {
        if (!shouldHydrateFromQuery) {
            return
        }

        const fetchedSDP = data?.fetchSDP?.sdp
        const draftRevision = fetchedSDP?.draftRevision

        if (!fetchedSDP || !draftRevision) {
            return
        }

        setSubmissionDetailsValues({
            submissionType: draftRevision.formData.submissionType,
            programIDs: draftRevision.formData.programIDs,
            changesIncluded: draftRevision.formData.changesIncluded,
            ratingPeriodStart: formatForForm(
                draftRevision.formData.ratingPeriodStart
            ),
            ratingPeriodEnd: formatForForm(
                draftRevision.formData.ratingPeriodEnd
            ),
            estimatedFederalShare:
                draftRevision.formData.estimatedFederalShare ?? '',
            estimatedStateShare:
                draftRevision.formData.estimatedStateShare ?? '',
            automaticallyRenewed: formatForForm(
                draftRevision.formData.automaticallyRenewed
            ) as 'YES' | 'NO',
        })
        setSdpDetailsValues({
            sdpDocuments: formatDocumentsForForm({
                documents: draftRevision.sdpDocuments as GenericDocument[],
                getKey,
            }),
            linkContractSelects:
                fetchedSDP.relatedContracts?.length > 0
                    ? fetchedSDP.relatedContracts.map(
                          (contract: { id: string }) => contract.id
                      )
                    : [''],
            relatedContracts:
                fetchedSDP.relatedContracts?.length > 0
                    ? fetchedSDP.relatedContracts.map(
                          (contract: { id: string }) => contract.id
                      )
                    : [],
        })
        setSdpContactsValues({
            stateContacts:
                draftRevision.formData.stateContacts.length > 0
                    ? draftRevision.formData.stateContacts.map(
                          (contact: {
                              name?: string | null
                              titleRole?: string | null
                              email?: string | null
                          }) => ({
                              name: contact.name ?? '',
                              titleRole: contact.titleRole ?? '',
                              email: contact.email ?? '',
                          })
                      )
                    : sdpContactsInitialValues.stateContacts,
        })
        setDraftSDP({
            id: fetchedSDP.id,
            lastSeenUpdatedAt: draftRevision.updatedAt,
        })
    }, [data, getKey, shouldHydrateFromQuery])

    if (shouldHydrateFromQuery && loading && !data) {
        return <Loading />
    }

    if (shouldHydrateFromQuery && error && !data) {
        return <GenericErrorPage />
    }

    return (
        <div
            data-testid="sdp-submission-form-page"
            className={formContainerStyles.formPage}
        >
            {currentPage === 'SUBMISSIONS_TYPE' ? (
                <SDPSubmissionDetails
                    initialValues={submissionDetailsValues}
                    pageErrorMessage={pageErrorMessage}
                    onContinue={async (values) => {
                        setPageErrorMessage(false)
                        setSubmissionDetailsValues(values)
                        if (draftSDP?.id && draftSDP.lastSeenUpdatedAt) {
                            try {
                                const updateInput: UpdateSDPInput = {
                                    sdpID: draftSDP.id,
                                    lastSeenUpdatedAt:
                                        draftSDP.lastSeenUpdatedAt,
                                    submissionType: values.submissionType,
                                    programIDs: values.programIDs,
                                    changesIncluded: values.changesIncluded,
                                    ratingPeriodStart: values.ratingPeriodStart,
                                    ratingPeriodEnd: values.ratingPeriodEnd,
                                    estimatedFederalShare:
                                        values.estimatedFederalShare || null,
                                    estimatedStateShare:
                                        values.estimatedStateShare || null,
                                    automaticallyRenewed:
                                        values.automaticallyRenewed === 'YES',
                                    sdpDocuments: formatDocumentsForGQL(
                                        sdpDetailsValues.sdpDocuments
                                    ),
                                    relatedContractIDs:
                                        sdpDetailsValues.relatedContracts,
                                    stateContacts:
                                        sdpContactsValues.stateContacts,
                                }

                                const result = await updateSDPDraft({
                                    variables: {
                                        input: updateInput,
                                    },
                                })
                                const updatedSDP = result.data?.updateSDP?.sdp

                                if (
                                    !updatedSDP?.id ||
                                    !updatedSDP.draftRevision?.updatedAt
                                ) {
                                    setPageErrorMessage(
                                        'There was a problem updating the SDP draft'
                                    )
                                    return
                                }

                                const updatedDraft = {
                                    id: updatedSDP.id,
                                    lastSeenUpdatedAt:
                                        updatedSDP.draftRevision.updatedAt,
                                }

                                setDraftSDP(updatedDraft)
                                navigate(
                                    generatePath(
                                        RoutesRecord.SUBMISSIONS_SDP_DETAILS,
                                        {
                                            id: updatedSDP.id,
                                        }
                                    ),
                                    {
                                        state: {
                                            submissionDetailsValues: values,
                                            sdpDetailsValues,
                                            sdpContactsValues,
                                            draftSDP: updatedDraft,
                                        },
                                    }
                                )
                            } catch {
                                setPageErrorMessage(
                                    'There was a problem updating the SDP draft'
                                )
                            }
                            return
                        }

                        try {
                            const createInput: CreateSdpInput = {
                                submissionType: values.submissionType!,
                                programIDs: values.programIDs,
                                changesIncluded: values.changesIncluded,
                                ratingPeriodStart: values.ratingPeriodStart,
                                ratingPeriodEnd: values.ratingPeriodEnd,
                                estimatedFederalShare:
                                    values.estimatedFederalShare || null,
                                estimatedStateShare:
                                    values.estimatedStateShare || null,
                                automaticallyRenewed:
                                    values.automaticallyRenewed === 'YES',
                            }

                            const result = await createSDPDraft({
                                variables: {
                                    input: createInput,
                                },
                            })
                            const createdSDP = result.data?.createSDP?.sdp

                            if (
                                !createdSDP?.id ||
                                !createdSDP.draftRevision?.updatedAt
                            ) {
                                setPageErrorMessage(
                                    'There was a problem creating the SDP draft'
                                )
                                return
                            }

                            setDraftSDP({
                                id: createdSDP.id,
                                lastSeenUpdatedAt:
                                    createdSDP.draftRevision.updatedAt,
                            })
                            navigate(
                                generatePath(
                                    RoutesRecord.SUBMISSIONS_SDP_DETAILS,
                                    {
                                        id: createdSDP.id,
                                    }
                                ),
                                {
                                    state: {
                                        submissionDetailsValues: values,
                                        sdpDetailsValues,
                                        sdpContactsValues,
                                        draftSDP: {
                                            id: createdSDP.id,
                                            lastSeenUpdatedAt:
                                                createdSDP.draftRevision
                                                    .updatedAt,
                                        },
                                    },
                                }
                            )
                        } catch {
                            setPageErrorMessage(
                                'There was a problem creating the SDP draft'
                            )
                        }
                    }}
                />
            ) : currentPage === 'SUBMISSIONS_CONTRACT_DETAILS' ? (
                <SDPDetails
                    initialValues={sdpDetailsValues}
                    pageErrorMessage={pageErrorMessage}
                    onBack={() => {
                        setCurrentPage('SUBMISSIONS_TYPE')
                        navigate(
                            draftSDP?.id
                                ? generatePath(
                                      RoutesRecord.SUBMISSIONS_SDP_TYPE,
                                      {
                                          id: draftSDP.id,
                                      }
                                  )
                                : generatePath(
                                      RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM,
                                      {
                                          contractSubmissionType: 'sdp',
                                      }
                                  ),
                            {
                                state: {
                                    submissionDetailsValues,
                                    sdpDetailsValues,
                                    sdpContactsValues,
                                    draftSDP,
                                },
                            }
                        )
                    }}
                    onContinue={async (values) => {
                        setPageErrorMessage(false)
                        setSdpDetailsValues(values)

                        if (!draftSDP) {
                            setPageErrorMessage(
                                'There was a problem updating the SDP draft'
                            )
                            return
                        }

                        try {
                            const updateInput: UpdateSDPInput = {
                                sdpID: draftSDP.id,
                                lastSeenUpdatedAt: draftSDP.lastSeenUpdatedAt,
                                sdpDocuments: formatDocumentsForGQL(
                                    values.sdpDocuments
                                ),
                                relatedContractIDs: values.relatedContracts,
                                stateContacts: sdpContactsValues.stateContacts,
                            }

                            const result = await updateSDPDraft({
                                variables: {
                                    input: updateInput,
                                },
                            })
                            const updatedSDP = result.data?.updateSDP?.sdp

                            if (
                                !updatedSDP?.id ||
                                !updatedSDP.draftRevision?.updatedAt
                            ) {
                                setPageErrorMessage(
                                    'There was a problem updating the SDP draft'
                                )
                                return
                            }

                            setDraftSDP({
                                id: updatedSDP.id,
                                lastSeenUpdatedAt:
                                    updatedSDP.draftRevision.updatedAt,
                            })

                            navigate(
                                generatePath(
                                    RoutesRecord.SUBMISSIONS_SDP_CONTACTS,
                                    {
                                        id: updatedSDP.id,
                                    }
                                ),
                                {
                                    state: {
                                        submissionDetailsValues,
                                        sdpDetailsValues: values,
                                        sdpContactsValues,
                                        draftSDP: {
                                            id: updatedSDP.id,
                                            lastSeenUpdatedAt:
                                                updatedSDP.draftRevision
                                                    .updatedAt,
                                        },
                                    },
                                }
                            )
                        } catch {
                            setPageErrorMessage(
                                'There was a problem updating the SDP draft'
                            )
                        }
                    }}
                />
            ) : currentPage === 'SUBMISSIONS_SDP_CONTACTS' ? (
                <SDPContacts
                    initialValues={sdpContactsValues}
                    pageErrorMessage={pageErrorMessage}
                    onBack={() => {
                        setCurrentPage('SUBMISSIONS_CONTRACT_DETAILS')
                        navigate(
                            generatePath(RoutesRecord.SUBMISSIONS_SDP_DETAILS, {
                                id: draftSDP?.id ?? id ?? 'new-draft',
                            }),
                            {
                                state: {
                                    submissionDetailsValues,
                                    sdpDetailsValues,
                                    sdpContactsValues,
                                    draftSDP,
                                },
                            }
                        )
                    }}
                    onContinue={async (values) => {
                        setPageErrorMessage(false)
                        setSdpContactsValues(values)

                        if (!draftSDP) {
                            setPageErrorMessage(
                                'There was a problem updating the SDP draft'
                            )
                            return
                        }

                        try {
                            const updateInput: UpdateSDPInput = {
                                sdpID: draftSDP.id,
                                lastSeenUpdatedAt: draftSDP.lastSeenUpdatedAt,
                                sdpDocuments: formatDocumentsForGQL(
                                    sdpDetailsValues.sdpDocuments
                                ),
                                relatedContractIDs:
                                    sdpDetailsValues.relatedContracts,
                                stateContacts: values.stateContacts,
                            }

                            const result = await updateSDPDraft({
                                variables: {
                                    input: updateInput,
                                },
                            })
                            const updatedSDP = result.data?.updateSDP?.sdp

                            if (
                                !updatedSDP?.id ||
                                !updatedSDP.draftRevision?.updatedAt
                            ) {
                                setPageErrorMessage(
                                    'There was a problem updating the SDP draft'
                                )
                                return
                            }

                            const updatedDraft = {
                                id: updatedSDP.id,
                                lastSeenUpdatedAt:
                                    updatedSDP.draftRevision.updatedAt,
                            }

                            setDraftSDP(updatedDraft)

                            navigate(
                                generatePath(
                                    RoutesRecord.SUBMISSIONS_SDP_REVIEW_SUBMIT,
                                    {
                                        id: updatedSDP.id,
                                    }
                                ),
                                {
                                    state: {
                                        submissionDetailsValues,
                                        sdpDetailsValues,
                                        sdpContactsValues: values,
                                        draftSDP: updatedDraft,
                                    },
                                }
                            )
                        } catch {
                            setPageErrorMessage(
                                'There was a problem updating the SDP draft'
                            )
                        }
                    }}
                />
            ) : (
                <SDPReviewSubmit
                    id={draftSDP?.id ?? id ?? 'new-draft'}
                    submissionDetailsValues={submissionDetailsValues}
                    sdpDetailsValues={sdpDetailsValues}
                    sdpContactsValues={sdpContactsValues}
                    pageErrorMessage={pageErrorMessage}
                    onSubmit={async () => {
                        setPageErrorMessage(false)

                        if (!draftSDP?.id || !draftSDP.lastSeenUpdatedAt) {
                            setPageErrorMessage(
                                'There was a problem submitting the SDP draft'
                            )
                            return false
                        }

                        try {
                            const submitInput: SubmitSDPInput = {
                                sdpID: draftSDP.id,
                                lastSeenUpdatedAt: draftSDP.lastSeenUpdatedAt,
                            }

                            const result = await submitSDPDraft({
                                variables: {
                                    input: submitInput,
                                },
                            })
                            const submittedSDP = result.data?.submitSDP?.sdp

                            if (
                                !submittedSDP?.id ||
                                !['SUBMITTED', 'RESUBMITTED'].includes(
                                    submittedSDP.status
                                )
                            ) {
                                setPageErrorMessage(
                                    'There was a problem submitting the SDP draft'
                                )
                                return false
                            }

                            navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                            return true
                        } catch {
                            setPageErrorMessage(
                                'There was a problem submitting the SDP draft'
                            )
                            return false
                        }
                    }}
                />
            )}
        </div>
    )
}
