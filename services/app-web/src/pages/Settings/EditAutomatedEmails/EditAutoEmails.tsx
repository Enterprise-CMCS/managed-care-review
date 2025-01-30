import React from 'react'
import {
    ActionButton,
    Breadcrumbs,
    DataDetail,
    FieldTextInput,
    FormContainer,
} from '../../../components'
import { RoutesRecord } from '@mc-review/constants'
import { Formik } from 'formik'
import { ButtonGroup, Fieldset, FormGroup, Grid } from '@trussworks/react-uswds'
import { Form as UswdsForm } from '@trussworks/react-uswds'
import styles from '../EditStateAssign/EditStateAssign.module.scss'
import { PageActionsContainer } from '../../StateSubmission/PageActions'
import { useNavigate } from 'react-router-dom'

export const EditAutoEmails = (): React.ReactElement => {
    const navigate = useNavigate()

    return (
        <FormContainer id="EditAutoEmails" className="standaloneForm">
            <Breadcrumbs
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    {
                        link: RoutesRecord.MCR_SETTINGS,
                        text: 'MC-Review settings',
                    },
                    {
                        link: RoutesRecord.AUTOMATED_EMAILS,
                        text: 'Automated Emails',
                    },
                    {
                        link: RoutesRecord.EDIT_AUTOMATED_EMAILS,
                        text: 'Edit',
                    },
                ]}
            />
            <Formik
                initialValues={{}}
                onSubmit={() => window.alert()}
                validationSchema={{}}
            >
                {() => (
                    <Grid className={styles.maxWidthContainer}>
                        <UswdsForm
                            id="EditAutoEmailForm"
                            aria-label={'Edit Auto Email'}
                            aria-describedby="form-guidance"
                            onSubmit={() => window.alert()}
                        >
                            <div id="formInnerContainer">
                                <h2> Edit Automated Email</h2>
                                <Fieldset>
                                    <DataDetail id="name" label="Name">
                                        Name placeholder
                                    </DataDetail>
                                    <DataDetail id="email" label="Email">
                                        placeholder@example.com
                                    </DataDetail>
                                    <FormGroup>
                                        {/* <Label htmlFor={'updateAutomatedEmail'}>
                      Update Automated Email
                    </Label>
                    <span> Required </span> */}
                                        <FieldTextInput
                                            name="updateAutomatedEmail"
                                            id="updateAutomatedEmail"
                                            label="Update Automated Email"
                                            type="email"
                                            aria-required
                                            data-testid="updateAutomatedEmail"
                                            showError={false}
                                            hint={<span>Required</span>}
                                        />
                                    </FormGroup>
                                </Fieldset>
                            </div>

                            <PageActionsContainer>
                                <ButtonGroup type="default">
                                    <ActionButton
                                        type="button"
                                        variant="outline"
                                        data-testid="page-actions-left-secondary"
                                        parent_component_type="page body"
                                        link_url={RoutesRecord.AUTOMATED_EMAILS}
                                        onClick={() =>
                                            navigate(
                                                RoutesRecord.AUTOMATED_EMAILS
                                            )
                                        }
                                    >
                                        Cancel
                                    </ActionButton>

                                    <ActionButton
                                        type="submit"
                                        variant="success"
                                        data-testid="page-actions-right-primary"
                                        parent_component_type="page body"
                                        animationTimeout={1000}
                                        // loading={}
                                    >
                                        Save Changes
                                    </ActionButton>
                                </ButtonGroup>
                            </PageActionsContainer>
                        </UswdsForm>
                    </Grid>
                )}
            </Formik>
        </FormContainer>
    )
}
