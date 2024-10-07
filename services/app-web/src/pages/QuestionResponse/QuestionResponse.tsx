import { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import styles from './QuestionResponse.module.scss'

import { Loading, SectionHeader, NavLinkWithLogging } from '../../components'
import { useLocation, useOutletContext } from 'react-router-dom'
import { usePage } from '../../contexts/PageContext'
import { SideNavOutletContextType } from '../SubmissionSideNav/SubmissionSideNav'
import {
    QuestionResponseSubmitBanner,
    UserAccountWarningBanner,
} from '../../components/Banner'
import { QATable, QuestionData, Division } from './QATable/QATable'
import { CmsUser, ContractQuestionEdge, StateUser } from '../../gen/gqlClient'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { hasCMSUserPermissions } from '../../gqlHelpers'
import { ContactSupportLink } from '../../components/ErrorAlert/ContactSupportLink'

type divisionQuestionDataType = {
    division: Division
    questions: QuestionData[]
}

const extractQuestions = (edges?: ContractQuestionEdge[]): QuestionData[] => {
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
    // router context
    const location = useLocation()
    const submitType = new URLSearchParams(location.search).get('submit')
    const { user, contractFormData, packageName, contract } =
        useOutletContext<SideNavOutletContextType>()
    let division: Division | undefined = undefined

    // page context
    const { updateHeading } = usePage()

    useEffect(() => {
        updateHeading({ customHeading: packageName })
    }, [packageName, updateHeading])

    if (!contractFormData || !user) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (contract.status === 'DRAFT') {
        return <GenericErrorPage />
    }

    const hasCMSPermissions = hasCMSUserPermissions(user)

    if (hasCMSPermissions) {
        division = getUserDivision(user as CmsUser)
    }

    const divisionOrder = getDivisionOrder(division)
    const questions: divisionQuestionDataType[] = []

    divisionOrder.forEach(
        (division) =>
            contract.questions?.[`${division}Questions`].totalCount &&
            questions.push({
                division: division,
                questions: extractQuestions(
                    contract.questions?.[`${division}Questions`].edges
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
                {hasCMSPermissions && !division && (
                    <UserAccountWarningBanner
                        header={'Missing division'}
                        message={
                            <span>
                                You must be assigned to a division in order to
                                ask questions about a submission. Please&nbsp;
                                <ContactSupportLink />
                                &nbsp;to add your division.
                            </span>
                        }
                    />
                )}
                {submitType && (
                    <QuestionResponseSubmitBanner submitType={submitType} />
                )}
                <section>
                    <SectionHeader header="Contract questions" hideBorder>
                        {hasCMSPermissions && division && (
                            <NavLinkWithLogging
                                className="usa-button"
                                variant="unstyled"
                                to={`./${division.toLowerCase()}/upload-questions`}
                            >
                                Add questions
                            </NavLinkWithLogging>
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
