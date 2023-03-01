import React, { useEffect, useState } from 'react'
import { GridContainer, Link } from '@trussworks/react-uswds'
import styles from './QuestionResponse.module.scss'
import { Loading, SectionHeader } from '../../components'
import { NavLink, useOutletContext } from 'react-router-dom'
import { packageName } from '../../common-code/healthPlanFormDataType'
import { usePage } from '../../contexts/PageContext'
import { SideNavOutletContextType } from '../SubmissionSideNav/SubmissionSideNav'

export const QuestionResponse = () => {
    const outletContext = useOutletContext<SideNavOutletContextType>()
    const { updateHeading } = usePage()
    const [pkgName, setPkgName] = useState<string | undefined>(undefined)

    useEffect(() => {
        updateHeading({ customHeading: `${pkgName} Upload questions` })
    }, [pkgName, updateHeading])

    if (!outletContext) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }
    const isCMSUser = outletContext.user?.role === 'CMS_USER'

    // set the page heading
    const name = packageName(
        outletContext.packageData,
        outletContext.pkg.state.programs
    )
    if (pkgName !== name) {
        setPkgName(name)
    }

    return (
        <div className={styles.background}>
            <GridContainer className={styles.container}>
                <section>
                    <SectionHeader header="Q&A" hideBorder>
                        {isCMSUser && (
                            <Link
                                asCustom={NavLink}
                                className="usa-button"
                                variant="unstyled"
                                to={'./dmco/upload-questions'}
                            >
                                Add questions
                            </Link>
                        )}
                    </SectionHeader>
                </section>
                <section className={styles.questionSection}>
                    <h3>Questions from DMCO</h3>
                    <div>
                        <p>This division has not submitted questions yet.</p>
                    </div>
                </section>
                <section className={styles.questionSection}>
                    <h3>Questions from OACT</h3>
                    <div>
                        <p>This division has not submitted questions yet.</p>
                    </div>
                </section>
                <section className={styles.questionSection}>
                    <h3>Questions from DMCP</h3>
                    <div>
                        <p>This division has not submitted questions yet.</p>
                    </div>
                </section>
            </GridContainer>
        </div>
    )
}
