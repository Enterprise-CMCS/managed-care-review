import React from 'react'
import { gql, useMutation } from '@apollo/client'
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
    GenericDocumentInput,
} from '../../../gen/gqlClient'
import { formatDocumentsForGQL } from '../../../formHelpers/formatters'
import { RoutesRecord } from '@mc-review/constants'
import { useRouteParams } from '../../../hooks'

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

type CreatedSDPState = {
    id: string
    lastSeenUpdatedAt: string
}

type UpdateSDPInput = {
    sdpID: string
    lastSeenUpdatedAt: string
    sdpDocuments: GenericDocumentInput[]
    relatedContractIDs: string[]
    stateContacts: SDPContactsFormValues['stateContacts']
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
    const navigationState = location.state as SDPNavigationState | null
    const [currentPage, setCurrentPage] = React.useState<
        | 'SUBMISSIONS_TYPE'
        | 'SUBMISSIONS_CONTRACT_DETAILS'
        | 'SUBMISSIONS_SDP_CONTACTS'
        | 'SUBMISSIONS_SDP_REVIEW_SUBMIT'
    >(() => {
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

    React.useEffect(() => {
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
                        } catch (_error) {
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
                            generatePath(
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
                                sdpDocuments:
                                    formatDocumentsForGQL(values.sdpDocuments),
                                relatedContractIDs:
                                    values.linkContractSelects.filter(Boolean),
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
                        } catch (_error) {
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
                            generatePath(
                                RoutesRecord.SUBMISSIONS_SDP_DETAILS,
                                {
                                    id: draftSDP?.id ?? id ?? 'new-draft',
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
                                    sdpDetailsValues.linkContractSelects.filter(
                                        Boolean
                                    ),
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
                        } catch (_error) {
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
                />
            )}
        </div>
    )
}
