import { z } from 'zod';
declare const submissionTypeSchema: z.ZodUnion<[z.ZodLiteral<"CONTRACT_ONLY">, z.ZodLiteral<"CONTRACT_AND_RATES">]>;
declare const populationCoveredSchema: z.ZodUnion<[z.ZodLiteral<"MEDICAID">, z.ZodLiteral<"CHIP">, z.ZodLiteral<"MEDICAID_AND_CHIP">]>;
declare const capitationRatesAmendedReasonSchema: z.ZodUnion<[z.ZodLiteral<"ANNUAL">, z.ZodLiteral<"MIDYEAR">, z.ZodLiteral<"OTHER">]>;
declare const submissionDocumentSchema: z.ZodObject<{
    name: z.ZodString;
    s3URL: z.ZodString;
    sha256: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    s3URL: string;
    sha256?: string | undefined;
    id?: string | undefined;
}, {
    name: string;
    s3URL: string;
    sha256?: string | undefined;
    id?: string | undefined;
}>;
declare const rateAmendmentInfoSchema: z.ZodObject<{
    effectiveDateStart: z.ZodOptional<z.ZodDate>;
    effectiveDateEnd: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    effectiveDateEnd?: Date | undefined;
    effectiveDateStart?: Date | undefined;
}, {
    effectiveDateEnd?: Date | undefined;
    effectiveDateStart?: Date | undefined;
}>;
declare const contractTypeSchema: z.ZodUnion<[z.ZodLiteral<"BASE">, z.ZodLiteral<"AMENDMENT">]>;
declare const contractExecutionStatusSchema: z.ZodUnion<[z.ZodLiteral<"EXECUTED">, z.ZodLiteral<"UNEXECUTED">]>;
declare const actuarialFirmTypeSchema: z.ZodUnion<[z.ZodLiteral<"MERCER">, z.ZodLiteral<"MILLIMAN">, z.ZodLiteral<"OPTUMAS">, z.ZodLiteral<"GUIDEHOUSE">, z.ZodLiteral<"DELOITTE">, z.ZodLiteral<"STATE_IN_HOUSE">, z.ZodLiteral<"OTHER">]>;
declare const actuaryCommunicationTypeSchema: z.ZodUnion<[z.ZodLiteral<"OACT_TO_ACTUARY">, z.ZodLiteral<"OACT_TO_STATE">]>;
declare const federalAuthoritySchema: z.ZodUnion<[z.ZodLiteral<"STATE_PLAN">, z.ZodLiteral<"WAIVER_1915B">, z.ZodLiteral<"WAIVER_1115">, z.ZodLiteral<"VOLUNTARY">, z.ZodLiteral<"BENCHMARK">, z.ZodLiteral<"TITLE_XXI">]>;
declare const stateContactSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    titleRole: z.ZodOptional<z.ZodString>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    titleRole?: string | undefined;
    email?: string | undefined;
}, {
    name?: string | undefined;
    titleRole?: string | undefined;
    email?: string | undefined;
}>;
declare const actuaryContactSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    titleRole: z.ZodOptional<z.ZodString>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    actuarialFirm: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"MERCER">, z.ZodLiteral<"MILLIMAN">, z.ZodLiteral<"OPTUMAS">, z.ZodLiteral<"GUIDEHOUSE">, z.ZodLiteral<"DELOITTE">, z.ZodLiteral<"STATE_IN_HOUSE">, z.ZodLiteral<"OTHER">]>>;
    actuarialFirmOther: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    id?: string | undefined;
    titleRole?: string | undefined;
    email?: string | undefined;
    actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
    actuarialFirmOther?: string | undefined;
}, {
    name?: string | undefined;
    id?: string | undefined;
    titleRole?: string | undefined;
    email?: string | undefined;
    actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
    actuarialFirmOther?: string | undefined;
}>;
declare const sharedRateCertDisplay: z.ZodObject<{
    packageName: z.ZodString;
    packageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    packageName: string;
    packageId: string;
}, {
    packageName: string;
    packageId: string;
}>;
declare const rateTypeSchema: z.ZodUnion<[z.ZodLiteral<"NEW">, z.ZodLiteral<"AMENDMENT">]>;
declare const rateCapitationTypeSchema: z.ZodUnion<[z.ZodLiteral<"RATE_CELL">, z.ZodLiteral<"RATE_RANGE">]>;
declare const unlockedHealthPlanFormDataZodSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    status: z.ZodLiteral<"DRAFT">;
    stateCode: z.ZodString;
    stateNumber: z.ZodNumber;
    programIDs: z.ZodArray<z.ZodString, "many">;
    populationCovered: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"MEDICAID">, z.ZodLiteral<"CHIP">, z.ZodLiteral<"MEDICAID_AND_CHIP">]>>;
    submissionType: z.ZodUnion<[z.ZodLiteral<"CONTRACT_ONLY">, z.ZodLiteral<"CONTRACT_AND_RATES">]>;
    submissionDescription: z.ZodString;
    riskBasedContract: z.ZodOptional<z.ZodBoolean>;
    stateContacts: z.ZodArray<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        titleRole: z.ZodOptional<z.ZodString>;
        email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        titleRole?: string | undefined;
        email?: string | undefined;
    }, {
        name?: string | undefined;
        titleRole?: string | undefined;
        email?: string | undefined;
    }>, "many">;
    addtlActuaryContacts: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        titleRole: z.ZodOptional<z.ZodString>;
        email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        actuarialFirm: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"MERCER">, z.ZodLiteral<"MILLIMAN">, z.ZodLiteral<"OPTUMAS">, z.ZodLiteral<"GUIDEHOUSE">, z.ZodLiteral<"DELOITTE">, z.ZodLiteral<"STATE_IN_HOUSE">, z.ZodLiteral<"OTHER">]>>;
        actuarialFirmOther: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        id?: string | undefined;
        titleRole?: string | undefined;
        email?: string | undefined;
        actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
        actuarialFirmOther?: string | undefined;
    }, {
        name?: string | undefined;
        id?: string | undefined;
        titleRole?: string | undefined;
        email?: string | undefined;
        actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
        actuarialFirmOther?: string | undefined;
    }>, "many">;
    addtlActuaryCommunicationPreference: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"OACT_TO_ACTUARY">, z.ZodLiteral<"OACT_TO_STATE">]>>;
    documents: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        s3URL: z.ZodString;
        sha256: z.ZodOptional<z.ZodString>;
        id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }, {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }>, "many">;
    contractType: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"BASE">, z.ZodLiteral<"AMENDMENT">]>>;
    contractExecutionStatus: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"EXECUTED">, z.ZodLiteral<"UNEXECUTED">]>>;
    contractDocuments: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        s3URL: z.ZodString;
        sha256: z.ZodOptional<z.ZodString>;
        id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }, {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }>, "many">;
    contractDateStart: z.ZodOptional<z.ZodDate>;
    contractDateEnd: z.ZodOptional<z.ZodDate>;
    managedCareEntities: z.ZodArray<z.ZodString, "many">;
    federalAuthorities: z.ZodArray<z.ZodUnion<[z.ZodLiteral<"STATE_PLAN">, z.ZodLiteral<"WAIVER_1915B">, z.ZodLiteral<"WAIVER_1115">, z.ZodLiteral<"VOLUNTARY">, z.ZodLiteral<"BENCHMARK">, z.ZodLiteral<"TITLE_XXI">]>, "many">;
    contractAmendmentInfo: z.ZodOptional<z.ZodObject<{
        modifiedProvisions: z.ZodObject<{
            inLieuServicesAndSettings: z.ZodOptional<z.ZodBoolean>;
            modifiedBenefitsProvided: z.ZodOptional<z.ZodBoolean>;
            modifiedGeoAreaServed: z.ZodOptional<z.ZodBoolean>;
            modifiedMedicaidBeneficiaries: z.ZodOptional<z.ZodBoolean>;
            modifiedRiskSharingStrategy: z.ZodOptional<z.ZodBoolean>;
            modifiedIncentiveArrangements: z.ZodOptional<z.ZodBoolean>;
            modifiedWitholdAgreements: z.ZodOptional<z.ZodBoolean>;
            modifiedStateDirectedPayments: z.ZodOptional<z.ZodBoolean>;
            modifiedPassThroughPayments: z.ZodOptional<z.ZodBoolean>;
            modifiedPaymentsForMentalDiseaseInstitutions: z.ZodOptional<z.ZodBoolean>;
            modifiedMedicalLossRatioStandards: z.ZodOptional<z.ZodBoolean>;
            modifiedOtherFinancialPaymentIncentive: z.ZodOptional<z.ZodBoolean>;
            modifiedEnrollmentProcess: z.ZodOptional<z.ZodBoolean>;
            modifiedGrevienceAndAppeal: z.ZodOptional<z.ZodBoolean>;
            modifiedNetworkAdequacyStandards: z.ZodOptional<z.ZodBoolean>;
            modifiedLengthOfContract: z.ZodOptional<z.ZodBoolean>;
            modifiedNonRiskPaymentArrangements: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            modifiedBenefitsProvided?: boolean | undefined;
            modifiedGeoAreaServed?: boolean | undefined;
            modifiedMedicaidBeneficiaries?: boolean | undefined;
            modifiedEnrollmentProcess?: boolean | undefined;
            modifiedMedicalLossRatioStandards?: boolean | undefined;
            modifiedGrevienceAndAppeal?: boolean | undefined;
            modifiedNetworkAdequacyStandards?: boolean | undefined;
            modifiedLengthOfContract?: boolean | undefined;
            modifiedNonRiskPaymentArrangements?: boolean | undefined;
            inLieuServicesAndSettings?: boolean | undefined;
            modifiedRiskSharingStrategy?: boolean | undefined;
            modifiedIncentiveArrangements?: boolean | undefined;
            modifiedWitholdAgreements?: boolean | undefined;
            modifiedStateDirectedPayments?: boolean | undefined;
            modifiedPassThroughPayments?: boolean | undefined;
            modifiedPaymentsForMentalDiseaseInstitutions?: boolean | undefined;
            modifiedOtherFinancialPaymentIncentive?: boolean | undefined;
        }, {
            modifiedBenefitsProvided?: boolean | undefined;
            modifiedGeoAreaServed?: boolean | undefined;
            modifiedMedicaidBeneficiaries?: boolean | undefined;
            modifiedEnrollmentProcess?: boolean | undefined;
            modifiedMedicalLossRatioStandards?: boolean | undefined;
            modifiedGrevienceAndAppeal?: boolean | undefined;
            modifiedNetworkAdequacyStandards?: boolean | undefined;
            modifiedLengthOfContract?: boolean | undefined;
            modifiedNonRiskPaymentArrangements?: boolean | undefined;
            inLieuServicesAndSettings?: boolean | undefined;
            modifiedRiskSharingStrategy?: boolean | undefined;
            modifiedIncentiveArrangements?: boolean | undefined;
            modifiedWitholdAgreements?: boolean | undefined;
            modifiedStateDirectedPayments?: boolean | undefined;
            modifiedPassThroughPayments?: boolean | undefined;
            modifiedPaymentsForMentalDiseaseInstitutions?: boolean | undefined;
            modifiedOtherFinancialPaymentIncentive?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        modifiedProvisions: {
            modifiedBenefitsProvided?: boolean | undefined;
            modifiedGeoAreaServed?: boolean | undefined;
            modifiedMedicaidBeneficiaries?: boolean | undefined;
            modifiedEnrollmentProcess?: boolean | undefined;
            modifiedMedicalLossRatioStandards?: boolean | undefined;
            modifiedGrevienceAndAppeal?: boolean | undefined;
            modifiedNetworkAdequacyStandards?: boolean | undefined;
            modifiedLengthOfContract?: boolean | undefined;
            modifiedNonRiskPaymentArrangements?: boolean | undefined;
            inLieuServicesAndSettings?: boolean | undefined;
            modifiedRiskSharingStrategy?: boolean | undefined;
            modifiedIncentiveArrangements?: boolean | undefined;
            modifiedWitholdAgreements?: boolean | undefined;
            modifiedStateDirectedPayments?: boolean | undefined;
            modifiedPassThroughPayments?: boolean | undefined;
            modifiedPaymentsForMentalDiseaseInstitutions?: boolean | undefined;
            modifiedOtherFinancialPaymentIncentive?: boolean | undefined;
        };
    }, {
        modifiedProvisions: {
            modifiedBenefitsProvided?: boolean | undefined;
            modifiedGeoAreaServed?: boolean | undefined;
            modifiedMedicaidBeneficiaries?: boolean | undefined;
            modifiedEnrollmentProcess?: boolean | undefined;
            modifiedMedicalLossRatioStandards?: boolean | undefined;
            modifiedGrevienceAndAppeal?: boolean | undefined;
            modifiedNetworkAdequacyStandards?: boolean | undefined;
            modifiedLengthOfContract?: boolean | undefined;
            modifiedNonRiskPaymentArrangements?: boolean | undefined;
            inLieuServicesAndSettings?: boolean | undefined;
            modifiedRiskSharingStrategy?: boolean | undefined;
            modifiedIncentiveArrangements?: boolean | undefined;
            modifiedWitholdAgreements?: boolean | undefined;
            modifiedStateDirectedPayments?: boolean | undefined;
            modifiedPassThroughPayments?: boolean | undefined;
            modifiedPaymentsForMentalDiseaseInstitutions?: boolean | undefined;
            modifiedOtherFinancialPaymentIncentive?: boolean | undefined;
        };
    }>>;
    rateInfos: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        rateType: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"NEW">, z.ZodLiteral<"AMENDMENT">]>>;
        rateCapitationType: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"RATE_CELL">, z.ZodLiteral<"RATE_RANGE">]>>;
        rateDocuments: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            s3URL: z.ZodString;
            sha256: z.ZodOptional<z.ZodString>;
            id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }, {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }>, "many">>;
        supportingDocuments: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            s3URL: z.ZodString;
            sha256: z.ZodOptional<z.ZodString>;
            id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }, {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }>, "many">>;
        rateDateStart: z.ZodOptional<z.ZodDate>;
        rateDateEnd: z.ZodOptional<z.ZodDate>;
        rateDateCertified: z.ZodOptional<z.ZodDate>;
        rateAmendmentInfo: z.ZodOptional<z.ZodObject<{
            effectiveDateStart: z.ZodOptional<z.ZodDate>;
            effectiveDateEnd: z.ZodOptional<z.ZodDate>;
        }, "strip", z.ZodTypeAny, {
            effectiveDateEnd?: Date | undefined;
            effectiveDateStart?: Date | undefined;
        }, {
            effectiveDateEnd?: Date | undefined;
            effectiveDateStart?: Date | undefined;
        }>>;
        rateProgramIDs: z.ZodArray<z.ZodString, "many">;
        rateCertificationName: z.ZodOptional<z.ZodString>;
        actuaryContacts: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            titleRole: z.ZodOptional<z.ZodString>;
            email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            actuarialFirm: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"MERCER">, z.ZodLiteral<"MILLIMAN">, z.ZodLiteral<"OPTUMAS">, z.ZodLiteral<"GUIDEHOUSE">, z.ZodLiteral<"DELOITTE">, z.ZodLiteral<"STATE_IN_HOUSE">, z.ZodLiteral<"OTHER">]>>;
            actuarialFirmOther: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }, {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }>, "many">;
        addtlActuaryContacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            titleRole: z.ZodOptional<z.ZodString>;
            email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            actuarialFirm: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"MERCER">, z.ZodLiteral<"MILLIMAN">, z.ZodLiteral<"OPTUMAS">, z.ZodLiteral<"GUIDEHOUSE">, z.ZodLiteral<"DELOITTE">, z.ZodLiteral<"STATE_IN_HOUSE">, z.ZodLiteral<"OTHER">]>>;
            actuarialFirmOther: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }, {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }>, "many">>;
        actuaryCommunicationPreference: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"OACT_TO_ACTUARY">, z.ZodLiteral<"OACT_TO_STATE">]>>;
        packagesWithSharedRateCerts: z.ZodArray<z.ZodObject<{
            packageName: z.ZodString;
            packageId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            packageName: string;
            packageId: string;
        }, {
            packageName: string;
            packageId: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        rateProgramIDs: string[];
        actuaryContacts: {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }[];
        packagesWithSharedRateCerts: {
            packageName: string;
            packageId: string;
        }[];
        rateType?: "AMENDMENT" | "NEW" | undefined;
        rateAmendmentInfo?: {
            effectiveDateEnd?: Date | undefined;
            effectiveDateStart?: Date | undefined;
        } | undefined;
        rateDateCertified?: Date | undefined;
        rateDateEnd?: Date | undefined;
        rateDateStart?: Date | undefined;
        id?: string | undefined;
        rateCapitationType?: "RATE_CELL" | "RATE_RANGE" | undefined;
        rateDocuments?: {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }[] | undefined;
        supportingDocuments?: {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }[] | undefined;
        rateCertificationName?: string | undefined;
        addtlActuaryContacts?: {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }[] | undefined;
        actuaryCommunicationPreference?: "OACT_TO_ACTUARY" | "OACT_TO_STATE" | undefined;
    }, {
        rateProgramIDs: string[];
        actuaryContacts: {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }[];
        packagesWithSharedRateCerts: {
            packageName: string;
            packageId: string;
        }[];
        rateType?: "AMENDMENT" | "NEW" | undefined;
        rateAmendmentInfo?: {
            effectiveDateEnd?: Date | undefined;
            effectiveDateStart?: Date | undefined;
        } | undefined;
        rateDateCertified?: Date | undefined;
        rateDateEnd?: Date | undefined;
        rateDateStart?: Date | undefined;
        id?: string | undefined;
        rateCapitationType?: "RATE_CELL" | "RATE_RANGE" | undefined;
        rateDocuments?: {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }[] | undefined;
        supportingDocuments?: {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }[] | undefined;
        rateCertificationName?: string | undefined;
        addtlActuaryContacts?: {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }[] | undefined;
        actuaryCommunicationPreference?: "OACT_TO_ACTUARY" | "OACT_TO_STATE" | undefined;
    }>, "many">;
    statutoryRegulatoryAttestation: z.ZodOptional<z.ZodBoolean>;
    statutoryRegulatoryAttestationDescription: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "DRAFT";
    id: string;
    addtlActuaryContacts: {
        name?: string | undefined;
        id?: string | undefined;
        titleRole?: string | undefined;
        email?: string | undefined;
        actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
        actuarialFirmOther?: string | undefined;
    }[];
    createdAt: Date;
    updatedAt: Date;
    stateCode: string;
    stateNumber: number;
    programIDs: string[];
    submissionType: "CONTRACT_ONLY" | "CONTRACT_AND_RATES";
    submissionDescription: string;
    stateContacts: {
        name?: string | undefined;
        titleRole?: string | undefined;
        email?: string | undefined;
    }[];
    documents: {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }[];
    contractDocuments: {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }[];
    managedCareEntities: string[];
    federalAuthorities: ("STATE_PLAN" | "WAIVER_1915B" | "WAIVER_1115" | "VOLUNTARY" | "BENCHMARK" | "TITLE_XXI")[];
    rateInfos: {
        rateProgramIDs: string[];
        actuaryContacts: {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }[];
        packagesWithSharedRateCerts: {
            packageName: string;
            packageId: string;
        }[];
        rateType?: "AMENDMENT" | "NEW" | undefined;
        rateAmendmentInfo?: {
            effectiveDateEnd?: Date | undefined;
            effectiveDateStart?: Date | undefined;
        } | undefined;
        rateDateCertified?: Date | undefined;
        rateDateEnd?: Date | undefined;
        rateDateStart?: Date | undefined;
        id?: string | undefined;
        rateCapitationType?: "RATE_CELL" | "RATE_RANGE" | undefined;
        rateDocuments?: {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }[] | undefined;
        supportingDocuments?: {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }[] | undefined;
        rateCertificationName?: string | undefined;
        addtlActuaryContacts?: {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }[] | undefined;
        actuaryCommunicationPreference?: "OACT_TO_ACTUARY" | "OACT_TO_STATE" | undefined;
    }[];
    populationCovered?: "MEDICAID" | "CHIP" | "MEDICAID_AND_CHIP" | undefined;
    riskBasedContract?: boolean | undefined;
    addtlActuaryCommunicationPreference?: "OACT_TO_ACTUARY" | "OACT_TO_STATE" | undefined;
    contractType?: "BASE" | "AMENDMENT" | undefined;
    contractExecutionStatus?: "EXECUTED" | "UNEXECUTED" | undefined;
    contractDateStart?: Date | undefined;
    contractDateEnd?: Date | undefined;
    contractAmendmentInfo?: {
        modifiedProvisions: {
            modifiedBenefitsProvided?: boolean | undefined;
            modifiedGeoAreaServed?: boolean | undefined;
            modifiedMedicaidBeneficiaries?: boolean | undefined;
            modifiedEnrollmentProcess?: boolean | undefined;
            modifiedMedicalLossRatioStandards?: boolean | undefined;
            modifiedGrevienceAndAppeal?: boolean | undefined;
            modifiedNetworkAdequacyStandards?: boolean | undefined;
            modifiedLengthOfContract?: boolean | undefined;
            modifiedNonRiskPaymentArrangements?: boolean | undefined;
            inLieuServicesAndSettings?: boolean | undefined;
            modifiedRiskSharingStrategy?: boolean | undefined;
            modifiedIncentiveArrangements?: boolean | undefined;
            modifiedWitholdAgreements?: boolean | undefined;
            modifiedStateDirectedPayments?: boolean | undefined;
            modifiedPassThroughPayments?: boolean | undefined;
            modifiedPaymentsForMentalDiseaseInstitutions?: boolean | undefined;
            modifiedOtherFinancialPaymentIncentive?: boolean | undefined;
        };
    } | undefined;
    statutoryRegulatoryAttestation?: boolean | undefined;
    statutoryRegulatoryAttestationDescription?: string | undefined;
}, {
    status: "DRAFT";
    id: string;
    addtlActuaryContacts: {
        name?: string | undefined;
        id?: string | undefined;
        titleRole?: string | undefined;
        email?: string | undefined;
        actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
        actuarialFirmOther?: string | undefined;
    }[];
    createdAt: Date;
    updatedAt: Date;
    stateCode: string;
    stateNumber: number;
    programIDs: string[];
    submissionType: "CONTRACT_ONLY" | "CONTRACT_AND_RATES";
    submissionDescription: string;
    stateContacts: {
        name?: string | undefined;
        titleRole?: string | undefined;
        email?: string | undefined;
    }[];
    documents: {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }[];
    contractDocuments: {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }[];
    managedCareEntities: string[];
    federalAuthorities: ("STATE_PLAN" | "WAIVER_1915B" | "WAIVER_1115" | "VOLUNTARY" | "BENCHMARK" | "TITLE_XXI")[];
    rateInfos: {
        rateProgramIDs: string[];
        actuaryContacts: {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }[];
        packagesWithSharedRateCerts: {
            packageName: string;
            packageId: string;
        }[];
        rateType?: "AMENDMENT" | "NEW" | undefined;
        rateAmendmentInfo?: {
            effectiveDateEnd?: Date | undefined;
            effectiveDateStart?: Date | undefined;
        } | undefined;
        rateDateCertified?: Date | undefined;
        rateDateEnd?: Date | undefined;
        rateDateStart?: Date | undefined;
        id?: string | undefined;
        rateCapitationType?: "RATE_CELL" | "RATE_RANGE" | undefined;
        rateDocuments?: {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }[] | undefined;
        supportingDocuments?: {
            name: string;
            s3URL: string;
            sha256?: string | undefined;
            id?: string | undefined;
        }[] | undefined;
        rateCertificationName?: string | undefined;
        addtlActuaryContacts?: {
            name?: string | undefined;
            id?: string | undefined;
            titleRole?: string | undefined;
            email?: string | undefined;
            actuarialFirm?: "MERCER" | "MILLIMAN" | "OPTUMAS" | "GUIDEHOUSE" | "DELOITTE" | "STATE_IN_HOUSE" | "OTHER" | undefined;
            actuarialFirmOther?: string | undefined;
        }[] | undefined;
        actuaryCommunicationPreference?: "OACT_TO_ACTUARY" | "OACT_TO_STATE" | undefined;
    }[];
    populationCovered?: "MEDICAID" | "CHIP" | "MEDICAID_AND_CHIP" | undefined;
    riskBasedContract?: boolean | undefined;
    addtlActuaryCommunicationPreference?: "OACT_TO_ACTUARY" | "OACT_TO_STATE" | undefined;
    contractType?: "BASE" | "AMENDMENT" | undefined;
    contractExecutionStatus?: "EXECUTED" | "UNEXECUTED" | undefined;
    contractDateStart?: Date | undefined;
    contractDateEnd?: Date | undefined;
    contractAmendmentInfo?: {
        modifiedProvisions: {
            modifiedBenefitsProvided?: boolean | undefined;
            modifiedGeoAreaServed?: boolean | undefined;
            modifiedMedicaidBeneficiaries?: boolean | undefined;
            modifiedEnrollmentProcess?: boolean | undefined;
            modifiedMedicalLossRatioStandards?: boolean | undefined;
            modifiedGrevienceAndAppeal?: boolean | undefined;
            modifiedNetworkAdequacyStandards?: boolean | undefined;
            modifiedLengthOfContract?: boolean | undefined;
            modifiedNonRiskPaymentArrangements?: boolean | undefined;
            inLieuServicesAndSettings?: boolean | undefined;
            modifiedRiskSharingStrategy?: boolean | undefined;
            modifiedIncentiveArrangements?: boolean | undefined;
            modifiedWitholdAgreements?: boolean | undefined;
            modifiedStateDirectedPayments?: boolean | undefined;
            modifiedPassThroughPayments?: boolean | undefined;
            modifiedPaymentsForMentalDiseaseInstitutions?: boolean | undefined;
            modifiedOtherFinancialPaymentIncentive?: boolean | undefined;
        };
    } | undefined;
    statutoryRegulatoryAttestation?: boolean | undefined;
    statutoryRegulatoryAttestationDescription?: string | undefined;
}>;
declare const lockedHealthPlanFormDataZodSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    status: z.ZodLiteral<"SUBMITTED">;
    stateCode: z.ZodString;
    stateNumber: z.ZodNumber;
    programIDs: z.ZodArray<z.ZodString, "many">;
    submissionType: z.ZodUnion<[z.ZodLiteral<"CONTRACT_ONLY">, z.ZodLiteral<"CONTRACT_AND_RATES">]>;
    submissionDescription: z.ZodString;
    contractDocuments: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        s3URL: z.ZodString;
        sha256: z.ZodOptional<z.ZodString>;
        id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }, {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "SUBMITTED";
    id: string;
    createdAt: Date;
    updatedAt: Date;
    stateCode: string;
    stateNumber: number;
    programIDs: string[];
    submissionType: "CONTRACT_ONLY" | "CONTRACT_AND_RATES";
    submissionDescription: string;
    contractDocuments: {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }[];
}, {
    status: "SUBMITTED";
    id: string;
    createdAt: Date;
    updatedAt: Date;
    stateCode: string;
    stateNumber: number;
    programIDs: string[];
    submissionType: "CONTRACT_ONLY" | "CONTRACT_AND_RATES";
    submissionDescription: string;
    contractDocuments: {
        name: string;
        s3URL: string;
        sha256?: string | undefined;
        id?: string | undefined;
    }[];
}>;
export { unlockedHealthPlanFormDataZodSchema, lockedHealthPlanFormDataZodSchema, rateCapitationTypeSchema, rateTypeSchema, sharedRateCertDisplay, actuaryContactSchema, stateContactSchema, federalAuthoritySchema, actuaryCommunicationTypeSchema, actuarialFirmTypeSchema, contractExecutionStatusSchema, contractTypeSchema, rateAmendmentInfoSchema, submissionDocumentSchema, capitationRatesAmendedReasonSchema, populationCoveredSchema, submissionTypeSchema, };
