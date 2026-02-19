import React, { useEffect } from 'react'
import {
    ButtonGroup,
    FormGroup,
    GridContainer,
    Label,
    Grid,
} from '@trussworks/react-uswds'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Form as UswdsForm } from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import {
    ActionButton,
    Breadcrumbs,
    DataDetail,
    ErrorAlert,
    GenericApiErrorBanner,
    Loading,
    PoliteErrorMessage,
    PageActionsContainer,
    FormContainer,
} from '../../../components'
import {
    StateAssignment,
    useFetchMcReviewSettingsQuery,
    useIndexUsersQuery,
    useUpdateStateAssignmentsByStateMutation,
} from '../../../gen/gqlClient'
import { RoutesRecord } from '@mc-review/constants'
import { isValidStateCode } from '@mc-review/submissions'
import { Error404 } from '../../Errors/Error404Page'
import { FieldSelect } from '../../../components/Select'
import {
    wrapApolloResult,
    updateStateAssignmentsWrapper,
} from '@mc-review/helpers'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { FilterOptionType } from '../../../components/FilterAccordion'
import styles from './EditStateAssign.module.scss'
import * as Yup from 'yup'
import { recordJSException } from '@mc-review/otel'
import { MCReviewSettingsContextType } from '../Settings'
import { usePage } from '../../../contexts/PageContext'

const EditStateAssignmentSchema = Yup.object().shape({
    dmcoAssignmentsByID: Yup.array().min(
        1,
        'You must select at least one staff member.'
    ),
})

export interface EditStateAssignFormValuesType {
    dmcoAssignmentsByID: FilterOptionType[]
}

type FormError =
    FormikErrors<EditStateAssignFormValuesType>[keyof FormikErrors<EditStateAssignFormValuesType>]

export const EditStateAssign = (): React.ReactElement => {
    const { stateCode } = useParams()
    if (!stateCode) {
        throw new Error('PROGRAMMING ERROR: proper url params not set')
    }
    // Page level state
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const settingsContext = useOutletContext<MCReviewSettingsContextType>()
    const setLastUpdated = settingsContext?.stateAnalysts.setLastUpdated
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent('EditStateAssignForm')
    }, [updateActiveMainContent])

    const {
        loading: loadingMcReviewSettings,
        data: mcrSettingsData,
        error: mcReviewError,
    } = useFetchMcReviewSettingsQuery()

    const { result: indexUsersResult } = wrapApolloResult(
        useIndexUsersQuery({
            fetchPolicy: 'cache-and-network',
        })
    )

    const [
        updateAssignmentsMutation,
        { loading: editLoading, error: editError },
    ] = useUpdateStateAssignmentsByStateMutation()

    if (!isValidStateCode(stateCode.toUpperCase())) {
        return <Error404 />
    }

    const stateName =
        settingsContext?.stateAnalysts.data.find(
            (data) => data.stateCode == stateCode
        )?.stateName || stateCode.toUpperCase()
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const onSubmit = async (values: EditStateAssignFormValuesType) => {
        // for submit form data
        const assignedUserIDs = values.dmcoAssignmentsByID.map((v) => v.value)

        // for display
        const assignedUsers = values.dmcoAssignmentsByID.map(
            (assignment) => assignment.label
        )
        const removedUsers = formInitialValues.dmcoAssignmentsByID
            .map((assignment) => assignment.label)
            .filter((name) => !assignedUsers.includes(name))
        setLastUpdated((_prevState) => {
            return {
                state: stateName,
                removed: removedUsers,
                added: assignedUsers,
            }
        })
        const result = await updateStateAssignmentsWrapper(
            updateAssignmentsMutation,
            stateCode,
            assignedUserIDs
        )
        if (result instanceof Error) {
            recordJSException(result)
            // editError will ensure banner is displayed, no need to handle here.
        } else {
            navigate(
                `${RoutesRecord.STATE_ASSIGNMENTS}/?submit=state-assignments`
            )
        }
    }

    if (indexUsersResult.status === 'LOADING' || loadingMcReviewSettings)
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )

    if (indexUsersResult.status === 'ERROR' || mcReviewError) {
        let error
        if (indexUsersResult.status === 'ERROR') {
            error = indexUsersResult.error
        }
        if (mcReviewError) {
            error = mcReviewError
        }
        return <SettingsErrorAlert error={error} />
    }

    const indexUsers = indexUsersResult.data.indexUsers.edges
    const dropdownOptions: FilterOptionType[] = []
    const allAssignments: StateAssignment[] =
        mcrSettingsData?.fetchMcReviewSettings.stateAssignments ?? []
    const stateAssignments = allAssignments.find(
        (state) => state.stateCode === stateCode.toUpperCase()
    )
    const assignedUsers = stateAssignments?.assignedCMSUsers ?? []

    // Form setup
    const formInitialValues: EditStateAssignFormValuesType = {
        dmcoAssignmentsByID: assignedUsers.map((user) => ({
            label: `${user.givenName} ${user.familyName}`,
            value: user.id,
        })),
    }

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
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => onSubmit(values)}
                validationSchema={EditStateAssignmentSchema}
            >
                {({ errors, values, handleSubmit }) => (
                    <Grid className={styles.maxWidthContainer}>
                        {editError && <GenericApiErrorBanner />}
                        {showFieldErrors(errors.dmcoAssignmentsByID) && (
                            <ErrorAlert
                                heading="Assign a DMCO analyst"
                                message="You must select at least one staff member in the ‘Update DMCO staff’ field to save these changes."
                            />
                        )}
                        <UswdsForm
                            id="EditStateAssignForm"
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                return handleSubmit(e)
                            }}
                        >
                            <div id="formInnerContainer">
                                <fieldset>
                                    <h2>Edit state assignment</h2>
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
                                        {formInitialValues.dmcoAssignmentsByID
                                            .length > 0 ? (
                                            <ul>
                                                {formInitialValues.dmcoAssignmentsByID.map(
                                                    (assignedUser) => (
                                                        <li
                                                            key={
                                                                assignedUser.value
                                                            }
                                                        >
                                                            {assignedUser.label}
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        ) : (
                                            'None'
                                        )}
                                    </DataDetail>

                                    <FormGroup
                                        error={showFieldErrors(
                                            errors.dmcoAssignmentsByID
                                        )}
                                    >
                                        <Label htmlFor={'dmcoAssignmentsByID'}>
                                            Update DMCO staff
                                        </Label>
                                        <span className="usa-hint">
                                            Required
                                        </span>
                                        {showFieldErrors(
                                            errors.dmcoAssignmentsByID
                                        ) && (
                                            <PoliteErrorMessage formFieldLabel="Update DMCO staff">
                                                {
                                                    errors.dmcoAssignmentsByID as string
                                                }
                                            </PoliteErrorMessage>
                                        )}
                                        <FieldSelect
                                            label="Update DMCO staff"
                                            name="dmcoAssignmentsByID"
                                            optionDescriptionSingular="user"
                                            dropdownOptions={dropdownOptions}
                                            isMulti
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
                                        link_url={
                                            RoutesRecord.STATE_ASSIGNMENTS
                                        }
                                        onClick={() =>
                                            navigate(
                                                RoutesRecord.STATE_ASSIGNMENTS
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
                                        loading={editLoading}
                                    >
                                        Save changes
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
