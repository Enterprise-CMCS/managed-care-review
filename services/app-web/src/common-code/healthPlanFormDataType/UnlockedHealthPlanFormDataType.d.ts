// Draft state submission is a health plan that a state user is still working on

type SubmissionType = 'CONTRACT_ONLY' | 'CONTRACT_AND_RATES'

type DocumentCategoryType =
    | 'CONTRACT'
    | 'RATES'
    | 'CONTRACT_RELATED'
    | 'RATES_RELATED'

type SubmissionDocument = {
    name: string
    s3URL: string
    documentCategories: DocumentCategoryType[]
}

type ContractAmendmentInfo = {
    modifiedProvisions: ModifiedProvisions
}

type RateAmendmentInfo = {
    effectiveDateStart?: CalendarDate
    effectiveDateEnd?: CalendarDate
}

type ContractType = 'BASE' | 'AMENDMENT'

type ContractExecutionStatus = 'EXECUTED' | 'UNEXECUTED'

type ActuarialFirmType =
    | 'MERCER'
    | 'MILLIMAN'
    | 'OPTUMAS'
    | 'GUIDEHOUSE'
    | 'DELOITTE'
    | 'STATE_IN_HOUSE'
    | 'OTHER'

type ActuaryCommunicationType = 'OACT_TO_ACTUARY' | 'OACT_TO_STATE'

type FederalAuthority =
    | 'STATE_PLAN'
    | 'WAIVER_1915B'
    | 'WAIVER_1115'
    | 'VOLUNTARY'
    | 'BENCHMARK'
    | 'TITLE_XXI'

type StateContact = {
    name: string
    titleRole: string
    email: string
}

type ActuaryContact = {
    name: string
    titleRole: string
    email: string
    actuarialFirm?: ActuarialFirmType
    actuarialFirmOther?: string
}

type RateType = 'NEW' | 'AMENDMENT'

type RateCapitationType = 'RATE_CELL' | 'RATE_RANGE'

type ManagedCareEntity = 'MCO' | 'PIHP' | 'PAHP' | 'PCCM'

type Day =
    | '01'
    | '02'
    | '03'
    | '04'
    | '05'
    | '06'
    | '07'
    | '08'
    | '09'
    | '10'
    | '11'
    | '12'
    | '13'
    | '14'
    | '15'
    | '16'
    | '17'
    | '18'
    | '19'
    | '20'
    | '21'
    | '22'
    | '23'
    | '24'
    | '25'
    | '26'
    | '27'
    | '28'
    | '29'
    | '30'
    | '31'

type Month =
    | '01'
    | '02'
    | '03'
    | '04'
    | '05'
    | '06'
    | '07'
    | '08'
    | '09'
    | '10'
    | '11'
    | '12'

type Year =
    | '1950'
    | '1951'
    | '1952'
    | '1953'
    | '1954'
    | '1955'
    | '1956'
    | '1957'
    | '1958'
    | '1959'
    | '1960'
    | '1961'
    | '1962'
    | '1963'
    | '1964'
    | '1965'
    | '1966'
    | '1967'
    | '1968'
    | '1969'
    | '1970'
    | '1971'
    | '1972'
    | '1973'
    | '1974'
    | '1975'
    | '1976'
    | '1977'
    | '1978'
    | '1979'
    | '1980'
    | '1981'
    | '1982'
    | '1983'
    | '1984'
    | '1985'
    | '1986'
    | '1987'
    | '1988'
    | '1989'
    | '1990'
    | '1991'
    | '1992'
    | '1993'
    | '1994'
    | '1995'
    | '1996'
    | '1997'
    | '1998'
    | '1999'
    | '2000'
    | '2001'
    | '2002'
    | '2003'
    | '2004'
    | '2005'
    | '2006'
    | '2007'
    | '2008'
    | '2009'
    | '2010'
    | '2011'
    | '2012'
    | '2013'
    | '2014'
    | '2015'
    | '2016'
    | '2017'
    | '2018'
    | '2019'
    | '2020'
    | '2021'
    | '2022'
    | '2023'
    | '2024'
    | '2025'
    | '2026'
    | '2027'
    | '2028'
    | '2029'
    | '2030'
    | '2031'
    | '2032'
    | '2033'
    | '2034'
    | '2035'
    | '2036'
    | '2037'
    | '2038'
    | '2039'
    | '2040'
    | '2041'
    | '2042'
    | '2043'
    | '2044'
    | '2045'
    | '2046'
    | '2047'
    | '2048'
    | '2049'
    | '2050'
    | '2051'
    | '2052'
    | '2053'
    | '2054'
    | '2055'
    | '2056'
    | '2057'
    | '2058'
    | '2059'
    | '2060'
    | '2061'
    | '2062'
    | '2063'
    | '2064'
    | '2065'
    | '2066'
    | '2067'
    | '2068'
    | '2069'
    | '2070'
    | '2071'
    | '2072'
    | '2073'
    | '2074'
    | '2075'
    | '2076'
    | '2077'
    | '2078'
    | '2079'
    | '2080'
    | '2081'
    | '2082'
    | '2083'
    | '2084'
    | '2085'
    | '2086'
    | '2087'
    | '2088'
    | '2089'
    | '2090'
    | '2091'
    | '2092'
    | '2093'
    | '2094'
    | '2095'
    | '2096'
    | '2097'
    | '2098'
    | '2099'
    | '2100'

type CalendarDate = `${Year}-${Month}-${Day}`

// MAIN
type UnlockedHealthPlanFormDataType = {
    id: string
    createdAt: Date
    updatedAt: Date
    status: 'DRAFT'
    stateCode: string
    stateNumber: number
    programIDs: string[]
    submissionType: SubmissionType
    submissionDescription: string
    stateContacts: StateContact[]
    actuaryContacts: ActuaryContact[]
    actuaryCommunicationPreference?: ActuaryCommunicationType
    documents: SubmissionDocument[]
    contractType?: ContractType
    contractExecutionStatus?: ContractExecutionStatus
    contractDocuments: SubmissionDocument[]
    contractDateStart?: CalendarDate
    contractDateEnd?: CalendarDate
    managedCareEntities: string[]
    federalAuthorities: FederalAuthority[]
    contractAmendmentInfo?: ContractAmendmentInfo
    rateType?: RateType
    rateCapitationType?: RateCapitationType
    rateDocuments: SubmissionDocument[]
    rateDateStart?: CalendarDate
    rateDateEnd?: CalendarDate
    rateDateCertified?: CalendarDate
    rateAmendmentInfo?: RateAmendmentInfo
    rateProgramIDs?: string[]
}

type RateDataType = {
    rateType?: 'AMENDMENT' | 'NEW' | null
    rateCapitationType?: RateCapitationType
    rateDateStart?: CalendarDate
    rateDateEnd?: CalendarDate
    rateDateCertified?: CalendarDate
    rateAmendmentInfo?: {
        effectiveDateEnd?: CalendarDate
        effectiveDateStart?: CalendarDate
    } | null
    rateProgramIDs?: string[]
}

export type {
    DocumentCategoryType,
    SubmissionType,
    SubmissionDocument,
    RateType,
    StateContact,
    ActuaryContact,
    ActuarialFirmType,
    ActuaryCommunicationType,
    ContractType,
    FederalAuthority,
    ManagedCareEntity,
    UnlockedHealthPlanFormDataType,
    ContractAmendmentInfo,
    ContractExecutionStatus,
    RateDataType,
    RateAmendmentInfo,
    RateCapitationType,
    CalendarDate,
}
