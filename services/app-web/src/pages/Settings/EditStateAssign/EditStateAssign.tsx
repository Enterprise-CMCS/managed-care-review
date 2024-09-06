import React from 'react'
import {
    ButtonGroup,
    FormGroup,
    Label,
} from '@trussworks/react-uswds'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './EditStateAssign.module.scss'
import { useAuth } from '../../../contexts/AuthContext'
import { Form as UswdsForm } from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import {
    ActionButton,
    DataDetail,
    GenericApiErrorBanner,
} from '../../../components'
import { PageActionsContainer } from '../../StateSubmission/PageActions'
import { FormContainer } from '../../../components/FormContainer/FormContainer'
import { User, useUpdateStateAssignmentMutation } from '../../../gen/gqlClient'
import { RoutesRecord } from '../../../constants'
import { FieldSelect } from '../../../components/Select'
import { isValidStateCode } from '../../../common-code/healthPlanFormDataType'
import { Error404 } from '../../Errors/Error404Page'

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

    const [_editStateAssignment, { loading: editLoading, error: editError }] =
        useUpdateStateAssignmentMutation()

    if(!isValidStateCode(stateCode)){
        return <Error404/>
    }

    // Form setup
    const formInitialValues: EditStateAssignFormValues = {
        dmcoAssignmentsByID: [],
    }
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)
    const onSubmit = (values: EditStateAssignFormValues) => {
        console.info('submitted - to be implemeneted')
    }
    return (
        <FormContainer id="EditStateAssign" className={styles.EditStateAssignPage}>
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
                            <div className={styles.formInnerContainer}>
                            <h2>Edit state assignment</h2>

                            <DataDetail id="state-code" label="State">
                                {stateCode}
                            </DataDetail>

                            <DataDetail id="current-dmco-assignments" label="DMCO staff assigned">
                                {stateCode}
                            </DataDetail>


                            <fieldset>
                                <legend className="srOnly">
                                    Update DMCO staff
                                </legend>
                                <FormGroup
                                    error={showFieldErrors(
                                        errors.dmcoAssignmentsByID
                                    )}
                                >
                                    <Label htmlFor={'dmcoAssignments'}>
                                    Update DMCO staff
                                    </Label>
                                    <span
                                        className={styles.requiredOptionalText}
                                    >
                                        Required
                                    </span>
                                    <FieldSelect
                                        name="dmcoAssignments"
                                        optionDescriptionSingular="user"
                                        dropdownOptions={[]}
                                        initialValues={values.dmcoAssignmentsByID}

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
                                        link_url={RoutesRecord.MCR_SETTINGS} // update this with MCR-4261 values
                                        onClick={() =>
                                            navigate(RoutesRecord.MCR_SETTINGS)// update this with MCR-4261 values
                                        }
                                    >
                                        Cancel
                                    </ActionButton>

                                    <ActionButton
                                        type="submit"
                                        variant="default"
                                        data-testid="page-actions-right-primary"
                                        parent_component_type="page body"
                                        link_url={RoutesRecord.MCR_SETTINGS} // update this with MCR-4261 values
                                        animationTimeout={1000}
                                        loading={editLoading}
                                    >
                                        Save
                                    </ActionButton>
                                </ButtonGroup>
                            </PageActionsContainer>
                            </UswdsForm>
                    )}

                </Formik>
         </FormContainer>
    )
}