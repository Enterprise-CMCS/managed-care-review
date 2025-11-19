import React, { FormEvent, useEffect } from 'react'
import { FormContainer, PageActions, DynamicStepIndicator, FormNotificationContainer } from '../../../../components'
import { Form } from '@trussworks/react-uswds'
import { RoutesRecord, EQRO_SUBMISSION_FORM_ROUTES } from '@mc-review/constants'
import { generatePath, useNavigate, matchPath } from 'react-router-dom'
import { useRouteParams, useStatePrograms, useCurrentRoute } from '../../../../hooks'
import styles from '../../StateSubmissionForm.module.scss'
import { usePage } from '../../../../contexts/PageContext'
import { useContractForm } from '../../../../hooks/useContractForm'
import { CreateContractInput } from '../../../../gen/gqlClient'

export const EQROSubmissionDetails = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()
    const allPrograms = useStatePrograms()
    const { currentRoute } = useCurrentRoute()

    const isNewSubmission = matchPath(
        RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM,
        location.pathname
    )

    const { createDraft } = useContractForm(id)

    const activeMainContentId = 'submissionDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    /**
     * Most of this code here is placeholder code so we can progress to the next form page.
     * It will create a new draft EQRO submission, but no updates or validations.
     */
    const onSubmit = async (e: FormEvent) => {
        e.preventDefault()
        console.info('submit placeholder')

        if (isNewSubmission) {
            const input: CreateContractInput = {
                populationCovered: 'MEDICAID',
                programIDs: [allPrograms[0].id],
                submissionType: 'CONTRACT_ONLY',
                submissionDescription:
                    'Placeholder EQRO submission description',
                contractType: 'BASE',
                contractSubmissionType: 'EQRO',
            }

            const draftSubmission = await createDraft(input)

            if (draftSubmission instanceof Error) {
                console.info(
                    'Log: creating new submission failed with server error',
                    draftSubmission
                )
                return
            }

            navigate(
                generatePath(RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS, {
                    id: draftSubmission.id,
                    contractSubmissionType,
                })
            )
        } else {
            navigate(
                generatePath(RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS, {
                    id: id,
                    contractSubmissionType,
                })
            )
        }
    }

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={
                        currentRoute === 'SUBMISSIONS_NEW_SUBMISSION_FORM'
                            ? 'SUBMISSIONS_TYPE'  // ← Map new submission route to first step
                            : currentRoute
                    }
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
            </FormNotificationContainer>
            <FormContainer id="SubmissionDetails">
                <Form
                    className={styles.formContainer}
                    onSubmit={(event) => onSubmit(event)}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">Submission details</legend>
                        <div>Submission details placeholder</div>
                    </fieldset>
                    <PageActions
                        pageVariant={'FIRST'}
                        backOnClick={() =>
                            navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                        }
                        continueOnClick={() => {
                            console.info(
                                'Continue on click placeholder function'
                            )
                        }}
                        saveAsDraftOnClick={() =>
                            console.info('Save as draft function placeholder')
                        }
                        backOnClickUrl={RoutesRecord.DASHBOARD_SUBMISSIONS}
                        continueOnClickUrl={
                            RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS
                        }
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
