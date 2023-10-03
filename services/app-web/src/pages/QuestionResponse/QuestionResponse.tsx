import { useEffect } from 'react'
import { GridContainer, Link } from '@trussworks/react-uswds'
import styles from './QuestionResponse.module.scss'

import { Loading, SectionHeader } from '../../components'
import { NavLink, useLocation, useOutletContext } from 'react-router-dom'
import { usePage } from '../../contexts/PageContext'
import { SideNavOutletContextType } from '../SubmissionSideNav/SubmissionSideNav'
import {
    QuestionResponseSubmitBanner,
    UserAccountWarningBanner,
} from '../../components/Banner'
import { QATable, QuestionData, Division } from './QATable/QATable'
import { CmsUser, QuestionEdge, StateUser } from '../../gen/gqlClient'
import { useStringConstants } from '../../hooks/useStringConstants'

type divisionQuestionDataType = {
    division: Division
    questions: QuestionData[]
}

const extractQuestions = (edges?: QuestionEdge[]): QuestionData[] => {
    if (!edges) {
        return []
    }
    return edges.map(({ node }) => ({
        ...node,
        addedBy: node.addedBy as CmsUser,
        responses: node.responses.map((response) => ({
            ...response,
            addedBy: response.addedBy as StateUser,
        })),
    }))
}

const getUserDivision = (user: CmsUser): Division | undefined => {
    if (user.divisionAssignment) {
        return user.divisionAssignment
    }
    return undefined
}

const getDivisionOrder = (division?: Division): Division[] =>
    ['DMCO', 'DMCP', 'OACT'].sort((a, b) => {
        if (a === division) {
            return -1
        }
        if (b === division) {
            return 1
        }
        return 0
    }) as Division[]

export const QuestionResponse = () => {
    const stringConstants = useStringConstants()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT
    // router context
    const location = useLocation()
    const submitType = new URLSearchParams(location.search).get('submit')
    const { user, packageData, packageName, pkg } =
        useOutletContext<SideNavOutletContextType>()
    let division: Division | undefined = undefined

    // page context
    const { updateHeading } = usePage()

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

    const isCMSUser = user?.role === 'CMS_USER'

    if (isCMSUser) {
        division = getUserDivision(user as CmsUser)
    }

    const divisionOrder = getDivisionOrder(division)
    const questions: divisionQuestionDataType[] = []

    divisionOrder.forEach(
        (division) =>
            pkg.questions?.[`${division}Questions`].totalCount &&
            questions.push({
                division: division,
                questions: extractQuestions(
                    pkg.questions?.[`${division}Questions`].edges
                ),
            })
    )

    const mapQASections = () =>
        questions.map((divisionQuestions) => (
            <section
                key={divisionQuestions.division}
                className={styles.questionSection}
                data-testid={`${divisionQuestions.division.toLowerCase()}-qa-section`}
            >
                <h4>{`Asked by ${divisionQuestions.division}`}</h4>
                {divisionQuestions.questions.map((question, index) => (
                    <QATable
                        key={question.id}
                        question={question}
                        division={divisionQuestions.division}
                        round={divisionQuestions.questions.length - index}
                        user={user}
                    />
                ))}
            </section>
        ))

    return (
        <div className={styles.background}>
            <GridContainer className={styles.container}>
                {isCMSUser && !division && (
                    <UserAccountWarningBanner
                        header={'Missing division'}
                        message={
                            <span>
                                You must be assigned to a division in order to
                                ask questions about a submission. Contact{' '}
                                <a href={`mailto:${MAIL_TO_SUPPORT}`}>
                                    {MAIL_TO_SUPPORT}
                                </a>{' '}
                                to add your division.
                            </span>
                        }
                    />
                )}
                {submitType && (
                    <QuestionResponseSubmitBanner submitType={submitType} />
                )}
                <section>
                    <SectionHeader header="Contract questions" hideBorder>
                        {isCMSUser && division && (
                            <Link
                                asCustom={NavLink}
                                className="usa-button"
                                variant="unstyled"
                                to={`./${division.toLowerCase()}/upload-questions`}
                            >
                                Add questions
                            </Link>
                        )}
                    </SectionHeader>
                </section>
                {questions.length ? (
                    mapQASections()
                ) : (
                    <section key={division} className={styles.questionSection}>
                        <div>
                            <p>No questions have been submitted yet.</p>
                        </div>
                    </section>
                )}
            </GridContainer>
        </div>
    )
}
