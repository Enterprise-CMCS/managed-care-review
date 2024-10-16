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
import { QuestionData, Division } from './QuestionResponseHelpers'
import { QATable } from './QATable/QATable'
import { CmsUser } from '../../gen/gqlClient'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { hasCMSUserPermissions } from '../../gqlHelpers'
import { ContactSupportLink } from '../../components/ErrorAlert/ContactSupportLink'
import {
    extractQuestions,
    getUserDivision,
    getDivisionOrder,
} from './QuestionResponseHelpers'

type divisionQuestionDataType = {
    division: Division
    questions: QuestionData[]
}

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
