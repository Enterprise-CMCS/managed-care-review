import React from 'react'
import { Fieldset, Radio, FormGroup, Dropdown, Label, Textarea } from '@trussworks/react-uswds'

import styles from './NewSubmissionForm.module.scss'

export const SubmissionType = (): React.ReactElement => {
	return (
		<>
			<FormGroup>
				<Label htmlFor="programs">Program</Label>
				<Dropdown id="programs" name="programs">
					<option value="cccPlus">CCC Plus</option>
					<option value="medallion">Medalion</option>
				</Dropdown>
			</FormGroup>
			<FormGroup>
				<Fieldset legend="Choose submission type">
					<Radio
						id="ContractOnly"
						name="submission-type"
						label="Contract action only"
						value="contractOnly"	
					/>
					<Radio
						id="ContractAndRate"
						name="submission-type"
						label="Contract action and rate certification"
						value="contractRate"	
					/>
				</Fieldset>
			</FormGroup>
			<FormGroup>
				<Label htmlFor="submission-description">Submission description</Label>
				<span className="usa-hint">Provide a description of any major changes or updates</span>
				<Textarea id="submission-description" name="submission-description"/>
			</FormGroup>
		</>
	)
}
