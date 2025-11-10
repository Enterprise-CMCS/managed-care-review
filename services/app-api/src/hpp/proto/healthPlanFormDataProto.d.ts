import type * as $protobuf from 'protobufjs'
import Long = require('long')
/** Namespace mcreviewproto. */
export namespace mcreviewproto {
    /** Properties of a HealthPlanFormData. */
    interface IHealthPlanFormData {
        /** HealthPlanFormData protoName */
        protoName?: string | null

        /** HealthPlanFormData protoVersion */
        protoVersion?: number | null

        /** HealthPlanFormData id */
        id?: string | null

        /** HealthPlanFormData status */
        status?: string | null

        /** HealthPlanFormData createdAt */
        createdAt?: mcreviewproto.IDate | null

        /** HealthPlanFormData updatedAt */
        updatedAt?: google.protobuf.ITimestamp | null

        /** HealthPlanFormData submittedAt */
        submittedAt?: google.protobuf.ITimestamp | null

        /** HealthPlanFormData submissionStatus */
        submissionStatus?: mcreviewproto.SubmissionStatus | null

        /** HealthPlanFormData stateCode */
        stateCode?: mcreviewproto.StateCode | null

        /** HealthPlanFormData stateNumber */
        stateNumber?: number | null

        /** HealthPlanFormData programIds */
        programIds?: string[] | null

        /** HealthPlanFormData submissionType */
        submissionType?: mcreviewproto.SubmissionType | null

        /** HealthPlanFormData submissionDescription */
        submissionDescription?: string | null

        /** HealthPlanFormData stateContacts */
        stateContacts?: mcreviewproto.IContact[] | null

        /** HealthPlanFormData contractInfo */
        contractInfo?: mcreviewproto.IContractInfo | null

        /** HealthPlanFormData documents */
        documents?: mcreviewproto.IDocument[] | null

        /** HealthPlanFormData addtlActuaryContacts */
        addtlActuaryContacts?: mcreviewproto.IActuaryContact[] | null

        /** HealthPlanFormData addtlActuaryCommunicationPreference */
        addtlActuaryCommunicationPreference?: mcreviewproto.ActuaryCommunicationType | null

        /** HealthPlanFormData riskBasedContract */
        riskBasedContract?: boolean | null

        /** HealthPlanFormData populationCovered */
        populationCovered?: mcreviewproto.PopulationCovered | null

        /** HealthPlanFormData rateInfos */
        rateInfos?: mcreviewproto.IRateInfo[] | null
    }

    /** Represents a HealthPlanFormData. */
    class HealthPlanFormData implements IHealthPlanFormData {
        /**
         * Constructs a new HealthPlanFormData.
         * @param [properties] Properties to set
         */
        constructor(properties?: mcreviewproto.IHealthPlanFormData)

        /** HealthPlanFormData protoName. */
        public protoName?: string | null

        /** HealthPlanFormData protoVersion. */
        public protoVersion?: number | null

        /** HealthPlanFormData id. */
        public id?: string | null

        /** HealthPlanFormData status. */
        public status?: string | null

        /** HealthPlanFormData createdAt. */
        public createdAt?: mcreviewproto.IDate | null

        /** HealthPlanFormData updatedAt. */
        public updatedAt?: google.protobuf.ITimestamp | null

        /** HealthPlanFormData submittedAt. */
        public submittedAt?: google.protobuf.ITimestamp | null

        /** HealthPlanFormData submissionStatus. */
        public submissionStatus?: mcreviewproto.SubmissionStatus | null

        /** HealthPlanFormData stateCode. */
        public stateCode?: mcreviewproto.StateCode | null

        /** HealthPlanFormData stateNumber. */
        public stateNumber?: number | null

        /** HealthPlanFormData programIds. */
        public programIds: string[]

        /** HealthPlanFormData submissionType. */
        public submissionType?: mcreviewproto.SubmissionType | null

        /** HealthPlanFormData submissionDescription. */
        public submissionDescription?: string | null

        /** HealthPlanFormData stateContacts. */
        public stateContacts: mcreviewproto.IContact[]

        /** HealthPlanFormData contractInfo. */
        public contractInfo?: mcreviewproto.IContractInfo | null

        /** HealthPlanFormData documents. */
        public documents: mcreviewproto.IDocument[]

        /** HealthPlanFormData addtlActuaryContacts. */
        public addtlActuaryContacts: mcreviewproto.IActuaryContact[]

        /** HealthPlanFormData addtlActuaryCommunicationPreference. */
        public addtlActuaryCommunicationPreference?: mcreviewproto.ActuaryCommunicationType | null

        /** HealthPlanFormData riskBasedContract. */
        public riskBasedContract?: boolean | null

        /** HealthPlanFormData populationCovered. */
        public populationCovered?: mcreviewproto.PopulationCovered | null

        /** HealthPlanFormData rateInfos. */
        public rateInfos: mcreviewproto.IRateInfo[]

        /** HealthPlanFormData _protoName. */
        public _protoName?: 'protoName'

        /** HealthPlanFormData _protoVersion. */
        public _protoVersion?: 'protoVersion'

        /** HealthPlanFormData _id. */
        public _id?: 'id'

        /** HealthPlanFormData _status. */
        public _status?: 'status'

        /** HealthPlanFormData _createdAt. */
        public _createdAt?: 'createdAt'

        /** HealthPlanFormData _updatedAt. */
        public _updatedAt?: 'updatedAt'

        /** HealthPlanFormData _submittedAt. */
        public _submittedAt?: 'submittedAt'

        /** HealthPlanFormData _submissionStatus. */
        public _submissionStatus?: 'submissionStatus'

        /** HealthPlanFormData _stateCode. */
        public _stateCode?: 'stateCode'

        /** HealthPlanFormData _stateNumber. */
        public _stateNumber?: 'stateNumber'

        /** HealthPlanFormData _submissionType. */
        public _submissionType?: 'submissionType'

        /** HealthPlanFormData _submissionDescription. */
        public _submissionDescription?: 'submissionDescription'

        /** HealthPlanFormData _contractInfo. */
        public _contractInfo?: 'contractInfo'

        /** HealthPlanFormData _addtlActuaryCommunicationPreference. */
        public _addtlActuaryCommunicationPreference?: 'addtlActuaryCommunicationPreference'

        /** HealthPlanFormData _riskBasedContract. */
        public _riskBasedContract?: 'riskBasedContract'

        /** HealthPlanFormData _populationCovered. */
        public _populationCovered?: 'populationCovered'

        /**
         * Creates a new HealthPlanFormData instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HealthPlanFormData instance
         */
        public static create(
            properties?: mcreviewproto.IHealthPlanFormData
        ): mcreviewproto.HealthPlanFormData

        /**
         * Encodes the specified HealthPlanFormData message. Does not implicitly {@link mcreviewproto.HealthPlanFormData.verify|verify} messages.
         * @param message HealthPlanFormData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(
            message: mcreviewproto.IHealthPlanFormData,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Encodes the specified HealthPlanFormData message, length delimited. Does not implicitly {@link mcreviewproto.HealthPlanFormData.verify|verify} messages.
         * @param message HealthPlanFormData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(
            message: mcreviewproto.IHealthPlanFormData,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Decodes a HealthPlanFormData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns HealthPlanFormData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
            reader: $protobuf.Reader | Uint8Array,
            length?: number
        ): mcreviewproto.HealthPlanFormData

        /**
         * Decodes a HealthPlanFormData message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns HealthPlanFormData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(
            reader: $protobuf.Reader | Uint8Array
        ): mcreviewproto.HealthPlanFormData

        /**
         * Verifies a HealthPlanFormData message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string | null

        /**
         * Creates a HealthPlanFormData message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns HealthPlanFormData
         */
        public static fromObject(object: {
            [k: string]: any
        }): mcreviewproto.HealthPlanFormData

