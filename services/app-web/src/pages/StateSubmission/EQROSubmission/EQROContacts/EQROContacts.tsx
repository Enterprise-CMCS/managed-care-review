import React from 'react'
import { FormContainer } from '../../../../components'
import { Form } from '@trussworks/react-uswds'
import { PageActions } from '../../PageActions'
import { generatePath, useNavigate } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { useRouteParams } from '../../../../hooks'
import styles from '../../StateSubmissionForm.module.scss'

/**
 * This is a placeholder, the existing Contacts.tsx could be used instead of another component.
 * Start with the existing page before trying to build out this one.
 *
 */
export const EQROContacts = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    const navigate = useNavigate()

    return (
        <div>
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
                        backOnClick={() =>
                            navigate(
                                generatePath(
                                    RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS,
                                    {
                                        id,
                                        contractSubmissionType,
                                    }
                                )
                            )
                        }
                        continueOnClick={() => {
                            console.info(
                                'Continue on click placeholder function'
                            )
                            navigate(
                                generatePath(
                                    RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT,
                                    {
                                        id,
                                        contractSubmissionType,
                                    }
                                )
                            )
                        }}
                        saveAsDraftOnClick={() =>
                            console.info('Save as draft function placeholder')
                        }
                        backOnClickUrl={generatePath(
                            RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS,
                            {
                                id,
                                contractSubmissionType,
                            }
                        )}
                        continueOnClickUrl={generatePath(
                            RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT,
                            {
                                id,
                                contractSubmissionType,
                            }
                        )}
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
