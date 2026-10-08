import React, { useEffect, useState } from 'react'
import * as Yup from 'yup'
import { Form as UswdsForm, Fieldset, FormGroup } from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { useNavigate } from 'react-router-dom'
import styles from '../../StateSubmissionForm.module.scss'
import { UpdateContractDraftRevisionInput } from '../../../../gen/gqlClient'
import {
    activeFormPages,
    type ContractFormPageProps,
} from '../../submissionUtils'
import { RouteT } from '@mc-review/constants'
import {
    DynamicStepIndicator,
    FormNotificationContainer,
    FormContainer,
    SectionCard,
    FieldCheckbox,
    LinkWithLogging,
    PageActions,
    PoliteErrorMessage,
} from '../../../../components'
import { useCurrentRoute, useRouteParams } from '../../../../hooks'
import { useContractForm } from '../../../../hooks/useContractForm'
import { useAuth } from '../../../../contexts/AuthContext'
import {
    ErrorOrLoadingPage,
    PageBannerAlerts,
} from '../../SharedSubmissionComponents'
import { useFocusOnRender } from '../../../../hooks/useFocusOnRender'
import { usePage } from '../../../../contexts/PageContext'
import { getSubmissionPath } from '../../../../routeHelpers'

export interface AttestationsFormValues {
    procurementAttestation: boolean
}

type FormError =
    FormikErrors<AttestationsFormValues>[keyof FormikErrors<AttestationsFormValues>]

const procurementAttestationLabel = (
    <span>
        By checking this box, the state assures that its procurement of these
        contracts conformed with the HHS regulations and policies relevant to
        the state's contracting for the provision of Medicaid services as
        specified in the{' '}
        <LinkWithLogging
            aria-label="HHS Grants Policy Statement effective October 1, 2025 (opens in a new tab)"
            href="https://www.hhs.gov/sites/default/files/hhs-grants-policy-statement-oct-2025.pdf"
            variant="external"
            target="_blank"
        >
            HHS Grants Policy Statement effective October 1, 2025
        </LinkWithLogging>{' '}
        and applicable regulations are located at{' '}
        <LinkWithLogging
            aria-label="2 CFR Part 200 Subpart D - Procurement Standards (opens in a new tab)"
            href="https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-D/subject-group-ECFR45ddd4419ad436d/section-200.317"
            variant="external"
            target="_blank"
        >
            2 CFR Part 200 Subpart D - Procurement Standards
        </LinkWithLogging>
        .
    </span>
)

const attestationsSchema = Yup.object().shape({
    procurementAttestation: Yup.boolean().oneOf(
        [true],
        'You must check the box to confirm the state met the procurement requirements.'
    ),
})