        /**
         * Creates a plain object from a HealthPlanFormData message. Also converts values to other types if specified.
         * @param message HealthPlanFormData
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(
            message: mcreviewproto.HealthPlanFormData,
            options?: $protobuf.IConversionOptions
        ): { [k: string]: any }

        /**
         * Converts this HealthPlanFormData to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any }

        /**
         * Gets the default type url for HealthPlanFormData
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string
    }

    /** Submission related enums */
    enum SubmissionType {
        SUBMISSION_TYPE_UNSPECIFIED = 0,
        SUBMISSION_TYPE_CONTRACT_ONLY = 1,
        SUBMISSION_TYPE_CONTRACT_AND_RATES = 3,
    }

    /** Properties of a Date. */
    interface IDate {
        /** Date year */
        year?: number | null

        /** Date month */
        month?: number | null

        /** Date day */
        day?: number | null
    }

    /** Represents a Date. */
    class Date implements IDate {
        /**
         * Constructs a new Date.
         * @param [properties] Properties to set
         */
        constructor(properties?: mcreviewproto.IDate)

        /** Date year. */
        public year?: number | null

        /** Date month. */
        public month?: number | null

        /** Date day. */
        public day?: number | null

        /** Date _year. */
        public _year?: 'year'

        /** Date _month. */
        public _month?: 'month'

        /** Date _day. */
        public _day?: 'day'

        /**
         * Creates a new Date instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Date instance
         */
        public static create(
            properties?: mcreviewproto.IDate
        ): mcreviewproto.Date

        /**
         * Encodes the specified Date message. Does not implicitly {@link mcreviewproto.Date.verify|verify} messages.
         * @param message Date message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(
            message: mcreviewproto.IDate,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Encodes the specified Date message, length delimited. Does not implicitly {@link mcreviewproto.Date.verify|verify} messages.
         * @param message Date message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(
            message: mcreviewproto.IDate,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Decodes a Date message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Date
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
            reader: $protobuf.Reader | Uint8Array,
            length?: number
        ): mcreviewproto.Date

        /**
         * Decodes a Date message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Date
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(
            reader: $protobuf.Reader | Uint8Array
        ): mcreviewproto.Date

        /**
         * Verifies a Date message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string | null

        /**
         * Creates a Date message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Date
         */
        public static fromObject(object: {
            [k: string]: any
        }): mcreviewproto.Date

        /**
         * Creates a plain object from a Date message. Also converts values to other types if specified.
         * @param message Date
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(
            message: mcreviewproto.Date,
            options?: $protobuf.IConversionOptions
        ): { [k: string]: any }

        /**
         * Converts this Date to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any }

        /**
         * Gets the default type url for Date
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string
    }

    /** SubmissionStatus enum. */
    enum SubmissionStatus {
        SUBMISSION_STATUS_UNSPECIFIED = 0,
        SUBMISSION_STATUS_DRAFT = 1,
        SUBMISSION_STATUS_SUBMITTED = 2,
    }

    /** PopulationCovered enum. */
    enum PopulationCovered {
        POPULATION_COVERED_UNSPECIFIED = 0,
        POPULATION_COVERED_MEDICAID = 1,
        POPULATION_COVERED_CHIP = 2,
        POPULATION_COVERED_MEDICAID_AND_CHIP = 3,
    }

    /** Properties of a Contact. */
    interface IContact {
        /** Contact name */
        name?: string | null

        /** Contact titleRole */
        titleRole?: string | null

        /** Contact email */
        email?: string | null

        /** Contact id */
        id?: string | null
    }

    /** Represents a Contact. */
    class Contact implements IContact {
        /**
         * Constructs a new Contact.
         * @param [properties] Properties to set
         */
        constructor(properties?: mcreviewproto.IContact)

        /** Contact name. */
        public name?: string | null

        /** Contact titleRole. */
        public titleRole?: string | null

        /** Contact email. */
        public email?: string | null

        /** Contact id. */
        public id?: string | null

        /** Contact _name. */
        public _name?: 'name'

        /** Contact _titleRole. */
        public _titleRole?: 'titleRole'

        /** Contact _email. */
        public _email?: 'email'

        /** Contact _id. */
        public _id?: 'id'

        /**
         * Creates a new Contact instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Contact instance
         */
        public static create(
            properties?: mcreviewproto.IContact
        ): mcreviewproto.Contact

        /**
         * Encodes the specified Contact message. Does not implicitly {@link mcreviewproto.Contact.verify|verify} messages.
         * @param message Contact message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(
            message: mcreviewproto.IContact,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Encodes the specified Contact message, length delimited. Does not implicitly {@link mcreviewproto.Contact.verify|verify} messages.
         * @param message Contact message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(
            message: mcreviewproto.IContact,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Decodes a Contact message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Contact
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
            reader: $protobuf.Reader | Uint8Array,
            length?: number
        ): mcreviewproto.Contact

        /**
         * Decodes a Contact message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Contact
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(
            reader: $protobuf.Reader | Uint8Array
        ): mcreviewproto.Contact

        /**
         * Verifies a Contact message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string | null

        /**
         * Creates a Contact message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Contact
         */
        public static fromObject(object: {
            [k: string]: any
        }): mcreviewproto.Contact

        /**
         * Creates a plain object from a Contact message. Also converts values to other types if specified.
         * @param message Contact
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(
            message: mcreviewproto.Contact,
            options?: $protobuf.IConversionOptions
        ): { [k: string]: any }

        /**
         * Converts this Contact to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any }

        /**
         * Gets the default type url for Contact
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string
    }

    /** Properties of a ContractInfo. */
    interface IContractInfo {
        /** ContractInfo contractType */
        contractType?: mcreviewproto.ContractType | null

        /** ContractInfo contractDateStart */
        contractDateStart?: mcreviewproto.IDate | null

        /** ContractInfo contractDateEnd */
        contractDateEnd?: mcreviewproto.IDate | null

        /** ContractInfo managedCareEntities */
        managedCareEntities?: mcreviewproto.ManagedCareEntity[] | null

        /** ContractInfo federalAuthorities */
        federalAuthorities?: mcreviewproto.FederalAuthority[] | null

        /** ContractInfo contractDocuments */
        contractDocuments?: mcreviewproto.IDocument[] | null

        /** ContractInfo contractExecutionStatus */
        contractExecutionStatus?: mcreviewproto.ContractExecutionStatus | null

        /** ContractInfo statutoryRegulatoryAttestation */
        statutoryRegulatoryAttestation?: boolean | null

        /** ContractInfo statutoryRegulatoryAttestationDescription */
        statutoryRegulatoryAttestationDescription?: string | null

        /** ContractInfo contractAmendmentInfo */
        contractAmendmentInfo?: mcreviewproto.ContractInfo.IContractAmendmentInfo | null
    }

    /** Represents a ContractInfo. */
    class ContractInfo implements IContractInfo {
        /**
         * Constructs a new ContractInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: mcreviewproto.IContractInfo)

        /** ContractInfo contractType. */
        public contractType?: mcreviewproto.ContractType | null

        /** ContractInfo contractDateStart. */
        public contractDateStart?: mcreviewproto.IDate | null

        /** ContractInfo contractDateEnd. */
        public contractDateEnd?: mcreviewproto.IDate | null

