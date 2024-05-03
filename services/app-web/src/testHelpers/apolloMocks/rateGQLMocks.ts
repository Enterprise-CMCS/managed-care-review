import {
    FetchRateDocument,
    FetchRateQuery,
    IndexRatesDocument,
    IndexRatesQuery,
    Rate,
    RateRevision,
    SubmitRateMutation,
} from '../../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'
import { draftRateDataMock, rateDataMock } from './rateDataMock'
import { GraphQLError } from 'graphql/index'

const fetchRateMockSuccess = (
    rate?: Partial<Rate>,
    revision?: Partial<RateRevision>
): MockedResponse<FetchRateQuery> => {
    const rateData = rateDataMock(revision, rate)

    return {
        request: {
            query: FetchRateDocument,
            variables: { input: { rateID: rateData.id } },
        },
        result: {
            data: {
                fetchRate: {
                    rate: {
                        ...rateData,
                    },
                },
            },
        },
    }
}
const fetchDraftRateMockSuccess = (
    rate?: Partial<Rate>,
    revision?: Partial<RateRevision>
): MockedResponse<FetchRateQuery> => {
    const rateData = draftRateDataMock(rate, revision)

    return {
        request: {
            query: FetchRateDocument,
            variables: { input: { rateID: rateData.id } },
        },
        result: {
            data: {
                fetchRate: {
                    rate: {
                        ...rateData,
                    },
                },
            },
        },
    }
}

const indexRatesMockSuccess = (
    rates: Rate[] = [
        { ...rateDataMock(), id: 'test-id-123', stateNumber: 3 },
        { ...rateDataMock(), id: 'test-id-123', stateNumber: 2 },
        { ...rateDataMock(), id: 'test-id-124', stateNumber: 1 },
    ]
): MockedResponse<IndexRatesQuery> => {
    const ratesEdge = rates.map((rate) => {
        return {
            node: rate,
        }
    })
    return {
        request: {
            query: IndexRatesDocument,
        },
        result: {
            data: {
                indexRates: {
                    totalCount: ratesEdge.length,
                    edges: ratesEdge,
                },
            },
        },
    }
}

const indexRatesMockFailure = (): MockedResponse<IndexRatesQuery> => {
    const graphQLError = new GraphQLError('Issue finding rates with history', {
        extensions: {
            code: 'NOT_FOUND',
            cause: 'DB_ERROR',
        },
    })
    return {
        request: {
            query: IndexRatesDocument,
        },
        result: {
            data: null,
            errors: [graphQLError],
        },
    }
}

export { fetchRateMockSuccess, indexRatesMockSuccess, indexRatesMockFailure, fetchDraftRateMockSuccess }
