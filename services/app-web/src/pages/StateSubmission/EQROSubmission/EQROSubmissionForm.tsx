import { Routes, Route } from 'react-router-dom'
import { getRelativePathFromNestedRoute } from '../submissionUtils'

export const EQROSubmissionForm = (): React.ReactElement => {
    return (
        <div>
            <Routes>
                <Route
                    path={getRelativePathFromNestedRoute('SUBMISSIONS_TYPE')}
                    element={<h1>Submission details</h1>}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_CONTRACT_DETAILS'
                    )}
                    element={<h1>Contract details</h1>}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_CONTACTS'
                    )}
                    element={<h1>State contacts</h1>}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_REVIEW_SUBMIT'
                    )}
                    element={<h1>Review and submit</h1>}
                />
            </Routes>
        </div>
    )
}
