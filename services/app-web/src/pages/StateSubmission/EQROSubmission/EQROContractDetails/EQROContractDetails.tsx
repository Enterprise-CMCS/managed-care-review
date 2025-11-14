import React from 'react'
import { FormContainer } from '../../../../components'
import { Form } from '@trussworks/react-uswds'
import { PageActions } from '../../PageActions'
import { useRouteParams } from '../../../../hooks'
import { generatePath, useNavigate } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import styles from '../../StateSubmissionForm.module.scss'

export const EQROContractDetails = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    const navigate = useNavigate()
    const contactsPagePath = generatePath(RoutesRecord.SUBMISSIONS_CONTACTS, {
        id,
        contractSubmissionType,
    })
    const submissionDetailsPath = generatePath(RoutesRecord.SUBMISSIONS_TYPE, {
        id,
        contractSubmissionType,
    })

    return (
        <div>
            <FormContainer id="ContractDetails">
                <Form
                    className={styles.formContainer}
                    onSubmit={() => console.info('submit placeholder')}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">Contract details</legend>
                        <div>Contract details placeholder</div>
                    </fieldset>
                    <PageActions
                        backOnClick={() => navigate(submissionDetailsPath)}
                        continueOnClick={() => navigate(contactsPagePath)}
                        saveAsDraftOnClick={() =>
                            console.info('Save as draft function placeholder')
                        }
                        backOnClickUrl={submissionDetailsPath}
                        continueOnClickUrl={contactsPagePath}
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
