import React, { FormEvent } from 'react'
import { GridContainer, Form as UswdsForm } from '@trussworks/react-uswds'
import styles from '../../StateSubmission/StateSubmissionForm.module.scss'
import { useParams } from 'react-router-dom'

export const UploadQuestions = () => {
    const { division } = useParams<{ division: string }>()

    //Placeholder submit function
    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        console.info(e)
    }

    return (
        <GridContainer>
            <UswdsForm
                className={styles.formContainer}
                id="AddQuestionsForm"
                aria-label="Add Questions Form"
                aria-describedby="form-guidance"
                onSubmit={(e) => handleSubmit(e)}
            >
                <fieldset className="usa-fieldset">
                    <h2>Add questions</h2>
                    <p>{`Questions from ${division?.toUpperCase()}`}</p>
                </fieldset>
            </UswdsForm>
        </GridContainer>
    )
}
