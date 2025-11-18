import React, { useEffect } from 'react'
import { FormContainer, PageActions } from '../../../../components'
import { Form } from '@trussworks/react-uswds'
import { generatePath, useNavigate } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { useRouteParams } from '../../../../hooks'
import styles from '../../StateSubmissionForm.module.scss'
import { usePage } from '../../../../contexts/PageContext'

/**
 * This is a placeholder, the existing Contacts.tsx could be used instead of another component.
 * Start with the existing page before trying to build out this one.
 *
 */
export const EQROContacts = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()

    const contractDetailsPath = generatePath(
        RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS,
        {
            id,
            contractSubmissionType,
        }
    )
    const reviewSubmitPath = generatePath(
        RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT,
        {
            id,
            contractSubmissionType,
        }
    )

    const activeMainContentId = 'contactsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    return (
        <div id={activeMainContentId}>
            <FormContainer id="Contacts">
                <Form
                    className={styles.formContainer}
                    id="ContactsForm"
                    onSubmit={() => console.info('submit placeholder')}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">State contacts</legend>
                        <div>Contacts placeholder</div>
                    </fieldset>
                    <PageActions
                        backOnClick={() => navigate(contractDetailsPath)}
                        continueOnClick={() => {
                            console.info(
                                'Continue on click placeholder function'
                            )
                            navigate(reviewSubmitPath)
                        }}
                        saveAsDraftOnClick={() =>
                            console.info('Save as draft function placeholder')
                        }
                        backOnClickUrl={contractDetailsPath}
                        continueOnClickUrl={reviewSubmitPath}
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
