import React, { useEffect } from 'react'
import {
    ContractSubmissionTypeParams,
    ContractSubmissionTypeRecord,
    RoutesRecord,
} from '@mc-review/constants'
import { generatePath, useNavigate } from 'react-router-dom'
import { usePage } from '../../../../contexts/PageContext'
import {
    useMemoizedNewSubmissionHeader,
    useRouteParams,
} from '../../../../hooks'
import * as Yup from 'yup'
import { Formik, FormikErrors } from 'formik'
import { Form, FormGroup, Fieldset } from '@trussworks/react-uswds'
import {
    ActionButton,
    Breadcrumbs,
    FieldRadio,
    PageActionsContainer,
    PoliteErrorMessage,
} from '../../../../components'
import { NewStateSubmissionForm } from '../../HealthPlanSubmission/New'
import { EQROSubmissionDetails } from '../../EQROSubmission'
import { Error404 } from '../../../Errors/Error404Page'
import styles from './NewSubmissionForm.module.scss'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { EBSubmissionDetails } from '../../EnrollmentBrokerSubmission'

const newSubmissionFormSchema = Yup.object().shape({
    contractSubmissionType: Yup.string().required(
        'You must select a submission type'
    ),
})

export interface NewSubmissionFormValueType {
    contractSubmissionType?: ContractSubmissionTypeParams
}

type FormError =
    FormikErrors<NewSubmissionFormValueType>[keyof FormikErrors<NewSubmissionFormValueType>]

const initialNewSubmissionValues: NewSubmissionFormValueType = {
    contractSubmissionType: undefined,
}

type SubmissionTypeOption = {
    id: string
    value: ContractSubmissionTypeParams
    label: string
    description: string
    enabled: boolean
}

