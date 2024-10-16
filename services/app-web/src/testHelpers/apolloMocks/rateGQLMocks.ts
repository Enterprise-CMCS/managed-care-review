import {
    FetchRateDocument,
    FetchRateQuery, FetchRateWithQuestionsDocument,
    IndexRatesDocument,
    IndexRatesForDashboardDocument,
    IndexRatesForDashboardQuery,
    IndexRatesQuery,
    Rate,
    RateRevision,
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

const fetchRateWithQuestionsMockSuccess = (
    rate?: Partial<Rate>,
    revision?: Partial<RateRevision>
): MockedResponse<FetchRateQuery> => {
    const rateData = rateDataMock(revision, rate)

    return {
        request: {
            query: FetchRateWithQuestionsDocument,
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

const indexRatesForDashboardMockSuccess = (
    stateCode?: string,
    rates?: Rate[]
): MockedResponse<IndexRatesForDashboardQuery> => {
    const mockRates = rates ?? [
        { ...rateDataMock(), id: 'test-id-123', stateNumber: 3 },
        { ...rateDataMock(), id: 'test-id-124', stateNumber: 2 },
        { ...rateDataMock(), id: 'test-id-125', stateNumber: 1 },
    ]
    const ratesEdge = mockRates.map((rate) => {
        return {
            node: rate,
        }
    })
    return {
        request: {
            query: IndexRatesForDashboardDocument,
            variables: {
                input:{
                    stateCode: stateCode
                }
            }
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

const indexRatesMockSuccess = (
    stateCode?: string,
    rates?: Rate[]
): MockedResponse<IndexRatesQuery> => {
    const mockRates = rates ?? [
        { ...rateDataMock(), id: 'test-id-123', stateNumber: 3 },
        { ...rateDataMock(), id: 'test-id-124', stateNumber: 2 },
        { ...rateDataMock(), id: 'test-id-125', stateNumber: 1 },
    ]
    const ratesEdge = mockRates.map((rate) => {
        return {
            node: rate,
        }
    })
    return {
        request: {
            query: IndexRatesDocument,
            variables: {
                input:{
                    stateCode: stateCode
                }
            }
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

const indexRatesForDashboardMockFailure = (): MockedResponse<IndexRatesForDashboardQuery> => {
    const graphQLError = new GraphQLError('Issue finding rates with history', {
        extensions: {
            code: 'NOT_FOUND',
            cause: 'DB_ERROR',
        },
    })
    return {
        request: {
            query: IndexRatesForDashboardDocument,
        },
        result: {
            data: null,
            errors: [graphQLError],
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

export { 
    fetchRateMockSuccess, 
    indexRatesMockSuccess, 
    indexRatesForDashboardMockSuccess,
    indexRatesForDashboardMockFailure,
    indexRatesMockFailure, 
    fetchDraftRateMockSuccess,
    fetchRateWithQuestionsMockSuccess
}
