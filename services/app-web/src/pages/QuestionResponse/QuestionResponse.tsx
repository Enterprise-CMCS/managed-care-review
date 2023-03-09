import React, { useEffect, useState } from 'react'
import { GridContainer, Link } from '@trussworks/react-uswds'
import styles from './QuestionResponse.module.scss'
import { SectionHeader } from '../../components'
import { NavLink, useOutletContext } from 'react-router-dom'
import { packageName } from '../../common-code/healthPlanFormDataType'
import { usePage } from '../../contexts/PageContext'
import { SideNavOutletContextType } from '../SubmissionSideNav/SubmissionSideNav'
import { QATable, QuestionData, Division } from './QATable/QATable'

export const QuestionResponse = () => {
    const outletContext = useOutletContext<SideNavOutletContextType>()
    const { updateHeading } = usePage()
    const [pkgName, setPkgName] = useState<string | undefined>(undefined)
    const questions = outletContext.parsedQuestions

    useEffect(() => {
        updateHeading({ customHeading: `${pkgName} Upload questions` })
    }, [pkgName, updateHeading])

    const isCMSUser = outletContext.user.role === 'CMS_USER'

    // set the page heading
    const name = packageName(
        outletContext.packageData,
        outletContext.pkg.state.programs
    )
    if (pkgName !== name) {
        setPkgName(name)
    }

    const mapQuestionTable = (
        divisionQuestions: QuestionData[],
        division: Division
    ) => {
        return divisionQuestions.length ? (
            divisionQuestions.map((question, index) => (
                <QATable
                    key={question.id}
                    question={question}
                    division={division}
                    round={divisionQuestions.length - index}
                    user={outletContext.user}
                />
            ))
        ) : (
            <div>
                <p>This division has not submitted questions yet.</p>
            </div>
        )
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
                <section
                    className={styles.questionSection}
                    data-testid="dmco-qa-section"
                >
                    <h3>Questions from DMCO</h3>
                    {mapQuestionTable(questions.dmco.questions, 'DMCO')}
                </section>
                <section
                    className={styles.questionSection}
                    data-testid="dmcp-qa-section"
                >
                    <h3>Questions from OACT</h3>
                    {mapQuestionTable(questions.dmcp.questions, 'DMCP')}
                </section>
                <section
                    className={styles.questionSection}
                    data-testid="oact-qa-section"
                >
                    <h3>Questions from DMCP</h3>
                    {mapQuestionTable(questions.oact.questions, 'OACT')}
                </section>
            </GridContainer>
        </div>
    )
}
