import React, { useEffect, useState, useCallback } from 'react'
import { GridContainer, Link } from '@trussworks/react-uswds'
import styles from './QuestionsResponses.module.scss'
import { SectionHeader } from '../../components'
import { NavLink, useOutletContext } from 'react-router-dom'
import { packageName } from '../../common-code/healthPlanFormDataType'
import { usePage } from '../../contexts/PageContext'
import { SideNavOutletContextType } from '../SubmissionSideNav/SubmissionSideNav'
import { useS3 } from '../../contexts/S3Context'
import {
    IndexQuestionsPayload,
    Document,
    QuestionEdge,
} from '../../gen/gqlClient'
import { CmsUser } from '../../gen/gqlClient'
import { QATable, QuestionDocument, QuestionData } from './QATable/QATable'

type QADivisionQuestions = {
    dmco: {
        totalCount: number
        questions: QuestionData[]
    }
    dmcp: {
        totalCount: number
        questions: QuestionData[]
    }
    oact: {
        totalCount: number
        questions: QuestionData[]
    }
}

export const QuestionsResponses = () => {
    const outletContext = useOutletContext<SideNavOutletContextType>()
    const { updateHeading } = usePage()
    const [pkgName, setPkgName] = useState<string | undefined>(undefined)
    const [questions, setQuestions] = useState<QADivisionQuestions | undefined>(
        undefined
    )
    const { getURL, getKey } = useS3()

    const parseQuestions = useCallback(
        async (questions: IndexQuestionsPayload): Promise<void> => {
            const getDocumentsUrl = async (
                documents: Document[]
            ): Promise<QuestionDocument[]> => {
                return await Promise.all(
                    documents.map(async (doc) => {
                        const key = getKey(doc.s3URL)
                        if (!key)
                            return {
                                ...doc,
                                url: undefined,
                            }

                        const documentLink = await getURL(key)
                        return {
                            ...doc,
                            url: documentLink,
                        }
                    })
                ).catch((err) => {
                    console.info(err)
                    return []
                })
            }

            const extractQuestions = async (
                edges: QuestionEdge[]
            ): Promise<QuestionData[]> => {
                const questions = await Promise.all(
                    edges.map(async ({ node }) => ({
                        id: node.id,
                        pkgID: node.pkgID,
                        createdAt: node.createdAt,
                        addedBy: node.addedBy as CmsUser,
                        documents: await getDocumentsUrl(node.documents),
                    }))
                ).catch((err) => {
                    console.info(err)
                    return []
                })

                return questions
            }

            const divisionQuestions = {
                dmco: {
                    totalCount: questions.DMCOQuestions.totalCount ?? 0,
                    questions: await extractQuestions(
                        questions.DMCOQuestions.edges
                    ),
                },
                dmcp: {
                    totalCount: questions.DMCPQuestions.totalCount ?? 0,
                    questions: await extractQuestions(
                        questions.DMCPQuestions.edges
                    ),
                },
                oact: {
                    totalCount: questions.OACTQuestions.totalCount ?? 0,
                    questions: await extractQuestions(
                        questions.OACTQuestions.edges
                    ),
                },
            }

            setQuestions(divisionQuestions)
        },
        [getURL, getKey]
    )

    useEffect(() => {
        if (outletContext.pkg.questions) {
            void parseQuestions(outletContext.pkg.questions)
        }
    }, [outletContext.pkg.questions, parseQuestions])

    useEffect(() => {
        updateHeading({ customHeading: `${pkgName} Upload questions` })
    }, [pkgName, updateHeading])

    const isCMSUser = outletContext.user?.role === 'CMS_USER'

    // set the page heading
    const name = packageName(
        outletContext.packageData,
        outletContext.pkg.state.programs
    )
    if (pkgName !== name) {
        setPkgName(name)
    }

    const mapQuestionTable = (divisionQuestions?: QuestionData[]) => {
        const hasQuestions = divisionQuestions && divisionQuestions.length
        return hasQuestions ? (
            divisionQuestions.map((question) => (
                <QATable
                    key={question.id}
                    question={question}
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
                    {mapQuestionTable(questions?.dmco.questions)}
                </section>
                <section
                    className={styles.questionSection}
                    data-testid="dmcp-qa-section"
                >
                    <h3>Questions from OACT</h3>
                    {mapQuestionTable(questions?.dmcp.questions)}
                </section>
                <section
                    className={styles.questionSection}
                    data-testid="oact-qa-section"
                >
                    <h3>Questions from DMCP</h3>
                    {mapQuestionTable(questions?.oact.questions)}
                </section>
            </GridContainer>
        </div>
    )
}
