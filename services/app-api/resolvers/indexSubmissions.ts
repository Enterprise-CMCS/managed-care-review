import { ApolloError, ForbiddenError } from 'apollo-server-lambda'
import {
    isStateUser,
    SubmissionUnionType,
} from '../../app-web/src/common-code/domain-models'
import { QueryResolvers } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'
import { tracer as tracer } from "../handlers/otel_handler"

export function indexSubmissionsResolver(
    store: Store
): QueryResolvers['indexSubmissions'] {
    return async (_parent, _args, context) => {
        const { span } = context
        let spanContext
        let spanOptions
        if (span) {
        spanContext = span?.spanContext()
        spanOptions = {
            links: [
              {
                 context: spanContext
              }
            ]
          };
        }
        const localSpan = tracer.startSpan('indexSubmissions', spanOptions);
        
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            logError(
                'indexSubmissions',
                'user not authorized to fetch state data'
            )
            localSpan?.setAttribute('indexSubmissionsError', JSON.stringify(logError))
            localSpan?.addEvent('indexSubmissions unauthorized user')
            throw new ForbiddenError('user not authorized to fetch state data')
        }

        // fetch from the store
        const result = await store.findAllSubmissions(context.user.state_code)

        if (isStoreError(result)) {
            if (result.code === 'WRONG_STATUS') {
                logError(
                    'indexSubmissions',
                    'Submission is not a DraftSubmission'
                )
                localSpan?.setAttribute('indexSubmissionsError', JSON.stringify(logError))
                localSpan?.addEvent('indexSubmissions wrong status')
                throw new ApolloError(
                    `Submission is not a DraftSubmission`,
                    'WRONG_STATUS',
                    {
                        argumentName: 'submissionID',
                    }
                )
            }

            const errMessage = `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            logError('indexSubmissions', errMessage)
            localSpan?.setAttribute('indexSubmissionsError', errMessage)
            localSpan?.addEvent(`indexSubmissions ${errMessage}`)
            throw new Error(errMessage)
        }

        const submissions: SubmissionUnionType[] = result

        const edges = submissions.map((sub) => {
            return {
                node: sub,
            }
        })

        logSuccess('indexSubmissions')
        // console.log("span in indexsubmissions", localSpan)
        localSpan?.setAttribute('indexSubmissionsSuccess', JSON.stringify(submissions))
        localSpan?.addEvent('indexSubmissions otel success')
        localSpan?.end()
        return { totalCount: edges.length, edges }
    }
}