        /** ContractInfo managedCareEntities. */
        public managedCareEntities: mcreviewproto.ManagedCareEntity[]

        /** ContractInfo federalAuthorities. */
        public federalAuthorities: mcreviewproto.FederalAuthority[]

        /** ContractInfo contractDocuments. */
        public contractDocuments: mcreviewproto.IDocument[]

        /** ContractInfo contractExecutionStatus. */
        public contractExecutionStatus?: mcreviewproto.ContractExecutionStatus | null

        /** ContractInfo statutoryRegulatoryAttestation. */
        public statutoryRegulatoryAttestation?: boolean | null

        /** ContractInfo statutoryRegulatoryAttestationDescription. */
        public statutoryRegulatoryAttestationDescription?: string | null

        /** ContractInfo contractAmendmentInfo. */
        public contractAmendmentInfo?: mcreviewproto.ContractInfo.IContractAmendmentInfo | null

        /** ContractInfo _contractType. */
        public _contractType?: 'contractType'

        /** ContractInfo _contractDateStart. */
        public _contractDateStart?: 'contractDateStart'

        /** ContractInfo _contractDateEnd. */
        public _contractDateEnd?: 'contractDateEnd'

        /** ContractInfo _contractExecutionStatus. */
        public _contractExecutionStatus?: 'contractExecutionStatus'

        /** ContractInfo _statutoryRegulatoryAttestation. */
        public _statutoryRegulatoryAttestation?: 'statutoryRegulatoryAttestation'

        /** ContractInfo _statutoryRegulatoryAttestationDescription. */
        public _statutoryRegulatoryAttestationDescription?: 'statutoryRegulatoryAttestationDescription'

        /** ContractInfo _contractAmendmentInfo. */
        public _contractAmendmentInfo?: 'contractAmendmentInfo'

        /**
         * Creates a new ContractInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ContractInfo instance
         */
        public static create(
            properties?: mcreviewproto.IContractInfo
        ): mcreviewproto.ContractInfo

        /**
         * Encodes the specified ContractInfo message. Does not implicitly {@link mcreviewproto.ContractInfo.verify|verify} messages.
         * @param message ContractInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(
            message: mcreviewproto.IContractInfo,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Encodes the specified ContractInfo message, length delimited. Does not implicitly {@link mcreviewproto.ContractInfo.verify|verify} messages.
         * @param message ContractInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(
            message: mcreviewproto.IContractInfo,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Decodes a ContractInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ContractInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
            reader: $protobuf.Reader | Uint8Array,
            length?: number
        ): mcreviewproto.ContractInfo

        /**
         * Decodes a ContractInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ContractInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(
            reader: $protobuf.Reader | Uint8Array
        ): mcreviewproto.ContractInfo

        /**
         * Verifies a ContractInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string | null

        /**
         * Creates a ContractInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ContractInfo
         */
        public static fromObject(object: {
            [k: string]: any
        }): mcreviewproto.ContractInfo

        /**
         * Creates a plain object from a ContractInfo message. Also converts values to other types if specified.
         * @param message ContractInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(
            message: mcreviewproto.ContractInfo,
            options?: $protobuf.IConversionOptions
        ): { [k: string]: any }

        /**
         * Converts this ContractInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any }

        /**
         * Gets the default type url for ContractInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string
    }

    namespace ContractInfo {
        /** Properties of a ContractAmendmentInfo. */
        interface IContractAmendmentInfo {
            /** ContractAmendmentInfo amendableItems */
            amendableItems?: mcreviewproto.AmendedItem[] | null

            /** ContractAmendmentInfo otherAmendableItem */
            otherAmendableItem?: string | null

            /** ContractAmendmentInfo capitationRatesAmendedInfo */
            capitationRatesAmendedInfo?: mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo | null

            /** ContractAmendmentInfo modifiedProvisions */
            modifiedProvisions?: mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions | null
        }

        /** Represents a ContractAmendmentInfo. */
        class ContractAmendmentInfo implements IContractAmendmentInfo {
            /**
             * Constructs a new ContractAmendmentInfo.
             * @param [properties] Properties to set
             */
            constructor(
                properties?: mcreviewproto.ContractInfo.IContractAmendmentInfo
            )

            /** ContractAmendmentInfo amendableItems. */
            public amendableItems: mcreviewproto.AmendedItem[]

            /** ContractAmendmentInfo otherAmendableItem. */
            public otherAmendableItem?: string | null

            /** ContractAmendmentInfo capitationRatesAmendedInfo. */
            public capitationRatesAmendedInfo?: mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo | null

            /** ContractAmendmentInfo modifiedProvisions. */
            public modifiedProvisions?: mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions | null

            /** ContractAmendmentInfo _otherAmendableItem. */
            public _otherAmendableItem?: 'otherAmendableItem'

            /** ContractAmendmentInfo _capitationRatesAmendedInfo. */
            public _capitationRatesAmendedInfo?: 'capitationRatesAmendedInfo'

            /** ContractAmendmentInfo _modifiedProvisions. */
            public _modifiedProvisions?: 'modifiedProvisions'

            /**
             * Creates a new ContractAmendmentInfo instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ContractAmendmentInfo instance
             */
            public static create(
                properties?: mcreviewproto.ContractInfo.IContractAmendmentInfo
            ): mcreviewproto.ContractInfo.ContractAmendmentInfo

            /**
             * Encodes the specified ContractAmendmentInfo message. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.verify|verify} messages.
             * @param message ContractAmendmentInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(
                message: mcreviewproto.ContractInfo.IContractAmendmentInfo,
                writer?: $protobuf.Writer
            ): $protobuf.Writer

            /**
             * Encodes the specified ContractAmendmentInfo message, length delimited. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.verify|verify} messages.
             * @param message ContractAmendmentInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(
                message: mcreviewproto.ContractInfo.IContractAmendmentInfo,
                writer?: $protobuf.Writer
            ): $protobuf.Writer

            /**
             * Decodes a ContractAmendmentInfo message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ContractAmendmentInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(
                reader: $protobuf.Reader | Uint8Array,
                length?: number
            ): mcreviewproto.ContractInfo.ContractAmendmentInfo

            /**
             * Decodes a ContractAmendmentInfo message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ContractAmendmentInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(
                reader: $protobuf.Reader | Uint8Array
            ): mcreviewproto.ContractInfo.ContractAmendmentInfo

            /**
             * Verifies a ContractAmendmentInfo message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string | null

            /**
             * Creates a ContractAmendmentInfo message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ContractAmendmentInfo
             */
            public static fromObject(object: {
                [k: string]: any
            }): mcreviewproto.ContractInfo.ContractAmendmentInfo

            /**
             * Creates a plain object from a ContractAmendmentInfo message. Also converts values to other types if specified.
             * @param message ContractAmendmentInfo
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(
                message: mcreviewproto.ContractInfo.ContractAmendmentInfo,
                options?: $protobuf.IConversionOptions
            ): { [k: string]: any }

            /**
             * Converts this ContractAmendmentInfo to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any }

            /**
             * Gets the default type url for ContractAmendmentInfo
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string
        }

        namespace ContractAmendmentInfo {
            /** Properties of a CapitationRatesAmendedInfo. */
            interface ICapitationRatesAmendedInfo {
                /** CapitationRatesAmendedInfo reason */
                reason?: mcreviewproto.CapitationRateAmendmentReason | null

                /** CapitationRatesAmendedInfo otherReason */
                otherReason?: string | null
            }

