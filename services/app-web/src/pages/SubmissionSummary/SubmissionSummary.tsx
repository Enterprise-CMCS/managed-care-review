import {
    Grid,
    GridContainer,
    Link,
    ModalRef,
    FormGroup,
    Textarea,
} from '@trussworks/react-uswds'
import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ContractDetailsSummarySection } from '../StateSubmission/ReviewSubmit/ContractDetailsSummarySection'
import { ContactsSummarySection } from '../StateSubmission/ReviewSubmit/ContactsSummarySection'
import { RateDetailsSummarySection } from '../StateSubmission/ReviewSubmit/RateDetailsSummarySection'
import { SubmissionTypeSummarySection } from '../StateSubmission/ReviewSubmit/SubmissionTypeSummarySection'
import {
    SubmissionUnlockedBanner,
    SubmissionUpdatedBanner,
    DocumentWarningBanner,
    LinkWithLogging,
} from '../../components'
import { useTealium } from '../../hooks'
import { useFormik } from 'formik'
import { GenericApiErrorProps } from '../../components/Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import { Loading } from '../../components'
import { usePage } from '../../contexts/PageContext'
import { recordJSException } from '../../otelHelpers'
import {
    useFetchContractQuery,
    UpdateInformation,
    useApproveContractMutation,
} from '../../gen/gqlClient'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import { Error404 } from '../Errors/Error404Page'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import styles from './SubmissionSummary.module.scss'
import { ChangeHistory } from '../../components/ChangeHistory'
import {
    ModalOpenButton,
    UnlockSubmitModal,
    Modal,
} from '../../components/Modal'
import { RoutesRecord } from '../../constants'
import { useRouteParams } from '../../hooks'
import { getVisibleLatestContractFormData } from '../../gqlHelpers/contractsAndRates'
import { generatePath, Navigate } from 'react-router-dom'
import { hasCMSUserPermissions } from '../../gqlHelpers'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../common-code/featureFlags'

