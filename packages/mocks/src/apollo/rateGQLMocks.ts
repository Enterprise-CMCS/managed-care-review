import {
    FetchRateDocument,
    FetchRateQuery,
    FetchRateWithQuestionsDocument,
    FetchRateWithQuestionsQuery,
    IndexRatesDocument,
    IndexRatesStrippedDocument,
    IndexRatesStrippedQuery,
    IndexRatesQuery,
    Rate,
    RateRevision, 
    RateStripped,
    IndexRatesStrippedWithRelatedContractsQuery,
    IndexRatesStrippedWithRelatedContractsDocument
} from '../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'
import {
    draftRateDataMock,
    rateDataMock,
    mockRateSubmittedWithQuestions, strippedRateDataMock,
} from './rateDataMock'
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

const indexRatesStrippedMockSuccess = (
    stateCode?: string,
    rates?: RateStripped[]
): MockedResponse<IndexRatesStrippedQuery> => {
    const mockRates = rates ?? [
        { ...strippedRateDataMock(), id: 'test-id-123', stateNumber: 3 },
        { ...strippedRateDataMock(), id: 'test-id-124', stateNumber: 2 },
        { ...strippedRateDataMock(), id: 'test-id-125', stateNumber: 1 },
    ]
    const ratesEdge = mockRates.map((rate) => {
        return {
            node: rate,
        }
    })
    return {
        request: {
            query: IndexRatesStrippedDocument,
            variables: {
                input: {
                    stateCode: stateCode,
                },
            },
        },
        result: {
            data: {
                indexRatesStripped: {
                    totalCount: ratesEdge.length,
                    edges: ratesEdge,
                },
            },
        },
    }
}

const indexRatesStrippedWithRelatedContractsMockSuccess = (
    stateCode?: string, 
    rateIDs?: string[]
): MockedResponse<IndexRatesStrippedWithRelatedContractsQuery> => {
    const mockRates = [
        { ...strippedRateDataMock(), id: 'test-id-123', stateNumber: 3 },
        { ...strippedRateDataMock(), id: 'test-id-124', stateNumber: 2 },
        { ...strippedRateDataMock(), id: 'test-id-125', stateNumber: 1 },
    ]
    const ratesEdge = mockRates.map((rate) => {
        return {
            node: rate,
        }
    })

    return {
        request: {
            query: IndexRatesStrippedWithRelatedContractsDocument,
            variables: {
                input: {
                    stateCode: stateCode,
                    rateIDs: rateIDs
                },
            }
        },
        result: {
            data: {
                indexRatesStripped: {
                    totalCount: ratesEdge.length,
                    edges: ratesEdge
                }
            }
        }
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
                input: {
                    stateCode: stateCode,
                },
            },
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

const indexRatesStrippedMockFailure =
    (): MockedResponse<IndexRatesStrippedQuery> => {
        const graphQLError = new GraphQLError(
            'Issue finding rates stripped',
            {
                extensions: {
                    code: 'NOT_FOUND',
                    cause: 'DB_ERROR',
                },
            }
        )
        return {
            request: {
                query: IndexRatesStrippedDocument,
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

const fetchRateWithQuestionsMockSuccess = ({
    rate,
    rateRev,
}: {
    rate?: Partial<Rate>
    rateRev?: Partial<RateRevision>
}): MockedResponse<FetchRateWithQuestionsQuery> => {
    const rateID = rate?.id ?? rateRev?.rateID ?? 'rate-123'
    const rateData = mockRateSubmittedWithQuestions(
        { ...rate, id: rateID },
        rateRev
    )

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
export {
    fetchRateMockSuccess,
    indexRatesMockSuccess,
    indexRatesMockFailure,
    indexRatesStrippedMockSuccess,
    indexRatesStrippedMockFailure,
    indexRatesStrippedWithRelatedContractsMockSuccess,
    fetchDraftRateMockSuccess,
    fetchRateWithQuestionsMockSuccess,
}
