import React from 'react'

import { Link } from '@trussworks/react-uswds'
import styles from './Errors.module.scss'
import { GridContainer } from '@trussworks/react-uswds'

export const GenericError = (): React.ReactElement => {
    return (
    	<>
    		<section className={styles.errorsContainer}>
	        <GridContainer>
	        	<h1>Something went wrong...</h1>
	        	<p>Please try to refresh the page. </p>
	        	<p><span>If the issue continues reach out to </span> 
	        		<Link href="mailto:mcrrs-team@truss.works">mcrrs-team@truss.works</Link>
	      		</p>
	        </GridContainer>
    		</section>
      </>
    )
}
