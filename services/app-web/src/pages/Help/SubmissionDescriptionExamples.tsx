import React from 'react'

import { GridContainer } from '@trussworks/react-uswds' 
import styles from './Help.module.scss'

export const SubmissionDescriptionExamples = (): React.ReactElement => {
    return (
        <section className={styles.helpSection}>
            <GridContainer>
                <h2>Submission Description Examples</h2>
                <h3>Example #1</h3>
                <p className="line-height-sans-4 measure-6">This COVID-related contract amendment adds (1) risk corridor language, (2) a telemedicine in lieu of service benefit, and (3) provisions related to enrollee access and provider relief during public health emergency period. These changes have been authorized through the state’s approved disaster relief State Plan Amendment. There was no rate change associated with this action, but an actuarial certification was submitted due to the implementation of the risk corridor. </p>
                <h3>Example #2</h3>
                <p className="line-height-sans-4 measure-6">This amendment revises calendar year (CY) 2019 capitation rates, adds new language concerning capitation payments related to a program no longer authorized by law, and changes the requirement that the MCO pay or deny clean paper claims within thirty (30), rather than twenty-one (21) calendar days of receipt.</p>
                <h3>Example #3</h3>
                <p className="line-height-sans-4 measure-6">Amendment 8 adds SUPPORT Act DUR provisions effective 10/1/19; reinvestment account language to comply with Nebraska Rev. Stat §71-831; and a high cost drug pool risk corridor. This amendment also modifies the capitation rates; the capitation rate determination process; administrative expense rate calculation time frames; the CY 20 Quality Performance Program measures; and general reporting requirements to remove duplicates.</p>
            </GridContainer>
        </section>
    )
}
