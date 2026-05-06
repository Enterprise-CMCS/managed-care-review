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

const newSubmissionFormSchema = Yup.object().shape({
    submissionType: Yup.string().required('You must select a submission type'),
})

export interface NewSubmissionFormValueType {
    submissionType?: ContractSubmissionTypeParams
}

type FormError =
    FormikErrors<NewSubmissionFormValueType>[keyof FormikErrors<NewSubmissionFormValueType>]

const initialNewSubmissionValues: NewSubmissionFormValueType = {
    submissionType: undefined,
}

export const NewSubmission = () => {
    const { updateActiveMainContent } = usePage()
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const ldClient = useLDClient()
    const isSDPEnabled = ldClient?.variation(
        featureFlags.SDP.flag,
        featureFlags.SDP.defaultValue
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
            values.submissionType === ContractSubmissionTypeRecord['SDP']
        ) {
            window.location.href =
                'https://cmsapps5--mcrevval.sandbox.my.site.com/s/state-directed-preprint-submission'
        } else {
            navigate(
                generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
                    contractSubmissionType: values.submissionType,
                })
            )
        }
    }

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
                                error={showFieldErrors(errors.submissionType)}
                            >
                                <Fieldset
                                    role="radiogroup"
                                    aria-required
                                    className={styles.radioGroup}
                                    legend="Submission type"
                                >
                                    <span
                                        className={styles.requiredOptionalText}
                                    >
                                        Required
                                    </span>
                                    {showFieldErrors(errors.submissionType) && (
                                        <PoliteErrorMessage formFieldLabel="Submission type">
                                            {errors.submissionType as string}
                                        </PoliteErrorMessage>
                                    )}
                                    <FieldRadio
                                        id="healthPlan"
                                        name="submissionType"
                                        label="Health plan"
                                        aria-required
                                        data-testid="health-plan"
                                        value="health-plan"
                                        list_position={1}
                                        list_options={2}
                                        parent_component_heading="Submission type"
                                        radio_button_title="Health plan"
                                        labelDescription="Submit your Medicaid and CHIP managed care plans. This includes base contracts, amendments to base contracts, and rate certifications."
                                        tile
                                    />
                                    <FieldRadio
                                        id="eqro"
                                        name="submissionType"
                                        label="External Quality Review Organization (EQRO)"
                                        data-testid="eqro"
                                        aria-required
                                        value="eqro"
                                        list_position={2}
                                        list_options={2}
                                        parent_component_heading="Submission type"
                                        radio_button_title="External Quality Review Organization (EQRO)"
                                        labelDescription="Submit base contracts and amendments to base contracts between your state and an EQRO."
                                        tile
                                    />
                                    {isSDPEnabled && (
                                        <FieldRadio
                                            id="sdp"
                                            name="submissionType"
                                            label="State Directed Payment Preprint (SDP)"
                                            data-testid="sdp"
                                            aria-required
                                            value="sdp"
                                            list_position={3}
                                            list_options={2}
                                            parent_component_heading="Submission type"
                                            radio_button_title="State Directed Payment Preprint (SDP)"
                                            labelDescription="Submit preprints to get prior approval for state directed payments"
                                            tile
                                        />
                                    )}
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
                                link_url={
                                    values.submissionType
                                        ? generatePath(
                                              RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM,
                                              {
                                                  contractSubmissionType:
                                                      values.submissionType,
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

    return <Error404 />
}