const Attestations = ({
    showValidations = false,
}: ContractFormPageProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = useState(showValidations)
    const [draftSaved, setDraftSaved] = useState(false)
    useFocusOnRender(draftSaved, '[data-testid="saveAsDraftSuccessBanner"]')

    const { loggedInUser } = useAuth()
    const { currentRoute } = useCurrentRoute()
    const { id } = useRouteParams()
    const { updateActiveMainContent } = usePage()
    const { draftSubmission, interimState, updateDraft, showPageErrorMessage } =
        useContractForm(id)

    const navigate = useNavigate()

    const activeMainContentId = 'attestationsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const showFieldErrors = (error?: FormError): string | undefined =>
        shouldValidate && error ? String(error) : undefined

    if (interimState || !draftSubmission || !updateDraft)
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />

    const formData = draftSubmission.draftRevision.formData
    const contractSubmissionType = draftSubmission.contractSubmissionType

    const previousFormPage: RouteT =
        formData.submissionType === 'CONTRACT_ONLY'
            ? 'SUBMISSIONS_CONTRACT_DETAILS'
            : 'SUBMISSIONS_RATE_DETAILS'

    const attestationsInitialValues: AttestationsFormValues = {
        procurementAttestation: formData.procurementAttestation ?? false,
    }

    const handleFormSubmit = async (
        values: AttestationsFormValues,
        setSubmitting: (isSubmitting: boolean) => void,
        options: {
            type: 'SAVE_AS_DRAFT' | 'CONTINUE'
        }
    ) => {
        formData.procurementAttestation = values.procurementAttestation
        const updatedFormData = formData
        delete updatedFormData.__typename
        const updatedContractInput: UpdateContractDraftRevisionInput = {
            formData: updatedFormData,
            contractID: draftSubmission.id,
            lastSeenUpdatedAt: draftSubmission.draftRevision.updatedAt,
        }

        if (options.type === 'SAVE_AS_DRAFT' && draftSaved) {
            setDraftSaved(false)
        }

        const updatedSubmission = await updateDraft(updatedContractInput)
        if (updatedSubmission instanceof Error) {
            setSubmitting(false)
            const msg = `Error updating draft submission: ${updatedSubmission}`
            console.info(msg)
        } else if (options.type === 'SAVE_AS_DRAFT' && updatedSubmission) {
            setDraftSaved(true)
            setSubmitting(false)
        } else {
            navigate(
                getSubmissionPath(
                    'SUBMISSIONS_CONTACTS',
                    contractSubmissionType,
                    id
                )
            )
        }
    }

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    // The deprecated supporting docs page is always hidden, and the route only
                    // renders when the procurement attestation flag is on, so skip loading flags
                    formPages={activeFormPages(formData, true, true)}
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={draftSubmission.draftRevision.unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
                    draftSaved={draftSaved}
                />
            </FormNotificationContainer>
            <FormContainer id="Attestations">
                <Formik
                    initialValues={attestationsInitialValues}
                    onSubmit={(values, { setSubmitting }) => {
                        return handleFormSubmit(values, setSubmitting, {
                            type: 'CONTINUE',
                        })
                    }}
                    validationSchema={attestationsSchema}
                >
                    {({
                        values,
                        errors,
                        handleSubmit,
                        isSubmitting,
                        setSubmitting,
                    }) => (
                        <UswdsForm
                            className={styles.formContainer}
                            id="AttestationsForm"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <SectionCard>
                                <fieldset className="usa-fieldset">
                                    <legend className="srOnly">
                                        Attestations
                                    </legend>
                                    <FormGroup
                                        error={Boolean(
                                            showFieldErrors(
                                                errors.procurementAttestation
                                            )
                                        )}
                                        className="margin-top-0"
                                    >
                                        <Fieldset legend="Compliance with procurement requirements">
                                            <span
                                                className={
                                                    styles.requiredOptionalText
                                                }
                                            >
                                                Required
                                            </span>
                                            {showFieldErrors(
                                                errors.procurementAttestation
                                            ) && (
                                                <PoliteErrorMessage formFieldLabel="Compliance with procurement requirements">
                                                    {
                                                        errors.procurementAttestation
                                                    }
                                                </PoliteErrorMessage>
                                            )}
                                            <FieldCheckbox
                                                id="procurementAttestation"
                                                name="procurementAttestation"
                                                label={
                                                    procurementAttestationLabel
                                                }
                                                tealiumLabel="Procurement attestation"
                                                heading="Compliance with procurement requirements"
                                                parent_component_heading="Attestations"
                                                aria-required
                                            />
                                            <p className="usa-hint margin-bottom-0">
                                                Unsure? Contact your state's
                                                procurement staff to confirm
                                                your state met these
                                                requirements.
                                            </p>
                                        </Fieldset>
                                    </FormGroup>
                                </fieldset>
                            </SectionCard>
                            <PageActions
                                saveAsDraftOnClick={async () => {
                                    await handleFormSubmit(
                                        values,
                                        setSubmitting,
                                        {
                                            type: 'SAVE_AS_DRAFT',
                                        }
                                    )
                                }}
                                backOnClick={() => {
                                    navigate(
                                        getSubmissionPath(
                                            previousFormPage,
                                            contractSubmissionType,
                                            id
                                        )
                                    )
                                }}
                                continueOnClick={() => {
                                    setShouldValidate(true)
                                }}
                                disableContinue={
                                    shouldValidate &&
                                    !!Object.keys(errors).length
                                }
                                actionInProgress={isSubmitting}
                                backOnClickUrl={getSubmissionPath(
                                    previousFormPage,
                                    contractSubmissionType,
                                    id
                                )}
                                continueOnClickUrl={getSubmissionPath(
                                    'SUBMISSIONS_CONTACTS',
                                    contractSubmissionType,
                                    id
                                )}
                            />
                        </UswdsForm>
                    )}
                </Formik>
            </FormContainer>
        </div>
    )
}

export { Attestations }
