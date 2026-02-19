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

const newSubmissionFormSchema = Yup.object().shape({
    contractType: Yup.string().required('You must select a contract type'),
})

export interface NewSubmissionFormValueType {
    contractType?: ContractSubmissionTypeParams
}

type FormError =
    FormikErrors<NewSubmissionFormValueType>[keyof FormikErrors<NewSubmissionFormValueType>]

const initialNewSubmissionValues: NewSubmissionFormValueType = {
    contractType: undefined,
}

export const NewSubmission = () => {
    const { updateActiveMainContent } = usePage()
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = React.useState(false)

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent('newSubmissionForm')
    }, [updateActiveMainContent])

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const onSubmit = (values: NewSubmissionFormValueType) => {
        navigate(
            generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
                contractSubmissionType: values.contractType,
            })
        )
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
                        onSubmit={(e) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        <fieldset className="usa-fieldset">
                            <FormGroup
                                error={showFieldErrors(errors.contractType)}
                            >
                                <Fieldset
                                    role="radiogroup"
                                    aria-required
                                    className={styles.radioGroup}
                                    legend="Contract type"
                                >
                                    <span
                                        className={styles.requiredOptionalText}
                                    >
                                        Required
                                    </span>
                                    {showFieldErrors(errors.contractType) && (
                                        <PoliteErrorMessage formFieldLabel="Contract type">
                                            {errors.contractType as string}
                                        </PoliteErrorMessage>
                                    )}
                                    <FieldRadio
                                        id="healthPlan"
                                        name="contractType"
                                        label="Health plan"
                                        aria-required
                                        data-testid="health-plan"
                                        value="health-plan"
                                        list_position={1}
                                        list_options={2}
                                        parent_component_heading="Contract type"
                                        radio_button_title="Health plan"
                                        labelDescription="Submit your Medicaid and CHIP managed care plans. This includes base contracts, amendments to base contracts, and rate certifications."
                                        tile
                                    />
                                    <FieldRadio
                                        id="eqro"
                                        name="contractType"
                                        label="External Quality Review Organization (EQRO)"
                                        data-testid="eqro"
                                        aria-required
                                        value="eqro"
                                        list_position={2}
                                        list_options={2}
                                        parent_component_heading="Contract type"
                                        radio_button_title="External Quality Review Organization (EQRO)"
                                        labelDescription="Submit base contracts and amendments to base contracts between your state and an EQRO."
                                        tile
                                    />
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
                                    values.contractType
                                        ? generatePath(
                                              RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM,
                                              {
                                                  contractSubmissionType:
                                                      values.contractType,
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
