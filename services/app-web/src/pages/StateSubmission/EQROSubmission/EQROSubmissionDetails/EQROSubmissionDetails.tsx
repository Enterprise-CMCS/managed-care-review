import React from 'react'
import { FormContainer } from '../../../../components'
import { Form } from '@trussworks/react-uswds'
import { PageActions } from '../../PageActions'
import { RoutesRecord } from '@mc-review/constants'
import { generatePath, useNavigate } from 'react-router-dom'
import { useRouteParams } from '../../../../hooks'
import styles from '../../StateSubmissionForm.module.scss'

export const EQROSubmissionDetails = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    const navigate = useNavigate()
    const contractDetailsPath = generatePath(
        RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS,
        {
            id,
            contractSubmissionType,
        }
    )

    return (
        <div>
            <FormContainer id="SubmissionDetails">
                <Form
                    className={styles.formContainer}
                    onSubmit={() => console.info('submit placeholder')}
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
                            navigate(contractDetailsPath)
                        }}
                        saveAsDraftOnClick={() =>
                            console.info('Save as draft function placeholder')
                        }
                        backOnClickUrl={RoutesRecord.DASHBOARD_SUBMISSIONS}
                        continueOnClickUrl={contractDetailsPath}
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
