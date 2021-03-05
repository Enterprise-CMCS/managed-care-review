import React from 'react'
import { GridContainer, Form, ButtonGroup, Link, Button } from '@trussworks/react-uswds'
import { SubmissionType } from './SubmissionType'

import styles from './NewSubmissionForm.module.scss'

export const NewSubmissionForm = (): React.ReactElement => {
	return (
		<GridContainer>
			<h2 className={styles.formHeader}>Submission type</h2>
			<div className={styles.formContainer}>
				<span>All fields are required</span>
{/*				<Form>*/}
					<SubmissionType/>
				{/*</Form>*/}
			</div>
			<ButtonGroup type="default">
		    <Link href="#" className="usa-button usa-button--outline">
		      Back
		    </Link>
		    <Button type="button">Continue</Button>
		  </ButtonGroup>
		</GridContainer>
	)
}
