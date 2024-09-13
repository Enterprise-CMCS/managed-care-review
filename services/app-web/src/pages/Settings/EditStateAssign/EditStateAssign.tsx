import React from 'react'
import {
    ButtonGroup,
    FormGroup,
    GridContainer,
    Label,
} from '@trussworks/react-uswds'
import { useNavigate, useParams } from 'react-router-dom'
import { Form as UswdsForm } from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import {
    ActionButton,
    Breadcrumbs,
    DataDetail,
    GenericApiErrorBanner,
    Loading,
} from '../../../components'
import { PageActionsContainer } from '../../StateSubmission/PageActions'
import { FormContainer } from '../../../components/FormContainer/FormContainer'
import {
    useIndexUsersQuery,
    useUpdateStateAssignmentMutation,
} from '../../../gen/gqlClient'
import { RoutesRecord } from '../../../constants'
import { isValidStateCode } from '../../../common-code/healthPlanFormDataType'
import { Error404 } from '../../Errors/Error404Page'
import { FieldSelect } from '../../../components/Select'
import { wrapApolloResult } from '../../../gqlHelpers/apolloQueryWrapper'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { FilterOptionType } from '../../../components/FilterAccordion'

export interface EditStateAssignFormValues {
    dmcoAssignmentsByID: string[]
}

type FormError =
    FormikErrors<EditStateAssignFormValues>[keyof FormikErrors<EditStateAssignFormValues>]

export const EditStateAssign = (): React.ReactElement => {
    const { stateCode } = useParams()
    if (!stateCode) {
        throw new Error('PROGRAMMING ERROR: proper url params not set')
    }
    // Page level state
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const navigate = useNavigate()

    const { result: indexUsersResult } = wrapApolloResult(
        useIndexUsersQuery({
            fetchPolicy: 'cache-and-network',
        })
    )

    const [_editStateAssignment, { loading: editLoading, error: editError }] =
        useUpdateStateAssignmentMutation()

    if (!isValidStateCode(stateCode.toUpperCase())) {
        return <Error404 />
    }

    // Form setup
    const formInitialValues: EditStateAssignFormValues = {
        dmcoAssignmentsByID: [],
    }
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)
    const onSubmit = (values: EditStateAssignFormValues) => {
        console.info('submitted - to be implemented')
    }

    if (indexUsersResult.status === 'LOADING')
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )

    if (indexUsersResult.status === 'ERROR')
        return <SettingsErrorAlert error={indexUsersResult.error} />

    const indexUsers = indexUsersResult.data.indexUsers.edges
    const dropdownOptions: FilterOptionType[] = []

    indexUsers.forEach((user) => {
        if (
            (user.node.__typename === 'CMSApproverUser' ||
                user.node.__typename === 'CMSUser') &&
            user.node.divisionAssignment === 'DMCO'
        ) {
            dropdownOptions.push({
                label: `${user.node.givenName} ${user.node.familyName}`,
                value: user.node.id,
            })
        }
    })

    return (
        <FormContainer id="EditStateAssign" className="standaloneForm">
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
                        link: RoutesRecord.STATE_ASSIGNMENTS,
                        text: 'State assignments',
                    },
                    {
                        link: RoutesRecord.EDIT_STATE_ASSIGNMENTS,
                        text: 'Edit',
                    },
                ]}
            />
            {editError && <GenericApiErrorBanner />}
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => onSubmit(values)}
            >
                {({ errors, values, handleSubmit }) => (
                    <UswdsForm
                        id="EditStateAssignForm"
                        aria-label={'Edit state assignment'}
                        aria-describedby="form-guidance"
                        onSubmit={(e) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        <div id="formInnerContainer">
                            <h2>Edit state assignment</h2>
                            <fieldset>
                                <legend className="srOnly">
                                    Update DMCO staff
                                </legend>
                                <DataDetail id="state-code" label="State">
                                    {stateCode}
                                </DataDetail>

                                <DataDetail
                                    id="current-dmco-assignments"
                                    label="DMCO staff assigned"
                                >
                                    None
                                </DataDetail>

                                <FormGroup
                                    error={showFieldErrors(
                                        errors.dmcoAssignmentsByID
                                    )}
                                >
                                    <Label htmlFor={'dmcoAssignmentsByID'}>
                                        Update DMCO staff
                                    </Label>
                                    <span>Required</span>
                                    <FieldSelect
                                        label="Update DMCO staff"
                                        name="dmcoAssignmentsByID"
                                        optionDescriptionSingular="user"
                                        dropdownOptions={dropdownOptions}
                                        initialValues={
                                            values.dmcoAssignmentsByID
                                        }
                                    />
                                </FormGroup>
                            </fieldset>
                        </div>

                        <PageActionsContainer>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    data-testid="page-actions-left-secondary"
                                    parent_component_type="page body"
                                    link_url={RoutesRecord.STATE_ASSIGNMENTS}
                                    onClick={() =>
                                        navigate(RoutesRecord.STATE_ASSIGNMENTS)
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
                                    loading={editLoading}
                                >
                                    Save changes
                                </ActionButton>
                            </ButtonGroup>
                        </PageActionsContainer>
                    </UswdsForm>
                )}
            </Formik>
        </FormContainer>
    )
}
