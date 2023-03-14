import React, { useEffect } from 'react'
import { GridContainer, Link } from '@trussworks/react-uswds'
import styles from './QuestionResponse.module.scss'

import { Loading, SectionHeader } from '../../components'
import { NavLink, useLocation, useOutletContext } from 'react-router-dom'
import { usePage } from '../../contexts/PageContext'
import { SideNavOutletContextType } from '../SubmissionSideNav/SubmissionSideNav'
import { QuestionResponseSubmitBanner } from '../../components/Banner/QuestionResponseSubmitBanner/QuestionResponseSubmitBanner'
import { QATable, QuestionData, Division } from './QATable/QATable'

export const QuestionResponse = () => {
    // router context
    const location = useLocation()
    const submitType = new URLSearchParams(location.search).get('submit')
    const { user, packageData, packageName, parsedQuestions } =
        useOutletContext<SideNavOutletContextType>()

    // page context
    const { updateHeading } = usePage()
    const questions = parsedQuestions
    const isCMSUser = user?.role === 'CMS_USER'

    useEffect(() => {
        updateHeading({ customHeading: packageName })
    }, [packageName, updateHeading])

    if (!packageData || !user) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    const mapQuestionTable = (
        divisionQuestions: QuestionData[],
        division: Division
    ) => {
        return divisionQuestions.length ? (
            divisionQuestions.map((question) => (
                <QATable
                    key={question.id}
                    question={question}
                    division={division}
                    user={user}
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
                {submitType && (
                    <QuestionResponseSubmitBanner submitType={submitType} />
                )}
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