export const SubmissionSummary = (): React.ReactElement => {
    // Page level state
    const { updateHeading } = usePage()
    const modalRef = useRef<ModalRef>(null)
    const approveModalRef = useRef<ModalRef>(null)
    const [documentError, setDocumentError] = useState(false)
    const { loggedInUser } = useAuth()
    const { id } = useRouteParams()
    const [approveContract] = useApproveContractMutation()
    const [modalAlert, setModalAlert] = useState<
        GenericApiErrorProps | undefined
    >(undefined)
    const { logFormSubmitEvent } = useTealium()
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)
    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const isHelpDeskUser = loggedInUser?.role === 'HELPDESK_USER'
    const formik = useFormik({
        initialValues: {
            approveModalInput: '',
        },
        onSubmit: (values) => approveContractAction(values.approveModalInput),
    })
    const [isSubmitting, setIsSubmitting] = useState(false) // mock same behavior as formik isSubmitting

    const ldClient = useLDClient()

    const submissionApprovalFlag = ldClient?.variation(
        featureFlags.SUBMISSION_APPROVALS.flag,
        featureFlags.SUBMISSION_APPROVALS.defaultValue
    )

    // API requests
    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown-contract',
            },
        },
        fetchPolicy: 'network-only',
    })
    const contract = fetchContractData?.fetchContract.contract
    const name =
        contract && contract?.packageSubmissions.length > 0
            ? contract.packageSubmissions[0].contractRevision.contractName
            : ''
    useEffect(() => {
        updateHeading({
            customHeading: name,
        })
    }, [name, updateHeading])
    if (fetchContractLoading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (fetchContractError) {
        //error handling for a state user that tries to access rates for a different state
        if (
            fetchContractError?.graphQLErrors[0]?.extensions?.code ===
            'FORBIDDEN'
        ) {
            return (
                <ErrorForbiddenPage
                    errorMsg={fetchContractError.graphQLErrors[0].message}
                />
            )
        } else if (
            fetchContractError?.graphQLErrors[0]?.extensions?.code ===
            'NOT_FOUND'
        ) {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    } else if (!contract) {
        return <GenericErrorPage />
    }

    const submissionStatus = contract.status
    const isSubmitted =
        submissionStatus === 'SUBMITTED' || submissionStatus === 'RESUBMITTED'
    const statePrograms = contract.state.programs

    if (!isSubmitted && isStateUser) {
        if (submissionStatus === 'DRAFT') {
            return (
                <Navigate
                    to={generatePath(RoutesRecord.SUBMISSIONS_TYPE, { id })}
                />
            )
        } else {
            return (
                <Navigate
                    to={generatePath(RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT, {
                        id,
                    })}
                />
            )
        }
    }

    const contractFormData = getVisibleLatestContractFormData(
        contract,
        isStateUser
    )
    if (
        !contractFormData ||
        !statePrograms ||
        contract.packageSubmissions.length === 0
    ) {
        console.error(
            'missing fundamental contract data inside submission summary'
        )
        return <GenericErrorPage />
    }

    // Get the correct update info depending on the submission status
    let updateInfo: UpdateInformation | undefined = undefined
    if (submissionStatus === 'UNLOCKED' || submissionStatus === 'RESUBMITTED') {
        updateInfo =
            (submissionStatus === 'UNLOCKED'
                ? contract.draftRevision?.unlockInfo
                : contract.packageSubmissions[0].contractRevision.submitInfo) ||
            undefined
    }

    const isContractActionAndRateCertification =
        contractFormData?.submissionType === 'CONTRACT_AND_RATES'

    const handleDocumentDownloadError = (error: boolean) =>
        setDocumentError(error)

    const editOrAddMCCRSID = contract.mccrsID
        ? 'Edit MC-CRS number'
        : 'Add MC-CRS record number'
    const explainMissingData = (isHelpDeskUser || isStateUser) && !isSubmitted

    // Only show for CMS_USER or CMS_APPROVER_USER users
    const showSubmissionApproval = submissionApprovalFlag && hasCMSPermissions

    const approveContractAction = async (actionModalInput?: string) => {
        logFormSubmitEvent({
            heading: 'Approve submission',
            form_name: 'Approve submission',
            event_name: 'form_field_submit',
            link_type: 'link_other',
        })

        setIsSubmitting(true)
        try {
            await approveContract({
                variables: {
                    input: {
                        contractID: contract.id,
                        updatedReason: actionModalInput,
                    },
                },
            })
            approveModalRef.current?.toggleModal(undefined, false)
        } catch (err) {
            recordJSException(
                `RateDetails: Apollo error reported. Error message: Failed to create form data ${err}`
            )
            setModalAlert({
                heading: 'Approve submission error',
                message: err.message,
                // When we have generic/unknown errors override any suggestions and display the fallback "please refresh text"
                validationFail: false,
            })
        }
    }

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {submissionStatus === 'UNLOCKED' && updateInfo && (
                    <SubmissionUnlockedBanner
                        className={styles.banner}
                        loggedInUser={loggedInUser}
                        unlockedInfo={updateInfo}
                    />
                )}

                {submissionStatus === 'RESUBMITTED' && updateInfo && (
                    <SubmissionUpdatedBanner
                        className={styles.banner}
                        updateInfo={updateInfo}
                    />
                )}

                {documentError && (
                    <DocumentWarningBanner className={styles.banner} />
                )}

                {showSubmissionApproval &&
                    contract.reviewStatus !== 'APPROVED' && (
                        <>
                            <Grid
                                className={
                                    styles.approveWithdrawButtonContainer
                                }
                                row
                            >
                                <ModalOpenButton
                                    id="approval-modal-toggle-button"
                                    modalRef={approveModalRef}
                                    disabled={!isSubmitted}
                                    data-testid="approval-modal-toggle-button"
                                >
                                    Approve submission
                                </ModalOpenButton>
                            </Grid>
                            <Modal
                                id="approvalModal"
                                modalRef={approveModalRef}
                                onSubmit={() =>
                                    approveContractAction(
                                        formik.values.approveModalInput
                                    )
                                }
                                modalHeading="Are you sure you want to approve this submission?"
                                onSubmitText="Approve submission"
                                submitButtonProps={{ variant: 'default' }}
                                className={styles.approvalModal}
                                modalAlert={modalAlert}
                                isSubmitting={isSubmitting}
                            >
                                <form>
                                    <p>
                                        Once you approve, the submission status
                                        will change from Submitted to Approved.
                                    </p>
                                    <p className="margin-bottom-0">
                                        Provide an optional note
                                    </p>
                                    <FormGroup>
                                        <Textarea
                                            id="approveModalInput"
                                            name="approveModalInput"
                                            data-testid="approveModalInput"
                                            aria-required={false}
                                            error={false}
                                            onChange={formik.handleChange}
                                            defaultValue={
                                                formik.values.approveModalInput
                                            }
                                        />
                                    </FormGroup>
                                </form>
                            </Modal>
                        </>
                    )}

                <SubmissionTypeSummarySection
                    subHeaderComponent={
                        hasCMSPermissions ? (
                            <div className={styles.subHeader}>
                                {contract.mccrsID && (
                                    <span className={styles.mccrsID}>
                                        MC-CRS record number:
                                        <Link
                                            href={`https://mccrs.internal.cms.gov/Home/Index/${contract.mccrsID}`}
                                            aria-label="MC-CRS system login"
                                        >
                                            {contract.mccrsID}
                                        </Link>
                                    </span>
                                )}
                                <LinkWithLogging
                                    href={`/submissions/${contract.id}/mccrs-record-number`}
                                    className={
                                        contract.mccrsID ? styles.editLink : ''
                                    }
                                    aria-label={editOrAddMCCRSID}
                                >
                                    {editOrAddMCCRSID}
                                </LinkWithLogging>
                            </div>
                        ) : undefined
                    }
                    contract={contract}
                    submissionName={name}
                    headerChildComponent={
                        hasCMSPermissions ? (
                            <ModalOpenButton
                                modalRef={modalRef}
                                disabled={['DRAFT', 'UNLOCKED'].includes(
                                    contract.status
                                )}
                                className={styles.submitButton}
                                id="form-submit"
                                outline={showSubmissionApproval}
                            >
                                Unlock submission
                            </ModalOpenButton>
                        ) : undefined
                    }
                    statePrograms={statePrograms}
                    initiallySubmittedAt={contract.initiallySubmittedAt}
                    isStateUser={isStateUser}
                    explainMissingData={explainMissingData}
                />

                <ContractDetailsSummarySection
                    contract={contract}
                    isCMSUser={hasCMSPermissions}
                    isStateUser={isStateUser}
                    submissionName={name}
                    onDocumentError={handleDocumentDownloadError}
                    explainMissingData={explainMissingData}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection
                        contract={contract}
                        submissionName={name}
                        isCMSUser={hasCMSPermissions}
                        statePrograms={statePrograms}
                        onDocumentError={handleDocumentDownloadError}
                        explainMissingData={explainMissingData}
                    />
                )}

                <ContactsSummarySection
                    contract={contract}
                    isStateUser={isStateUser}
                    explainMissingData={explainMissingData}
                />

                <ChangeHistory contract={contract} />

                <UnlockSubmitModal
                    modalRef={modalRef}
                    modalType="UNLOCK_CONTRACT"
                    submissionData={contract}
                />
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