export const NewSubmission = () => {
    const { updateActiveMainContent } = usePage()
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const ldClient = useLDClient()
    const isEQROenabled = ldClient?.variation(
        featureFlags.EQRO_SUBMISSIONS.flag,
        featureFlags.EQRO_SUBMISSIONS.defaultValue
    )
    const isSDPEnabled = ldClient?.variation(
        featureFlags.SDP.flag,
        featureFlags.SDP.defaultValue
    )
    const isEBEnabled = ldClient?.variation(
        featureFlags.ENROLLMENT_BROKER_SUBMISSIONS.flag,
        featureFlags.ENROLLMENT_BROKER_SUBMISSIONS.defaultValue
    )

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent('newSubmissionForm')
    }, [updateActiveMainContent])

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const onSubmit = (values: NewSubmissionFormValueType) => {
        if (
            isSDPEnabled &&
            values.contractSubmissionType ===
                ContractSubmissionTypeRecord['SDP']
        ) {
            //TODO: add new env urls to prod once available
            window.location.href = import.meta.env.VITE_APP_SDP_PORTAL_URL
        } else {
            navigate(
                generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
                    contractSubmissionType: values.contractSubmissionType,
                })
            )
        }
    }

    const submissionTypeOptions: SubmissionTypeOption[] = [
        {
            id: 'healthPlan',
            value: ContractSubmissionTypeRecord.HEALTH_PLAN,
            label: 'Health plan',
            description:
                'Submit your Medicaid and CHIP managed care plans. This includes base contracts, amendments to base contracts, and rate certifications.',
            enabled: true,
        },
        {
            id: 'eqro',
            value: ContractSubmissionTypeRecord.EQRO,
            label: 'External Quality Review Organization (EQRO)',
            description:
                'Submit base contracts and amendments to base contracts between your state and an EQRO.',
            enabled: !!isEQROenabled,
        },
        {
            id: 'eb',
            value: ContractSubmissionTypeRecord.ENROLLMENT_BROKER,
            label: 'Enrollment Broker (EB)',
            description:
                'Submit base contracts and amendments to base contracts between your state and an EB.',
            enabled: !!isEBEnabled,
        },
        {
            id: 'sdp',
            value: ContractSubmissionTypeRecord.SDP,
            label: 'State Directed Payment Preprint (SDP)',
            description:
                'Submit preprints to get prior approval for state directed payments',
            enabled: !!isSDPEnabled,
        },
    ].filter((option) => option.enabled)


    return (
        <div className={styles.contractTypeFormContainer}>
            <Breadcrumbs
                className="usa-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    {
                        text: 'New submission',
                        link: RoutesRecord.SUBMISSIONS_NEW,
                    },
                ]}
            />
            <h1>New submission</h1>
            <Formik
                initialValues={initialNewSubmissionValues}
                onSubmit={(values) => onSubmit(values)}
                validationSchema={newSubmissionFormSchema}
            >
                {({ errors, values, handleSubmit }) => (
                    <Form
                        id="newSubmissionForm"
                        className={styles.formContainer}
                        aria-label="New Submission Form"
                        data-testid="new-submission-form"
                        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        <fieldset className="usa-fieldset">
                            <FormGroup
                                error={showFieldErrors(
                                    errors.contractSubmissionType
                                )}
                            >
                                <Fieldset
                                    role="radiogroup"
                                    className={styles.radioGroup}
                                    legend="Submission type"
                                >
                                    <span
                                        className={styles.requiredOptionalText}
                                    >
                                        Required
                                    </span>
                                    {showFieldErrors(
                                        errors.contractSubmissionType
                                    ) && (
                                        <PoliteErrorMessage formFieldLabel="Submission type">
                                            {
                                                errors.contractSubmissionType as string
                                            }
                                        </PoliteErrorMessage>
                                    )}
                                    {submissionTypeOptions.map((option, index) => (
                                        <FieldRadio
                                            key={option.id}
                                            id={option.id}
                                            name="contractSubmissionType"
                                            label={option.label}
                                            data-testid={option.value}
                                            aria-required
                                            value={option.value}
                                            list_position={index + 1}
                                            list_options={submissionTypeOptions.length}
                                            parent_component_heading="Submission type"
                                            radio_button_title={option.label}
                                            labelDescription={option.description}
                                            tile
                                        />
                                    ))}
                                </Fieldset>
                            </FormGroup>
                        </fieldset>
                        <PageActionsContainer>
                            <ActionButton
                                type="button"
                                variant="outline"
                                link_url={RoutesRecord.DASHBOARD_SUBMISSIONS}
                                parent_component_type="page body"
                                onClick={() =>
                                    navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                                }
                            >
                                Cancel
                            </ActionButton>
                            <ActionButton
                                type="submit"
                                disabled={
                                    shouldValidate &&
                                    !!Object.keys(errors).length
                                }
                                link_url={
                                    values.contractSubmissionType
                                        ? generatePath(
                                              RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM,
                                              {
                                                  contractSubmissionType:
                                                      values.contractSubmissionType,
                                              }
                                          )
                                        : RoutesRecord.SUBMISSIONS_NEW
                                }
                                parent_component_type="page body"
                            >
                                Start
                            </ActionButton>
                        </PageActionsContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

// Routing to the correct new submission form component based on contract submission type
export const NewSubmissionForm = (): React.ReactElement => {
    const { contractSubmissionType } = useRouteParams()
    const { updateHeading } = usePage()

    const heading = useMemoizedNewSubmissionHeader({
        contractType: contractSubmissionType,
    })

    useEffect(() => {
        updateHeading({ customHeading: heading })
    }, [heading, updateHeading])

    if (
        contractSubmissionType === ContractSubmissionTypeRecord['HEALTH_PLAN']
    ) {
        return <NewStateSubmissionForm />
    }

    if (contractSubmissionType === ContractSubmissionTypeRecord['EQRO']) {
        return <EQROSubmissionDetails />
    }

    if (contractSubmissionType === ContractSubmissionTypeRecord['ENROLLMENT_BROKER']) {
        return <EBSubmissionDetails />
    }

    return <Error404 />
}
