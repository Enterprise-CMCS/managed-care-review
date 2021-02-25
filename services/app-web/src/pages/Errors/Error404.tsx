import React from 'react'

import { NavLink } from 'react-router-dom'
import { Link } from '@trussworks/react-uswds'
import styles from './Errors.module.scss'
import { GridContainer } from '@trussworks/react-uswds'

export const Error404 = (): React.ReactElement => {
    return (
    	<>
        <GridContainer className={styles.errorsContainer}>
        	<h1>404 / Page not found</h1>
        	<p>You might want to double-check your link and try again.</p>
        	<p><span>Or return to your </span> 
        		<NavLink to="/dashboard">Dashboard</NavLink>
      		</p>
        </GridContainer>
      </>
    )
}