            /** Represents a CapitationRatesAmendedInfo. */
            class CapitationRatesAmendedInfo
                implements ICapitationRatesAmendedInfo
            {
                /**
                 * Constructs a new CapitationRatesAmendedInfo.
                 * @param [properties] Properties to set
                 */
                constructor(
                    properties?: mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo
                )

                /** CapitationRatesAmendedInfo reason. */
                public reason?: mcreviewproto.CapitationRateAmendmentReason | null

                /** CapitationRatesAmendedInfo otherReason. */
                public otherReason?: string | null

                /** CapitationRatesAmendedInfo _reason. */
                public _reason?: 'reason'

                /** CapitationRatesAmendedInfo _otherReason. */
                public _otherReason?: 'otherReason'

                /**
                 * Creates a new CapitationRatesAmendedInfo instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns CapitationRatesAmendedInfo instance
                 */
                public static create(
                    properties?: mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo
                ): mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo

                /**
                 * Encodes the specified CapitationRatesAmendedInfo message. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo.verify|verify} messages.
                 * @param message CapitationRatesAmendedInfo message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(
                    message: mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo,
                    writer?: $protobuf.Writer
                ): $protobuf.Writer

                /**
                 * Encodes the specified CapitationRatesAmendedInfo message, length delimited. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo.verify|verify} messages.
                 * @param message CapitationRatesAmendedInfo message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(
                    message: mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo,
                    writer?: $protobuf.Writer
                ): $protobuf.Writer

                /**
                 * Decodes a CapitationRatesAmendedInfo message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns CapitationRatesAmendedInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(
                    reader: $protobuf.Reader | Uint8Array,
                    length?: number
                ): mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo

                /**
                 * Decodes a CapitationRatesAmendedInfo message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns CapitationRatesAmendedInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(
                    reader: $protobuf.Reader | Uint8Array
                ): mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo

                /**
                 * Verifies a CapitationRatesAmendedInfo message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: {
                    [k: string]: any
                }): string | null

                /**
                 * Creates a CapitationRatesAmendedInfo message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns CapitationRatesAmendedInfo
                 */
                public static fromObject(object: {
                    [k: string]: any
                }): mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo

                /**
                 * Creates a plain object from a CapitationRatesAmendedInfo message. Also converts values to other types if specified.
                 * @param message CapitationRatesAmendedInfo
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(
                    message: mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo,
                    options?: $protobuf.IConversionOptions
                ): { [k: string]: any }

                /**
                 * Converts this CapitationRatesAmendedInfo to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any }

                /**
                 * Gets the default type url for CapitationRatesAmendedInfo
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string
            }

            /** Properties of a ModifiedProvisions. */
            interface IModifiedProvisions {
                /** ModifiedProvisions modifiedBenefitsProvided */
                modifiedBenefitsProvided?: boolean | null

                /** ModifiedProvisions modifiedGeoAreaServed */
                modifiedGeoAreaServed?: boolean | null

                /** ModifiedProvisions modifiedMedicaidBeneficiaries */
                modifiedMedicaidBeneficiaries?: boolean | null

                /** ModifiedProvisions modifiedRiskSharingStrategy */
                modifiedRiskSharingStrategy?: boolean | null

                /** ModifiedProvisions modifiedIncentiveArrangements */
                modifiedIncentiveArrangements?: boolean | null

                /** ModifiedProvisions modifiedWitholdAgreements */
                modifiedWitholdAgreements?: boolean | null

                /** ModifiedProvisions modifiedStateDirectedPayments */
                modifiedStateDirectedPayments?: boolean | null

                /** ModifiedProvisions modifiedPassThroughPayments */
                modifiedPassThroughPayments?: boolean | null

                /** ModifiedProvisions modifiedPaymentsForMentalDiseaseInstitutions */
                modifiedPaymentsForMentalDiseaseInstitutions?: boolean | null

                /** ModifiedProvisions modifiedMedicalLossRatioStandards */
                modifiedMedicalLossRatioStandards?: boolean | null

                /** ModifiedProvisions modifiedOtherFinancialPaymentIncentive */
                modifiedOtherFinancialPaymentIncentive?: boolean | null

                /** ModifiedProvisions modifiedEnrollmentProcess */
                modifiedEnrollmentProcess?: boolean | null

                /** ModifiedProvisions modifiedGrevienceAndAppeal */
                modifiedGrevienceAndAppeal?: boolean | null

                /** ModifiedProvisions modifiedNetworkAdequacyStandards */
                modifiedNetworkAdequacyStandards?: boolean | null

                /** ModifiedProvisions modifiedLengthOfContract */
                modifiedLengthOfContract?: boolean | null

                /** ModifiedProvisions modifiedNonRiskPaymentArrangements */
                modifiedNonRiskPaymentArrangements?: boolean | null

                /** ModifiedProvisions inLieuServicesAndSettings */
                inLieuServicesAndSettings?: boolean | null
            }

            /** Represents a ModifiedProvisions. */
            class ModifiedProvisions implements IModifiedProvisions {
                /**
                 * Constructs a new ModifiedProvisions.
                 * @param [properties] Properties to set
                 */
                constructor(
                    properties?: mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions
                )

                /** ModifiedProvisions modifiedBenefitsProvided. */
                public modifiedBenefitsProvided?: boolean | null

                /** ModifiedProvisions modifiedGeoAreaServed. */
                public modifiedGeoAreaServed?: boolean | null

                /** ModifiedProvisions modifiedMedicaidBeneficiaries. */
                public modifiedMedicaidBeneficiaries?: boolean | null

                /** ModifiedProvisions modifiedRiskSharingStrategy. */
                public modifiedRiskSharingStrategy?: boolean | null

                /** ModifiedProvisions modifiedIncentiveArrangements. */
                public modifiedIncentiveArrangements?: boolean | null

                /** ModifiedProvisions modifiedWitholdAgreements. */
                public modifiedWitholdAgreements?: boolean | null

                /** ModifiedProvisions modifiedStateDirectedPayments. */
                public modifiedStateDirectedPayments?: boolean | null

                /** ModifiedProvisions modifiedPassThroughPayments. */
                public modifiedPassThroughPayments?: boolean | null

                /** ModifiedProvisions modifiedPaymentsForMentalDiseaseInstitutions. */
                public modifiedPaymentsForMentalDiseaseInstitutions?:
                    | boolean
                    | null

                /** ModifiedProvisions modifiedMedicalLossRatioStandards. */
                public modifiedMedicalLossRatioStandards?: boolean | null

                /** ModifiedProvisions modifiedOtherFinancialPaymentIncentive. */
                public modifiedOtherFinancialPaymentIncentive?: boolean | null

                /** ModifiedProvisions modifiedEnrollmentProcess. */
                public modifiedEnrollmentProcess?: boolean | null

                /** ModifiedProvisions modifiedGrevienceAndAppeal. */
                public modifiedGrevienceAndAppeal?: boolean | null

                /** ModifiedProvisions modifiedNetworkAdequacyStandards. */
                public modifiedNetworkAdequacyStandards?: boolean | null

                /** ModifiedProvisions modifiedLengthOfContract. */
                public modifiedLengthOfContract?: boolean | null

                /** ModifiedProvisions modifiedNonRiskPaymentArrangements. */
                public modifiedNonRiskPaymentArrangements?: boolean | null

                /** ModifiedProvisions inLieuServicesAndSettings. */
                public inLieuServicesAndSettings?: boolean | null

                /** ModifiedProvisions _modifiedBenefitsProvided. */
                public _modifiedBenefitsProvided?: 'modifiedBenefitsProvided'

                /** ModifiedProvisions _modifiedGeoAreaServed. */
                public _modifiedGeoAreaServed?: 'modifiedGeoAreaServed'

                /** ModifiedProvisions _modifiedMedicaidBeneficiaries. */
                public _modifiedMedicaidBeneficiaries?: 'modifiedMedicaidBeneficiaries'

                /** ModifiedProvisions _modifiedRiskSharingStrategy. */
                public _modifiedRiskSharingStrategy?: 'modifiedRiskSharingStrategy'

                /** ModifiedProvisions _modifiedIncentiveArrangements. */
                public _modifiedIncentiveArrangements?: 'modifiedIncentiveArrangements'

                /** ModifiedProvisions _modifiedWitholdAgreements. */
                public _modifiedWitholdAgreements?: 'modifiedWitholdAgreements'

                /** ModifiedProvisions _modifiedStateDirectedPayments. */
                public _modifiedStateDirectedPayments?: 'modifiedStateDirectedPayments'

                /** ModifiedProvisions _modifiedPassThroughPayments. */
                public _modifiedPassThroughPayments?: 'modifiedPassThroughPayments'

                /** ModifiedProvisions _modifiedPaymentsForMentalDiseaseInstitutions. */
                public _modifiedPaymentsForMentalDiseaseInstitutions?: 'modifiedPaymentsForMentalDiseaseInstitutions'

                /** ModifiedProvisions _modifiedMedicalLossRatioStandards. */
                public _modifiedMedicalLossRatioStandards?: 'modifiedMedicalLossRatioStandards'

                /** ModifiedProvisions _modifiedOtherFinancialPaymentIncentive. */
                public _modifiedOtherFinancialPaymentIncentive?: 'modifiedOtherFinancialPaymentIncentive'

                /** ModifiedProvisions _modifiedEnrollmentProcess. */
                public _modifiedEnrollmentProcess?: 'modifiedEnrollmentProcess'

                /** ModifiedProvisions _modifiedGrevienceAndAppeal. */
                public _modifiedGrevienceAndAppeal?: 'modifiedGrevienceAndAppeal'

                /** ModifiedProvisions _modifiedNetworkAdequacyStandards. */
                public _modifiedNetworkAdequacyStandards?: 'modifiedNetworkAdequacyStandards'

                /** ModifiedProvisions _modifiedLengthOfContract. */
                public _modifiedLengthOfContract?: 'modifiedLengthOfContract'

                /** ModifiedProvisions _modifiedNonRiskPaymentArrangements. */
                public _modifiedNonRiskPaymentArrangements?: 'modifiedNonRiskPaymentArrangements'

                /** ModifiedProvisions _inLieuServicesAndSettings. */
                public _inLieuServicesAndSettings?: 'inLieuServicesAndSettings'

                /**
                 * Creates a new ModifiedProvisions instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ModifiedProvisions instance
                 */
                public static create(
                    properties?: mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions
                ): mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions

                /**
                 * Encodes the specified ModifiedProvisions message. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions.verify|verify} messages.
                 * @param message ModifiedProvisions message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(
                    message: mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions,
                    writer?: $protobuf.Writer
                ): $protobuf.Writer

                /**
                 * Encodes the specified ModifiedProvisions message, length delimited. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions.verify|verify} messages.
                 * @param message ModifiedProvisions message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(
                    message: mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions,
                    writer?: $protobuf.Writer
                ): $protobuf.Writer

                /**
                 * Decodes a ModifiedProvisions message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ModifiedProvisions
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(
                    reader: $protobuf.Reader | Uint8Array,
                    length?: number
                ): mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions

                /**
                 * Decodes a ModifiedProvisions message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns ModifiedProvisions
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(
                    reader: $protobuf.Reader | Uint8Array
                ): mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions

                /**
                 * Verifies a ModifiedProvisions message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: {
                    [k: string]: any
                }): string | null

                /**
                 * Creates a ModifiedProvisions message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ModifiedProvisions
                 */
                public static fromObject(object: {
                    [k: string]: any
                }): mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions

                /**
                 * Creates a plain object from a ModifiedProvisions message. Also converts values to other types if specified.
                 * @param message ModifiedProvisions
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(
                    message: mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions,
                    options?: $protobuf.IConversionOptions
                ): { [k: string]: any }

                /**
                 * Converts this ModifiedProvisions to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any }

                /**
                 * Gets the default type url for ModifiedProvisions
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string
            }
        }
    }

    /** Contract related enums */
    enum AmendedItem {
        AMENDED_ITEM_UNSPECIFIED = 0,
        AMENDED_ITEM_BENEFITS_PROVIDED = 1,
        AMENDED_ITEM_CAPITATION_RATES = 2,
        AMENDED_ITEM_ENCOUNTER_DATA = 3,
        AMENDED_ITEM_ENROLLEE_ACCESS = 4,
        AMENDED_ITEM_ENROLLMENT_PROCESS = 5,
        AMENDED_ITEM_FINANCIAL_INCENTIVES = 6,
        AMENDED_ITEM_GEO_AREA_SERVED = 7,
        AMENDED_ITEM_GRIEVANCES_AND_APPEALS_SYSTEM = 8,
        AMENDED_ITEM_LENGTH_OF_CONTRACT_PERIOD = 9,
        AMENDED_ITEM_NON_RISK_PAYMENT = 10,
        AMENDED_ITEM_PROGRAM_INTEGRITY = 11,
        AMENDED_ITEM_QUALITY_STANDARDS = 12,
        AMENDED_ITEM_RISK_SHARING_MECHANISM = 13,
        AMENDED_ITEM_OTHER = 14,
    }

    /** CapitationRateAmendmentReason enum. */
    enum CapitationRateAmendmentReason {
        CAPITATION_RATE_AMENDMENT_REASON_UNSPECIFIED = 0,
        CAPITATION_RATE_AMENDMENT_REASON_ANNUAL = 1,
        CAPITATION_RATE_AMENDMENT_REASON_MIDYEAR = 2,
        CAPITATION_RATE_AMENDMENT_REASON_OTHER = 3,
    }

    /** ContractType enum. */
    enum ContractType {
        CONTRACT_TYPE_UNSPECIFIED = 0,
        CONTRACT_TYPE_BASE = 1,
        CONTRACT_TYPE_AMENDMENT = 2,
    }

    /** ContractExecutionStatus enum. */
    enum ContractExecutionStatus {
        CONTRACT_EXECUTION_STATUS_UNSPECIFIED = 0,
        CONTRACT_EXECUTION_STATUS_EXECUTED = 1,
        CONTRACT_EXECUTION_STATUS_UNEXECUTED = 2,
    }

    /** FederalAuthority enum. */
    enum FederalAuthority {
        FEDERAL_AUTHORITY_UNSPECIFIED = 0,
        FEDERAL_AUTHORITY_STATE_PLAN = 1,
        FEDERAL_AUTHORITY_WAIVER_1915B = 2,
        FEDERAL_AUTHORITY_WAIVER_1115 = 3,
        FEDERAL_AUTHORITY_VOLUNTARY = 4,
        FEDERAL_AUTHORITY_BENCHMARK = 5,
        FEDERAL_AUTHORITY_TITLE_XXI = 6,
    }

    /** ManagedCareEntity enum. */
    enum ManagedCareEntity {
        MANAGED_CARE_ENTITY_UNSPECIFIED = 0,
        MANAGED_CARE_ENTITY_MCO = 1,
        MANAGED_CARE_ENTITY_PIHP = 2,
        MANAGED_CARE_ENTITY_PAHP = 3,
        MANAGED_CARE_ENTITY_PCCM = 4,
    }

    /** Properties of a SharedRateCertDisplay. */
    interface ISharedRateCertDisplay {
        /** SharedRateCertDisplay packageId */
        packageId?: string | null

        /** SharedRateCertDisplay packageName */
        packageName?: string | null
    }

    /** Represents a SharedRateCertDisplay. */
    class SharedRateCertDisplay implements ISharedRateCertDisplay {
        /**
         * Constructs a new SharedRateCertDisplay.
         * @param [properties] Properties to set
         */
        constructor(properties?: mcreviewproto.ISharedRateCertDisplay)

        /** SharedRateCertDisplay packageId. */
        public packageId: string

        /** SharedRateCertDisplay packageName. */
        public packageName: string

        /**
         * Creates a new SharedRateCertDisplay instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SharedRateCertDisplay instance
         */
        public static create(
            properties?: mcreviewproto.ISharedRateCertDisplay
        ): mcreviewproto.SharedRateCertDisplay

        /**
         * Encodes the specified SharedRateCertDisplay message. Does not implicitly {@link mcreviewproto.SharedRateCertDisplay.verify|verify} messages.
         * @param message SharedRateCertDisplay message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(
            message: mcreviewproto.ISharedRateCertDisplay,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Encodes the specified SharedRateCertDisplay message, length delimited. Does not implicitly {@link mcreviewproto.SharedRateCertDisplay.verify|verify} messages.
         * @param message SharedRateCertDisplay message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(
            message: mcreviewproto.ISharedRateCertDisplay,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Decodes a SharedRateCertDisplay message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SharedRateCertDisplay
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
            reader: $protobuf.Reader | Uint8Array,
            length?: number
        ): mcreviewproto.SharedRateCertDisplay

        /**
         * Decodes a SharedRateCertDisplay message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SharedRateCertDisplay
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(
            reader: $protobuf.Reader | Uint8Array
        ): mcreviewproto.SharedRateCertDisplay

        /**
         * Verifies a SharedRateCertDisplay message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string | null

        /**
         * Creates a SharedRateCertDisplay message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SharedRateCertDisplay
         */
        public static fromObject(object: {
            [k: string]: any
        }): mcreviewproto.SharedRateCertDisplay

        /**
         * Creates a plain object from a SharedRateCertDisplay message. Also converts values to other types if specified.
         * @param message SharedRateCertDisplay
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(
            message: mcreviewproto.SharedRateCertDisplay,
            options?: $protobuf.IConversionOptions
        ): { [k: string]: any }

        /**
         * Converts this SharedRateCertDisplay to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any }

        /**
         * Gets the default type url for SharedRateCertDisplay
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string
    }

    /** Properties of a RateInfo. */
    interface IRateInfo {
        /** RateInfo id */
        id?: string | null

        /** RateInfo rateType */
        rateType?: mcreviewproto.RateType | null

        /** RateInfo rateDateStart */
        rateDateStart?: mcreviewproto.IDate | null

        /** RateInfo rateDateEnd */
        rateDateEnd?: mcreviewproto.IDate | null

        /** RateInfo rateDateCertified */
        rateDateCertified?: mcreviewproto.IDate | null

        /** RateInfo actuaryContacts */
        actuaryContacts?: mcreviewproto.IActuaryContact[] | null

        /** RateInfo actuaryCommunicationPreference */
        actuaryCommunicationPreference?: mcreviewproto.ActuaryCommunicationType | null

        /** RateInfo rateDocuments */
        rateDocuments?: mcreviewproto.IDocument[] | null

        /** RateInfo rateCapitationType */
        rateCapitationType?: mcreviewproto.RateCapitationType | null

        /** RateInfo rateProgramIds */
        rateProgramIds?: string[] | null

        /** RateInfo rateCertificationName */
        rateCertificationName?: string | null

        /** RateInfo packagesWithSharedRateCerts */
        packagesWithSharedRateCerts?:
            | mcreviewproto.ISharedRateCertDisplay[]
            | null

        /** RateInfo supportingDocuments */
        supportingDocuments?: mcreviewproto.IDocument[] | null

        /** RateInfo rateAmendmentInfo */
        rateAmendmentInfo?: mcreviewproto.RateInfo.IRateAmendmentInfo | null
    }

    /** Rate Info subtypes */
    class RateInfo implements IRateInfo {
        /**
         * Constructs a new RateInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: mcreviewproto.IRateInfo)

        /** RateInfo id. */
        public id?: string | null

        /** RateInfo rateType. */
        public rateType?: mcreviewproto.RateType | null

        /** RateInfo rateDateStart. */
        public rateDateStart?: mcreviewproto.IDate | null

        /** RateInfo rateDateEnd. */
        public rateDateEnd?: mcreviewproto.IDate | null

        /** RateInfo rateDateCertified. */
        public rateDateCertified?: mcreviewproto.IDate | null

        /** RateInfo actuaryContacts. */
        public actuaryContacts: mcreviewproto.IActuaryContact[]

        /** RateInfo actuaryCommunicationPreference. */
        public actuaryCommunicationPreference?: mcreviewproto.ActuaryCommunicationType | null

        /** RateInfo rateDocuments. */
        public rateDocuments: mcreviewproto.IDocument[]

        /** RateInfo rateCapitationType. */
        public rateCapitationType?: mcreviewproto.RateCapitationType | null

        /** RateInfo rateProgramIds. */
        public rateProgramIds: string[]

        /** RateInfo rateCertificationName. */
        public rateCertificationName?: string | null

        /** RateInfo packagesWithSharedRateCerts. */
        public packagesWithSharedRateCerts: mcreviewproto.ISharedRateCertDisplay[]

        /** RateInfo supportingDocuments. */
        public supportingDocuments: mcreviewproto.IDocument[]

        /** RateInfo rateAmendmentInfo. */
        public rateAmendmentInfo?: mcreviewproto.RateInfo.IRateAmendmentInfo | null

        /** RateInfo _id. */
        public _id?: 'id'

        /** RateInfo _rateType. */
        public _rateType?: 'rateType'

        /** RateInfo _rateDateStart. */
        public _rateDateStart?: 'rateDateStart'

        /** RateInfo _rateDateEnd. */
        public _rateDateEnd?: 'rateDateEnd'

        /** RateInfo _rateDateCertified. */
        public _rateDateCertified?: 'rateDateCertified'

        /** RateInfo _actuaryCommunicationPreference. */
        public _actuaryCommunicationPreference?: 'actuaryCommunicationPreference'

        /** RateInfo _rateCapitationType. */
        public _rateCapitationType?: 'rateCapitationType'

        /** RateInfo _rateCertificationName. */
        public _rateCertificationName?: 'rateCertificationName'

        /** RateInfo _rateAmendmentInfo. */
        public _rateAmendmentInfo?: 'rateAmendmentInfo'

        /**
         * Creates a new RateInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RateInfo instance
         */
        public static create(
            properties?: mcreviewproto.IRateInfo
        ): mcreviewproto.RateInfo

        /**
         * Encodes the specified RateInfo message. Does not implicitly {@link mcreviewproto.RateInfo.verify|verify} messages.
         * @param message RateInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(
            message: mcreviewproto.IRateInfo,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Encodes the specified RateInfo message, length delimited. Does not implicitly {@link mcreviewproto.RateInfo.verify|verify} messages.
         * @param message RateInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(
            message: mcreviewproto.IRateInfo,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Decodes a RateInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RateInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
            reader: $protobuf.Reader | Uint8Array,
            length?: number
        ): mcreviewproto.RateInfo

        /**
         * Decodes a RateInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RateInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(
            reader: $protobuf.Reader | Uint8Array
        ): mcreviewproto.RateInfo

        /**
         * Verifies a RateInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string | null

        /**
         * Creates a RateInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RateInfo
         */
        public static fromObject(object: {
            [k: string]: any
        }): mcreviewproto.RateInfo

        /**
         * Creates a plain object from a RateInfo message. Also converts values to other types if specified.
         * @param message RateInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(
            message: mcreviewproto.RateInfo,
            options?: $protobuf.IConversionOptions
        ): { [k: string]: any }

        /**
         * Converts this RateInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any }

        /**
         * Gets the default type url for RateInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string
    }

    namespace RateInfo {
        /** Properties of a RateAmendmentInfo. */
        interface IRateAmendmentInfo {
            /** RateAmendmentInfo effectiveDateStart */
            effectiveDateStart?: mcreviewproto.IDate | null

            /** RateAmendmentInfo effectiveDateEnd */
            effectiveDateEnd?: mcreviewproto.IDate | null
        }

        /** Represents a RateAmendmentInfo. */
        class RateAmendmentInfo implements IRateAmendmentInfo {
            /**
             * Constructs a new RateAmendmentInfo.
             * @param [properties] Properties to set
             */
            constructor(properties?: mcreviewproto.RateInfo.IRateAmendmentInfo)

            /** RateAmendmentInfo effectiveDateStart. */
            public effectiveDateStart?: mcreviewproto.IDate | null

            /** RateAmendmentInfo effectiveDateEnd. */
            public effectiveDateEnd?: mcreviewproto.IDate | null

            /** RateAmendmentInfo _effectiveDateStart. */
            public _effectiveDateStart?: 'effectiveDateStart'

            /** RateAmendmentInfo _effectiveDateEnd. */
            public _effectiveDateEnd?: 'effectiveDateEnd'

            /**
             * Creates a new RateAmendmentInfo instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RateAmendmentInfo instance
             */
            public static create(
                properties?: mcreviewproto.RateInfo.IRateAmendmentInfo
            ): mcreviewproto.RateInfo.RateAmendmentInfo

            /**
             * Encodes the specified RateAmendmentInfo message. Does not implicitly {@link mcreviewproto.RateInfo.RateAmendmentInfo.verify|verify} messages.
             * @param message RateAmendmentInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(
                message: mcreviewproto.RateInfo.IRateAmendmentInfo,
                writer?: $protobuf.Writer
            ): $protobuf.Writer

            /**
             * Encodes the specified RateAmendmentInfo message, length delimited. Does not implicitly {@link mcreviewproto.RateInfo.RateAmendmentInfo.verify|verify} messages.
             * @param message RateAmendmentInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(
                message: mcreviewproto.RateInfo.IRateAmendmentInfo,
                writer?: $protobuf.Writer
            ): $protobuf.Writer

            /**
             * Decodes a RateAmendmentInfo message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RateAmendmentInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(
                reader: $protobuf.Reader | Uint8Array,
                length?: number
            ): mcreviewproto.RateInfo.RateAmendmentInfo

            /**
             * Decodes a RateAmendmentInfo message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RateAmendmentInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(
                reader: $protobuf.Reader | Uint8Array
            ): mcreviewproto.RateInfo.RateAmendmentInfo

            /**
             * Verifies a RateAmendmentInfo message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string | null

            /**
             * Creates a RateAmendmentInfo message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns RateAmendmentInfo
             */
            public static fromObject(object: {
                [k: string]: any
            }): mcreviewproto.RateInfo.RateAmendmentInfo

            /**
             * Creates a plain object from a RateAmendmentInfo message. Also converts values to other types if specified.
             * @param message RateAmendmentInfo
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(
                message: mcreviewproto.RateInfo.RateAmendmentInfo,
                options?: $protobuf.IConversionOptions
            ): { [k: string]: any }

            /**
             * Converts this RateAmendmentInfo to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any }

            /**
             * Gets the default type url for RateAmendmentInfo
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string
        }
    }

    /** RateType enum. */
    enum RateType {
        RATE_TYPE_UNSPECIFIED = 0,
        RATE_TYPE_NEW = 1,
        RATE_TYPE_AMENDMENT = 2,
    }

    /** RateCapitationType enum. */
    enum RateCapitationType {
        RATE_CAPITATION_TYPE_UNSPECIFIED = 0,
        RATE_CAPITATION_TYPE_RATE_CELL = 1,
        RATE_CAPITATION_TYPE_RATE_RANGE = 2,
    }

    /** ActuaryCommunicationType enum. */
    enum ActuaryCommunicationType {
        ACTUARY_COMMUNICATION_TYPE_UNSPECIFIED = 0,
        ACTUARY_COMMUNICATION_TYPE_OACT_TO_ACTUARY = 1,
        ACTUARY_COMMUNICATION_TYPE_OACT_TO_STATE = 2,
    }

    /** ActuarialFirmType enum. */
    enum ActuarialFirmType {
        ACTUARIAL_FIRM_TYPE_UNSPECIFIED = 0,
        ACTUARIAL_FIRM_TYPE_MERCER = 1,
        ACTUARIAL_FIRM_TYPE_MILLIMAN = 2,
        ACTUARIAL_FIRM_TYPE_OPTUMAS = 3,
        ACTUARIAL_FIRM_TYPE_GUIDEHOUSE = 4,
        ACTUARIAL_FIRM_TYPE_DELOITTE = 5,
        ACTUARIAL_FIRM_TYPE_STATE_IN_HOUSE = 6,
        ACTUARIAL_FIRM_TYPE_OTHER = 7,
    }

    /** Generic sub types */
    enum DocumentCategory {
        DOCUMENT_CATEGORY_UNSPECIFIED = 0,
        DOCUMENT_CATEGORY_CONTRACT = 1,
        DOCUMENT_CATEGORY_RATES = 2,
        DOCUMENT_CATEGORY_CONTRACT_RELATED = 3,
        DOCUMENT_CATEGORY_RATES_RELATED = 4,
    }

    /** Properties of an ActuaryContact. */
    interface IActuaryContact {
        /** ActuaryContact contact */
        contact?: mcreviewproto.IContact | null

        /** ActuaryContact actuarialFirmType */
        actuarialFirmType?: mcreviewproto.ActuarialFirmType | null

        /** ActuaryContact actuarialFirmOther */
        actuarialFirmOther?: string | null
    }

    /** Represents an ActuaryContact. */
    class ActuaryContact implements IActuaryContact {
        /**
         * Constructs a new ActuaryContact.
         * @param [properties] Properties to set
         */
        constructor(properties?: mcreviewproto.IActuaryContact)

        /** ActuaryContact contact. */
        public contact?: mcreviewproto.IContact | null

        /** ActuaryContact actuarialFirmType. */
        public actuarialFirmType?: mcreviewproto.ActuarialFirmType | null

        /** ActuaryContact actuarialFirmOther. */
        public actuarialFirmOther?: string | null

        /** ActuaryContact _contact. */
        public _contact?: 'contact'

        /** ActuaryContact _actuarialFirmType. */
        public _actuarialFirmType?: 'actuarialFirmType'

        /** ActuaryContact _actuarialFirmOther. */
        public _actuarialFirmOther?: 'actuarialFirmOther'

        /**
         * Creates a new ActuaryContact instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ActuaryContact instance
         */
        public static create(
            properties?: mcreviewproto.IActuaryContact
        ): mcreviewproto.ActuaryContact

        /**
         * Encodes the specified ActuaryContact message. Does not implicitly {@link mcreviewproto.ActuaryContact.verify|verify} messages.
         * @param message ActuaryContact message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(
            message: mcreviewproto.IActuaryContact,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Encodes the specified ActuaryContact message, length delimited. Does not implicitly {@link mcreviewproto.ActuaryContact.verify|verify} messages.
         * @param message ActuaryContact message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(
            message: mcreviewproto.IActuaryContact,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Decodes an ActuaryContact message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ActuaryContact
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
            reader: $protobuf.Reader | Uint8Array,
            length?: number
        ): mcreviewproto.ActuaryContact

        /**
         * Decodes an ActuaryContact message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ActuaryContact
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(
            reader: $protobuf.Reader | Uint8Array
        ): mcreviewproto.ActuaryContact

        /**
         * Verifies an ActuaryContact message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string | null

        /**
         * Creates an ActuaryContact message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ActuaryContact
         */
        public static fromObject(object: {
            [k: string]: any
        }): mcreviewproto.ActuaryContact

        /**
         * Creates a plain object from an ActuaryContact message. Also converts values to other types if specified.
         * @param message ActuaryContact
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(
            message: mcreviewproto.ActuaryContact,
            options?: $protobuf.IConversionOptions
        ): { [k: string]: any }

        /**
         * Converts this ActuaryContact to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any }

        /**
         * Gets the default type url for ActuaryContact
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string
    }

    /** Properties of a Document. */
    interface IDocument {
        /** Document name */
        name?: string | null

        /** Document s3Url */
        s3Url?: string | null

        /** Document documentCategories */
        documentCategories?: mcreviewproto.DocumentCategory[] | null

        /** Document sha256 */
        sha256?: string | null
    }

    /** Represents a Document. */
    class Document implements IDocument {
        /**
         * Constructs a new Document.
         * @param [properties] Properties to set
         */
        constructor(properties?: mcreviewproto.IDocument)

        /** Document name. */
        public name?: string | null

        /** Document s3Url. */
        public s3Url?: string | null

        /** Document documentCategories. */
        public documentCategories: mcreviewproto.DocumentCategory[]

        /** Document sha256. */
        public sha256?: string | null

        /** Document _name. */
        public _name?: 'name'

        /** Document _s3Url. */
        public _s3Url?: 's3Url'

        /** Document _sha256. */
        public _sha256?: 'sha256'

        /**
         * Creates a new Document instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Document instance
         */
        public static create(
            properties?: mcreviewproto.IDocument
        ): mcreviewproto.Document

        /**
         * Encodes the specified Document message. Does not implicitly {@link mcreviewproto.Document.verify|verify} messages.
         * @param message Document message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(
            message: mcreviewproto.IDocument,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Encodes the specified Document message, length delimited. Does not implicitly {@link mcreviewproto.Document.verify|verify} messages.
         * @param message Document message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(
            message: mcreviewproto.IDocument,
            writer?: $protobuf.Writer
        ): $protobuf.Writer

        /**
         * Decodes a Document message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Document
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
            reader: $protobuf.Reader | Uint8Array,
            length?: number
        ): mcreviewproto.Document

        /**
         * Decodes a Document message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Document
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(
            reader: $protobuf.Reader | Uint8Array
        ): mcreviewproto.Document

        /**
         * Verifies a Document message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string | null

        /**
         * Creates a Document message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Document
         */
        public static fromObject(object: {
            [k: string]: any
        }): mcreviewproto.Document

        /**
         * Creates a plain object from a Document message. Also converts values to other types if specified.
         * @param message Document
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(
            message: mcreviewproto.Document,
            options?: $protobuf.IConversionOptions
        ): { [k: string]: any }

        /**
         * Converts this Document to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any }

        /**
         * Gets the default type url for Document
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string
    }

    /** StateCode enum. */
    enum StateCode {
        STATE_CODE_UNSPECIFIED = 0,
        STATE_CODE_AS = 1,
        STATE_CODE_AK = 2,
        STATE_CODE_AL = 3,
        STATE_CODE_AR = 4,
        STATE_CODE_AZ = 5,
        STATE_CODE_CA = 6,
        STATE_CODE_CO = 7,
        STATE_CODE_CT = 8,
        STATE_CODE_DC = 9,
        STATE_CODE_DE = 10,
        STATE_CODE_FL = 11,
        STATE_CODE_GA = 12,
        STATE_CODE_HI = 13,
        STATE_CODE_IA = 14,
        STATE_CODE_ID = 15,
        STATE_CODE_IL = 16,
        STATE_CODE_IN = 17,
        STATE_CODE_KS = 18,
        STATE_CODE_LA = 19,
        STATE_CODE_MA = 20,
        STATE_CODE_MD = 21,
        STATE_CODE_ME = 22,
        STATE_CODE_MI = 23,
        STATE_CODE_MN = 24,
        STATE_CODE_MO = 25,
        STATE_CODE_MS = 26,
        STATE_CODE_MT = 27,
        STATE_CODE_NC = 28,
        STATE_CODE_ND = 29,
        STATE_CODE_NE = 30,
        STATE_CODE_NH = 31,
        STATE_CODE_NJ = 32,
        STATE_CODE_NM = 33,
        STATE_CODE_NV = 34,
        STATE_CODE_NY = 35,
        STATE_CODE_OH = 36,
        STATE_CODE_OK = 37,
        STATE_CODE_OR = 38,
        STATE_CODE_PA = 39,
        STATE_CODE_PR = 40,
        STATE_CODE_RI = 41,
        STATE_CODE_SC = 42,
        STATE_CODE_SD = 43,
        STATE_CODE_TN = 44,
        STATE_CODE_TX = 45,
        STATE_CODE_UT = 46,
        STATE_CODE_VA = 47,
        STATE_CODE_VT = 48,
        STATE_CODE_WA = 49,
        STATE_CODE_WI = 50,
        STATE_CODE_WV = 51,
        STATE_CODE_WY = 52,
        STATE_CODE_KY = 53,
    }
}

/** Namespace google. */
export namespace google {
    /** Namespace protobuf. */
    namespace protobuf {
        /** Properties of a Timestamp. */
        interface ITimestamp {
            /** Timestamp seconds */
            seconds?: number | Long | null

            /** Timestamp nanos */
            nanos?: number | null
        }

        /** Represents a Timestamp. */
        class Timestamp implements ITimestamp {
            /**
             * Constructs a new Timestamp.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.ITimestamp)

            /** Timestamp seconds. */
            public seconds: number | Long

            /** Timestamp nanos. */
            public nanos: number

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Timestamp instance
             */
            public static create(
                properties?: google.protobuf.ITimestamp
            ): google.protobuf.Timestamp

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @param message Timestamp message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(
                message: google.protobuf.ITimestamp,
                writer?: $protobuf.Writer
            ): $protobuf.Writer

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @param message Timestamp message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(
                message: google.protobuf.ITimestamp,
                writer?: $protobuf.Writer
            ): $protobuf.Writer

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(
                reader: $protobuf.Reader | Uint8Array,
                length?: number
            ): google.protobuf.Timestamp

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(
                reader: $protobuf.Reader | Uint8Array
            ): google.protobuf.Timestamp

            /**
             * Verifies a Timestamp message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): string | null

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Timestamp
             */
            public static fromObject(object: {
                [k: string]: any
            }): google.protobuf.Timestamp

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @param message Timestamp
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(
                message: google.protobuf.Timestamp,
                options?: $protobuf.IConversionOptions
            ): { [k: string]: any }

            /**
             * Converts this Timestamp to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any }

            /**
             * Gets the default type url for Timestamp
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string
        }
    }
}
