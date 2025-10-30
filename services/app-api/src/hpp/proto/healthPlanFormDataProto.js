import * as $protobuf from 'protobufjs/minimal';

// Common aliases
const $Reader = $protobuf.Reader,
    $Writer = $protobuf.Writer,
    $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots['default'] || ($protobuf.roots['default'] = {});

export const mcreviewproto = ($root.mcreviewproto = (() => {
    /**
     * Namespace mcreviewproto.
     * @exports mcreviewproto
     * @namespace
     */
    const mcreviewproto = {};

    mcreviewproto.HealthPlanFormData = (function () {
        /**
         * Properties of a HealthPlanFormData.
         * @memberof mcreviewproto
         * @interface IHealthPlanFormData
         * @property {string|null} [protoName] HealthPlanFormData protoName
         * @property {number|null} [protoVersion] HealthPlanFormData protoVersion
         * @property {string|null} [id] HealthPlanFormData id
         * @property {string|null} [status] HealthPlanFormData status
         * @property {mcreviewproto.IDate|null} [createdAt] HealthPlanFormData createdAt
         * @property {google.protobuf.ITimestamp|null} [updatedAt] HealthPlanFormData updatedAt
         * @property {google.protobuf.ITimestamp|null} [submittedAt] HealthPlanFormData submittedAt
         * @property {mcreviewproto.SubmissionStatus|null} [submissionStatus] HealthPlanFormData submissionStatus
         * @property {mcreviewproto.StateCode|null} [stateCode] HealthPlanFormData stateCode
         * @property {number|null} [stateNumber] HealthPlanFormData stateNumber
         * @property {Array.<string>|null} [programIds] HealthPlanFormData programIds
         * @property {mcreviewproto.SubmissionType|null} [submissionType] HealthPlanFormData submissionType
         * @property {string|null} [submissionDescription] HealthPlanFormData submissionDescription
         * @property {Array.<mcreviewproto.IContact>|null} [stateContacts] HealthPlanFormData stateContacts
         * @property {mcreviewproto.IContractInfo|null} [contractInfo] HealthPlanFormData contractInfo
         * @property {Array.<mcreviewproto.IDocument>|null} [documents] HealthPlanFormData documents
         * @property {Array.<mcreviewproto.IActuaryContact>|null} [addtlActuaryContacts] HealthPlanFormData addtlActuaryContacts
         * @property {mcreviewproto.ActuaryCommunicationType|null} [addtlActuaryCommunicationPreference] HealthPlanFormData addtlActuaryCommunicationPreference
         * @property {boolean|null} [riskBasedContract] HealthPlanFormData riskBasedContract
         * @property {mcreviewproto.PopulationCovered|null} [populationCovered] HealthPlanFormData populationCovered
         * @property {Array.<mcreviewproto.IRateInfo>|null} [rateInfos] HealthPlanFormData rateInfos
         */

        /**
         * Constructs a new HealthPlanFormData.
         * @memberof mcreviewproto
         * @classdesc Represents a HealthPlanFormData.
         * @implements IHealthPlanFormData
         * @constructor
         * @param {mcreviewproto.IHealthPlanFormData=} [properties] Properties to set
         */
        function HealthPlanFormData(properties) {
            this.programIds = [];
            this.stateContacts = [];
            this.documents = [];
            this.addtlActuaryContacts = [];
            this.rateInfos = [];
            if (properties)
                for (
                    let keys = Object.keys(properties), i = 0;
                    i < keys.length;
                    ++i
                )
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * HealthPlanFormData protoName.
         * @member {string|null|undefined} protoName
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.protoName = null;

        /**
         * HealthPlanFormData protoVersion.
         * @member {number|null|undefined} protoVersion
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.protoVersion = null;

        /**
         * HealthPlanFormData id.
         * @member {string|null|undefined} id
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.id = null;

        /**
         * HealthPlanFormData status.
         * @member {string|null|undefined} status
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.status = null;

        /**
         * HealthPlanFormData createdAt.
         * @member {mcreviewproto.IDate|null|undefined} createdAt
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.createdAt = null;

        /**
         * HealthPlanFormData updatedAt.
         * @member {google.protobuf.ITimestamp|null|undefined} updatedAt
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.updatedAt = null;

        /**
         * HealthPlanFormData submittedAt.
         * @member {google.protobuf.ITimestamp|null|undefined} submittedAt
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.submittedAt = null;

        /**
         * HealthPlanFormData submissionStatus.
         * @member {mcreviewproto.SubmissionStatus|null|undefined} submissionStatus
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.submissionStatus = null;

        /**
         * HealthPlanFormData stateCode.
         * @member {mcreviewproto.StateCode|null|undefined} stateCode
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.stateCode = null;

        /**
         * HealthPlanFormData stateNumber.
         * @member {number|null|undefined} stateNumber
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.stateNumber = null;

        /**
         * HealthPlanFormData programIds.
         * @member {Array.<string>} programIds
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.programIds = $util.emptyArray;

        /**
         * HealthPlanFormData submissionType.
         * @member {mcreviewproto.SubmissionType|null|undefined} submissionType
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.submissionType = null;

        /**
         * HealthPlanFormData submissionDescription.
         * @member {string|null|undefined} submissionDescription
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.submissionDescription = null;

        /**
         * HealthPlanFormData stateContacts.
         * @member {Array.<mcreviewproto.IContact>} stateContacts
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.stateContacts = $util.emptyArray;

        /**
         * HealthPlanFormData contractInfo.
         * @member {mcreviewproto.IContractInfo|null|undefined} contractInfo
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.contractInfo = null;

        /**
         * HealthPlanFormData documents.
         * @member {Array.<mcreviewproto.IDocument>} documents
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.documents = $util.emptyArray;

        /**
         * HealthPlanFormData addtlActuaryContacts.
         * @member {Array.<mcreviewproto.IActuaryContact>} addtlActuaryContacts
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.addtlActuaryContacts = $util.emptyArray;

        /**
         * HealthPlanFormData addtlActuaryCommunicationPreference.
         * @member {mcreviewproto.ActuaryCommunicationType|null|undefined} addtlActuaryCommunicationPreference
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.addtlActuaryCommunicationPreference = null;

        /**
         * HealthPlanFormData riskBasedContract.
         * @member {boolean|null|undefined} riskBasedContract
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.riskBasedContract = null;

        /**
         * HealthPlanFormData populationCovered.
         * @member {mcreviewproto.PopulationCovered|null|undefined} populationCovered
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.populationCovered = null;

        /**
         * HealthPlanFormData rateInfos.
         * @member {Array.<mcreviewproto.IRateInfo>} rateInfos
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        HealthPlanFormData.prototype.rateInfos = $util.emptyArray;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * HealthPlanFormData _protoName.
         * @member {"protoName"|undefined} _protoName
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_protoName', {
            get: $util.oneOfGetter(($oneOfFields = ['protoName'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _protoVersion.
         * @member {"protoVersion"|undefined} _protoVersion
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_protoVersion', {
            get: $util.oneOfGetter(($oneOfFields = ['protoVersion'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _id.
         * @member {"id"|undefined} _id
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_id', {
            get: $util.oneOfGetter(($oneOfFields = ['id'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _status.
         * @member {"status"|undefined} _status
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_status', {
            get: $util.oneOfGetter(($oneOfFields = ['status'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _createdAt.
         * @member {"createdAt"|undefined} _createdAt
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_createdAt', {
            get: $util.oneOfGetter(($oneOfFields = ['createdAt'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _updatedAt.
         * @member {"updatedAt"|undefined} _updatedAt
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_updatedAt', {
            get: $util.oneOfGetter(($oneOfFields = ['updatedAt'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _submittedAt.
         * @member {"submittedAt"|undefined} _submittedAt
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_submittedAt', {
            get: $util.oneOfGetter(($oneOfFields = ['submittedAt'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _submissionStatus.
         * @member {"submissionStatus"|undefined} _submissionStatus
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(
            HealthPlanFormData.prototype,
            '_submissionStatus',
            {
                get: $util.oneOfGetter(($oneOfFields = ['submissionStatus'])),
                set: $util.oneOfSetter($oneOfFields),
            }
        );

        /**
         * HealthPlanFormData _stateCode.
         * @member {"stateCode"|undefined} _stateCode
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_stateCode', {
            get: $util.oneOfGetter(($oneOfFields = ['stateCode'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _stateNumber.
         * @member {"stateNumber"|undefined} _stateNumber
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_stateNumber', {
            get: $util.oneOfGetter(($oneOfFields = ['stateNumber'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _submissionType.
         * @member {"submissionType"|undefined} _submissionType
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_submissionType', {
            get: $util.oneOfGetter(($oneOfFields = ['submissionType'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _submissionDescription.
         * @member {"submissionDescription"|undefined} _submissionDescription
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(
            HealthPlanFormData.prototype,
            '_submissionDescription',
            {
                get: $util.oneOfGetter(
                    ($oneOfFields = ['submissionDescription'])
                ),
                set: $util.oneOfSetter($oneOfFields),
            }
        );

        /**
         * HealthPlanFormData _contractInfo.
         * @member {"contractInfo"|undefined} _contractInfo
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(HealthPlanFormData.prototype, '_contractInfo', {
            get: $util.oneOfGetter(($oneOfFields = ['contractInfo'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * HealthPlanFormData _addtlActuaryCommunicationPreference.
         * @member {"addtlActuaryCommunicationPreference"|undefined} _addtlActuaryCommunicationPreference
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(
            HealthPlanFormData.prototype,
            '_addtlActuaryCommunicationPreference',
            {
                get: $util.oneOfGetter(
                    ($oneOfFields = ['addtlActuaryCommunicationPreference'])
                ),
                set: $util.oneOfSetter($oneOfFields),
            }
        );

        /**
         * HealthPlanFormData _riskBasedContract.
         * @member {"riskBasedContract"|undefined} _riskBasedContract
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(
            HealthPlanFormData.prototype,
            '_riskBasedContract',
            {
                get: $util.oneOfGetter(($oneOfFields = ['riskBasedContract'])),
                set: $util.oneOfSetter($oneOfFields),
            }
        );

        /**
         * HealthPlanFormData _populationCovered.
         * @member {"populationCovered"|undefined} _populationCovered
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         */
        Object.defineProperty(
            HealthPlanFormData.prototype,
            '_populationCovered',
            {
                get: $util.oneOfGetter(($oneOfFields = ['populationCovered'])),
                set: $util.oneOfSetter($oneOfFields),
            }
        );

        /**
         * Creates a new HealthPlanFormData instance using the specified properties.
         * @function create
         * @memberof mcreviewproto.HealthPlanFormData
         * @static
         * @param {mcreviewproto.IHealthPlanFormData=} [properties] Properties to set
         * @returns {mcreviewproto.HealthPlanFormData} HealthPlanFormData instance
         */
        HealthPlanFormData.create = function create(properties) {
            return new HealthPlanFormData(properties);
        };

        /**
         * Encodes the specified HealthPlanFormData message. Does not implicitly {@link mcreviewproto.HealthPlanFormData.verify|verify} messages.
         * @function encode
         * @memberof mcreviewproto.HealthPlanFormData
         * @static
         * @param {mcreviewproto.IHealthPlanFormData} message HealthPlanFormData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HealthPlanFormData.encode = function encode(message, writer) {
            if (!writer) writer = $Writer.create();
            if (
                message.protoName != null &&
                Object.hasOwnProperty.call(message, 'protoName')
            )
                writer
                    .uint32(/* id 1, wireType 2 =*/ 10)
                    .string(message.protoName);
            if (
                message.protoVersion != null &&
                Object.hasOwnProperty.call(message, 'protoVersion')
            )
                writer
                    .uint32(/* id 2, wireType 0 =*/ 16)
                    .int32(message.protoVersion);
            if (message.id != null && Object.hasOwnProperty.call(message, 'id'))
                writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.id);
            if (
                message.status != null &&
                Object.hasOwnProperty.call(message, 'status')
            )
                writer
                    .uint32(/* id 4, wireType 2 =*/ 34)
                    .string(message.status);
            if (
                message.createdAt != null &&
                Object.hasOwnProperty.call(message, 'createdAt')
            )
                $root.mcreviewproto.Date.encode(
                    message.createdAt,
                    writer.uint32(/* id 5, wireType 2 =*/ 42).fork()
                ).ldelim();
            if (
                message.updatedAt != null &&
                Object.hasOwnProperty.call(message, 'updatedAt')
            )
                $root.google.protobuf.Timestamp.encode(
                    message.updatedAt,
                    writer.uint32(/* id 6, wireType 2 =*/ 50).fork()
                ).ldelim();
            if (
                message.submittedAt != null &&
                Object.hasOwnProperty.call(message, 'submittedAt')
            )
                $root.google.protobuf.Timestamp.encode(
                    message.submittedAt,
                    writer.uint32(/* id 7, wireType 2 =*/ 58).fork()
                ).ldelim();
            if (
                message.submissionStatus != null &&
                Object.hasOwnProperty.call(message, 'submissionStatus')
            )
                writer
                    .uint32(/* id 8, wireType 0 =*/ 64)
                    .int32(message.submissionStatus);
            if (
                message.stateCode != null &&
                Object.hasOwnProperty.call(message, 'stateCode')
            )
                writer
                    .uint32(/* id 9, wireType 0 =*/ 72)
                    .int32(message.stateCode);
            if (
                message.stateNumber != null &&
                Object.hasOwnProperty.call(message, 'stateNumber')
            )
                writer
                    .uint32(/* id 10, wireType 0 =*/ 80)
                    .int32(message.stateNumber);
            if (message.programIds != null && message.programIds.length)
                for (let i = 0; i < message.programIds.length; ++i)
                    writer
                        .uint32(/* id 11, wireType 2 =*/ 90)
                        .string(message.programIds[i]);
            if (
                message.submissionType != null &&
                Object.hasOwnProperty.call(message, 'submissionType')
            )
                writer
                    .uint32(/* id 12, wireType 0 =*/ 96)
                    .int32(message.submissionType);
            if (
                message.submissionDescription != null &&
                Object.hasOwnProperty.call(message, 'submissionDescription')
            )
                writer
                    .uint32(/* id 13, wireType 2 =*/ 106)
                    .string(message.submissionDescription);
            if (message.stateContacts != null && message.stateContacts.length)
                for (let i = 0; i < message.stateContacts.length; ++i)
                    $root.mcreviewproto.Contact.encode(
                        message.stateContacts[i],
                        writer.uint32(/* id 14, wireType 2 =*/ 114).fork()
                    ).ldelim();
            if (
                message.contractInfo != null &&
                Object.hasOwnProperty.call(message, 'contractInfo')
            )
                $root.mcreviewproto.ContractInfo.encode(
                    message.contractInfo,
                    writer.uint32(/* id 15, wireType 2 =*/ 122).fork()
                ).ldelim();
            if (message.documents != null && message.documents.length)
                for (let i = 0; i < message.documents.length; ++i)
                    $root.mcreviewproto.Document.encode(
                        message.documents[i],
                        writer.uint32(/* id 16, wireType 2 =*/ 130).fork()
                    ).ldelim();
            if (
                message.addtlActuaryContacts != null &&
                message.addtlActuaryContacts.length
            )
                for (let i = 0; i < message.addtlActuaryContacts.length; ++i)
                    $root.mcreviewproto.ActuaryContact.encode(
                        message.addtlActuaryContacts[i],
                        writer.uint32(/* id 17, wireType 2 =*/ 138).fork()
                    ).ldelim();
            if (
                message.addtlActuaryCommunicationPreference != null &&
                Object.hasOwnProperty.call(
                    message,
                    'addtlActuaryCommunicationPreference'
                )
            )
                writer
                    .uint32(/* id 18, wireType 0 =*/ 144)
                    .int32(message.addtlActuaryCommunicationPreference);
            if (
                message.riskBasedContract != null &&
                Object.hasOwnProperty.call(message, 'riskBasedContract')
            )
                writer
                    .uint32(/* id 19, wireType 0 =*/ 152)
                    .bool(message.riskBasedContract);
            if (
                message.populationCovered != null &&
                Object.hasOwnProperty.call(message, 'populationCovered')
            )
                writer
                    .uint32(/* id 20, wireType 0 =*/ 160)
                    .int32(message.populationCovered);
            if (message.rateInfos != null && message.rateInfos.length)
                for (let i = 0; i < message.rateInfos.length; ++i)
                    $root.mcreviewproto.RateInfo.encode(
                        message.rateInfos[i],
                        writer.uint32(/* id 50, wireType 2 =*/ 402).fork()
                    ).ldelim();
            return writer;
        };

        /**
         * Encodes the specified HealthPlanFormData message, length delimited. Does not implicitly {@link mcreviewproto.HealthPlanFormData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof mcreviewproto.HealthPlanFormData
         * @static
         * @param {mcreviewproto.IHealthPlanFormData} message HealthPlanFormData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HealthPlanFormData.encodeDelimited = function encodeDelimited(
            message,
            writer
        ) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HealthPlanFormData message from the specified reader or buffer.
         * @function decode
         * @memberof mcreviewproto.HealthPlanFormData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {mcreviewproto.HealthPlanFormData} HealthPlanFormData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HealthPlanFormData.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length,
                message = new $root.mcreviewproto.HealthPlanFormData();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1: {
                        message.protoName = reader.string();
                        break;
                    }
                    case 2: {
                        message.protoVersion = reader.int32();
                        break;
                    }
                    case 3: {
                        message.id = reader.string();
                        break;
                    }
                    case 4: {
                        message.status = reader.string();
                        break;
                    }
                    case 5: {
                        message.createdAt = $root.mcreviewproto.Date.decode(
                            reader,
                            reader.uint32()
                        );
                        break;
                    }
                    case 6: {
                        message.updatedAt =
                            $root.google.protobuf.Timestamp.decode(
                                reader,
                                reader.uint32()
                            );
                        break;
                    }
                    case 7: {
                        message.submittedAt =
                            $root.google.protobuf.Timestamp.decode(
                                reader,
                                reader.uint32()
                            );
                        break;
                    }
                    case 8: {
                        message.submissionStatus = reader.int32();
                        break;
                    }
                    case 9: {
                        message.stateCode = reader.int32();
                        break;
                    }
                    case 10: {
                        message.stateNumber = reader.int32();
                        break;
                    }
                    case 11: {
                        if (!(message.programIds && message.programIds.length))
                            message.programIds = [];
                        message.programIds.push(reader.string());
                        break;
                    }
                    case 12: {
                        message.submissionType = reader.int32();
                        break;
                    }
                    case 13: {
                        message.submissionDescription = reader.string();
                        break;
                    }
                    case 14: {
                        if (
                            !(
                                message.stateContacts &&
                                message.stateContacts.length
                            )
                        )
                            message.stateContacts = [];
                        message.stateContacts.push(
                            $root.mcreviewproto.Contact.decode(
                                reader,
                                reader.uint32()
                            )
                        );
                        break;
                    }
                    case 15: {
                        message.contractInfo =
                            $root.mcreviewproto.ContractInfo.decode(
                                reader,
                                reader.uint32()
                            );
                        break;
                    }
                    case 16: {
                        if (!(message.documents && message.documents.length))
                            message.documents = [];
                        message.documents.push(
                            $root.mcreviewproto.Document.decode(
                                reader,
                                reader.uint32()
                            )
                        );
                        break;
                    }
                    case 17: {
                        if (
                            !(
                                message.addtlActuaryContacts &&
                                message.addtlActuaryContacts.length
                            )
                        )
                            message.addtlActuaryContacts = [];
                        message.addtlActuaryContacts.push(
                            $root.mcreviewproto.ActuaryContact.decode(
                                reader,
                                reader.uint32()
                            )
                        );
                        break;
                    }
                    case 18: {
                        message.addtlActuaryCommunicationPreference =
                            reader.int32();
                        break;
                    }
                    case 19: {
                        message.riskBasedContract = reader.bool();
                        break;
                    }
                    case 20: {
                        message.populationCovered = reader.int32();
                        break;
                    }
                    case 50: {
                        if (!(message.rateInfos && message.rateInfos.length))
                            message.rateInfos = [];
                        message.rateInfos.push(
                            $root.mcreviewproto.RateInfo.decode(
                                reader,
                                reader.uint32()
                            )
                        );
                        break;
                    }
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        };

        /**
         * Decodes a HealthPlanFormData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof mcreviewproto.HealthPlanFormData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {mcreviewproto.HealthPlanFormData} HealthPlanFormData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HealthPlanFormData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader)) reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a HealthPlanFormData message.
         * @function verify
         * @memberof mcreviewproto.HealthPlanFormData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        HealthPlanFormData.verify = function verify(message) {
            if (typeof message !== 'object' || message === null)
                return 'object expected';
            let properties = {};
            if (
                message.protoName != null &&
                message.hasOwnProperty('protoName')
            ) {
                properties._protoName = 1;
                if (!$util.isString(message.protoName))
                    return 'protoName: string expected';
            }
            if (
                message.protoVersion != null &&
                message.hasOwnProperty('protoVersion')
            ) {
                properties._protoVersion = 1;
                if (!$util.isInteger(message.protoVersion))
                    return 'protoVersion: integer expected';
            }
            if (message.id != null && message.hasOwnProperty('id')) {
                properties._id = 1;
                if (!$util.isString(message.id)) return 'id: string expected';
            }
            if (message.status != null && message.hasOwnProperty('status')) {
                properties._status = 1;
                if (!$util.isString(message.status))
                    return 'status: string expected';
            }
            if (
                message.createdAt != null &&
                message.hasOwnProperty('createdAt')
            ) {
                properties._createdAt = 1;
                {
                    let error = $root.mcreviewproto.Date.verify(
                        message.createdAt
                    );
                    if (error) return 'createdAt.' + error;
                }
            }
            if (
                message.updatedAt != null &&
                message.hasOwnProperty('updatedAt')
            ) {
                properties._updatedAt = 1;
                {
                    let error = $root.google.protobuf.Timestamp.verify(
                        message.updatedAt
                    );
                    if (error) return 'updatedAt.' + error;
                }
            }
            if (
                message.submittedAt != null &&
                message.hasOwnProperty('submittedAt')
            ) {
                properties._submittedAt = 1;
                {
                    let error = $root.google.protobuf.Timestamp.verify(
                        message.submittedAt
                    );
                    if (error) return 'submittedAt.' + error;
                }
            }
            if (
                message.submissionStatus != null &&
                message.hasOwnProperty('submissionStatus')
            ) {
                properties._submissionStatus = 1;
                switch (message.submissionStatus) {
                    default:
                        return 'submissionStatus: enum value expected';
                    case 0:
                    case 1:
                    case 2:
                        break;
                }
            }
            if (
                message.stateCode != null &&
                message.hasOwnProperty('stateCode')
            ) {
                properties._stateCode = 1;
                switch (message.stateCode) {
                    default:
                        return 'stateCode: enum value expected';
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                    case 9:
                    case 10:
                    case 11:
                    case 12:
                    case 13:
                    case 14:
                    case 15:
                    case 16:
                    case 17:
                    case 18:
                    case 19:
                    case 20:
                    case 21:
                    case 22:
                    case 23:
                    case 24:
                    case 25:
                    case 26:
                    case 27:
                    case 28:
                    case 29:
                    case 30:
                    case 31:
                    case 32:
                    case 33:
                    case 34:
                    case 35:
                    case 36:
                    case 37:
                    case 38:
                    case 39:
                    case 40:
                    case 41:
                    case 42:
                    case 43:
                    case 44:
                    case 45:
                    case 46:
                    case 47:
                    case 48:
                    case 49:
                    case 50:
                    case 51:
                    case 52:
                    case 53:
                        break;
                }
            }
            if (
                message.stateNumber != null &&
                message.hasOwnProperty('stateNumber')
            ) {
                properties._stateNumber = 1;
                if (!$util.isInteger(message.stateNumber))
                    return 'stateNumber: integer expected';
            }
            if (
                message.programIds != null &&
                message.hasOwnProperty('programIds')
            ) {
                if (!Array.isArray(message.programIds))
                    return 'programIds: array expected';
                for (let i = 0; i < message.programIds.length; ++i)
                    if (!$util.isString(message.programIds[i]))
                        return 'programIds: string[] expected';
            }
            if (
                message.submissionType != null &&
                message.hasOwnProperty('submissionType')
            ) {
                properties._submissionType = 1;
                switch (message.submissionType) {
                    default:
                        return 'submissionType: enum value expected';
                    case 0:
                    case 1:
                    case 3:
                        break;
                }
            }
            if (
                message.submissionDescription != null &&
                message.hasOwnProperty('submissionDescription')
            ) {
                properties._submissionDescription = 1;
                if (!$util.isString(message.submissionDescription))
                    return 'submissionDescription: string expected';
            }
            if (
                message.stateContacts != null &&
                message.hasOwnProperty('stateContacts')
            ) {
                if (!Array.isArray(message.stateContacts))
                    return 'stateContacts: array expected';
                for (let i = 0; i < message.stateContacts.length; ++i) {
                    let error = $root.mcreviewproto.Contact.verify(
                        message.stateContacts[i]
                    );
                    if (error) return 'stateContacts.' + error;
                }
            }
            if (
                message.contractInfo != null &&
                message.hasOwnProperty('contractInfo')
            ) {
                properties._contractInfo = 1;
                {
                    let error = $root.mcreviewproto.ContractInfo.verify(
                        message.contractInfo
                    );
                    if (error) return 'contractInfo.' + error;
                }
            }
            if (
                message.documents != null &&
                message.hasOwnProperty('documents')
            ) {
                if (!Array.isArray(message.documents))
                    return 'documents: array expected';
                for (let i = 0; i < message.documents.length; ++i) {
                    let error = $root.mcreviewproto.Document.verify(
                        message.documents[i]
                    );
                    if (error) return 'documents.' + error;
                }
            }
            if (
                message.addtlActuaryContacts != null &&
                message.hasOwnProperty('addtlActuaryContacts')
            ) {
                if (!Array.isArray(message.addtlActuaryContacts))
                    return 'addtlActuaryContacts: array expected';
                for (let i = 0; i < message.addtlActuaryContacts.length; ++i) {
                    let error = $root.mcreviewproto.ActuaryContact.verify(
                        message.addtlActuaryContacts[i]
                    );
                    if (error) return 'addtlActuaryContacts.' + error;
                }
            }
            if (
                message.addtlActuaryCommunicationPreference != null &&
                message.hasOwnProperty('addtlActuaryCommunicationPreference')
            ) {
                properties._addtlActuaryCommunicationPreference = 1;
                switch (message.addtlActuaryCommunicationPreference) {
                    default:
                        return 'addtlActuaryCommunicationPreference: enum value expected';
                    case 0:
                    case 1:
                    case 2:
                        break;
                }
            }
            if (
                message.riskBasedContract != null &&
                message.hasOwnProperty('riskBasedContract')
            ) {
                properties._riskBasedContract = 1;
                if (typeof message.riskBasedContract !== 'boolean')
                    return 'riskBasedContract: boolean expected';
            }
            if (
                message.populationCovered != null &&
                message.hasOwnProperty('populationCovered')
            ) {
                properties._populationCovered = 1;
                switch (message.populationCovered) {
                    default:
                        return 'populationCovered: enum value expected';
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                        break;
                }
            }
            if (
                message.rateInfos != null &&
                message.hasOwnProperty('rateInfos')
            ) {
                if (!Array.isArray(message.rateInfos))
                    return 'rateInfos: array expected';
                for (let i = 0; i < message.rateInfos.length; ++i) {
                    let error = $root.mcreviewproto.RateInfo.verify(
                        message.rateInfos[i]
                    );
                    if (error) return 'rateInfos.' + error;
                }
            }
            return null;
        };

        /**
         * Creates a HealthPlanFormData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof mcreviewproto.HealthPlanFormData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {mcreviewproto.HealthPlanFormData} HealthPlanFormData
         */
        HealthPlanFormData.fromObject = function fromObject(object) {
            if (object instanceof $root.mcreviewproto.HealthPlanFormData)
                return object;
            let message = new $root.mcreviewproto.HealthPlanFormData();
            if (object.protoName != null)
                message.protoName = String(object.protoName);
            if (object.protoVersion != null)
                message.protoVersion = object.protoVersion | 0;
            if (object.id != null) message.id = String(object.id);
            if (object.status != null) message.status = String(object.status);
            if (object.createdAt != null) {
                if (typeof object.createdAt !== 'object')
                    throw TypeError(
                        '.mcreviewproto.HealthPlanFormData.createdAt: object expected'
                    );
                message.createdAt = $root.mcreviewproto.Date.fromObject(
                    object.createdAt
                );
            }
            if (object.updatedAt != null) {
                if (typeof object.updatedAt !== 'object')
                    throw TypeError(
                        '.mcreviewproto.HealthPlanFormData.updatedAt: object expected'
                    );
                message.updatedAt = $root.google.protobuf.Timestamp.fromObject(
                    object.updatedAt
                );
            }
            if (object.submittedAt != null) {
                if (typeof object.submittedAt !== 'object')
                    throw TypeError(
                        '.mcreviewproto.HealthPlanFormData.submittedAt: object expected'
                    );
                message.submittedAt =
                    $root.google.protobuf.Timestamp.fromObject(
                        object.submittedAt
                    );
            }
            switch (object.submissionStatus) {
                default:
                    if (typeof object.submissionStatus === 'number') {
                        message.submissionStatus = object.submissionStatus;
                        break;
                    }
                    break;
                case 'SUBMISSION_STATUS_UNSPECIFIED':
                case 0:
                    message.submissionStatus = 0;
                    break;
                case 'SUBMISSION_STATUS_DRAFT':
                case 1:
                    message.submissionStatus = 1;
                    break;
                case 'SUBMISSION_STATUS_SUBMITTED':
                case 2:
                    message.submissionStatus = 2;
                    break;
            }
            switch (object.stateCode) {
                default:
                    if (typeof object.stateCode === 'number') {
                        message.stateCode = object.stateCode;
                        break;
                    }
                    break;
                case 'STATE_CODE_UNSPECIFIED':
                case 0:
                    message.stateCode = 0;
                    break;
                case 'STATE_CODE_AS':
                case 1:
                    message.stateCode = 1;
                    break;
                case 'STATE_CODE_AK':
                case 2:
                    message.stateCode = 2;
                    break;
                case 'STATE_CODE_AL':
                case 3:
                    message.stateCode = 3;
                    break;
                case 'STATE_CODE_AR':
                case 4:
                    message.stateCode = 4;
                    break;
                case 'STATE_CODE_AZ':
                case 5:
                    message.stateCode = 5;
                    break;
                case 'STATE_CODE_CA':
                case 6:
                    message.stateCode = 6;
                    break;
                case 'STATE_CODE_CO':
                case 7:
                    message.stateCode = 7;
                    break;
                case 'STATE_CODE_CT':
                case 8:
                    message.stateCode = 8;
                    break;
                case 'STATE_CODE_DC':
                case 9:
                    message.stateCode = 9;
                    break;
                case 'STATE_CODE_DE':
                case 10:
                    message.stateCode = 10;
                    break;
                case 'STATE_CODE_FL':
                case 11:
                    message.stateCode = 11;
                    break;
                case 'STATE_CODE_GA':
                case 12:
                    message.stateCode = 12;
                    break;
                case 'STATE_CODE_HI':
                case 13:
                    message.stateCode = 13;
                    break;
                case 'STATE_CODE_IA':
                case 14:
                    message.stateCode = 14;
                    break;
                case 'STATE_CODE_ID':
                case 15:
                    message.stateCode = 15;
                    break;
                case 'STATE_CODE_IL':
                case 16:
                    message.stateCode = 16;
                    break;
                case 'STATE_CODE_IN':
                case 17:
                    message.stateCode = 17;
                    break;
                case 'STATE_CODE_KS':
                case 18:
                    message.stateCode = 18;
                    break;
                case 'STATE_CODE_LA':
                case 19:
                    message.stateCode = 19;
                    break;
                case 'STATE_CODE_MA':
                case 20:
                    message.stateCode = 20;
                    break;
                case 'STATE_CODE_MD':
                case 21:
                    message.stateCode = 21;
                    break;
                case 'STATE_CODE_ME':
                case 22:
                    message.stateCode = 22;
                    break;
                case 'STATE_CODE_MI':
                case 23:
                    message.stateCode = 23;
                    break;
                case 'STATE_CODE_MN':
                case 24:
                    message.stateCode = 24;
                    break;
                case 'STATE_CODE_MO':
                case 25:
                    message.stateCode = 25;
                    break;
                case 'STATE_CODE_MS':
                case 26:
                    message.stateCode = 26;
                    break;
                case 'STATE_CODE_MT':
                case 27:
                    message.stateCode = 27;
                    break;
                case 'STATE_CODE_NC':
                case 28:
                    message.stateCode = 28;
                    break;
                case 'STATE_CODE_ND':
                case 29:
                    message.stateCode = 29;
                    break;
                case 'STATE_CODE_NE':
                case 30:
                    message.stateCode = 30;
                    break;
                case 'STATE_CODE_NH':
                case 31:
                    message.stateCode = 31;
                    break;
                case 'STATE_CODE_NJ':
                case 32:
                    message.stateCode = 32;
                    break;
                case 'STATE_CODE_NM':
                case 33:
                    message.stateCode = 33;
                    break;
                case 'STATE_CODE_NV':
                case 34:
                    message.stateCode = 34;
                    break;
                case 'STATE_CODE_NY':
                case 35:
                    message.stateCode = 35;
                    break;
                case 'STATE_CODE_OH':
                case 36:
                    message.stateCode = 36;
                    break;
                case 'STATE_CODE_OK':
                case 37:
                    message.stateCode = 37;
                    break;
                case 'STATE_CODE_OR':
                case 38:
                    message.stateCode = 38;
                    break;
                case 'STATE_CODE_PA':
                case 39:
                    message.stateCode = 39;
                    break;
                case 'STATE_CODE_PR':
                case 40:
                    message.stateCode = 40;
                    break;
                case 'STATE_CODE_RI':
                case 41:
                    message.stateCode = 41;
                    break;
                case 'STATE_CODE_SC':
                case 42:
                    message.stateCode = 42;
                    break;
                case 'STATE_CODE_SD':
                case 43:
                    message.stateCode = 43;
                    break;
                case 'STATE_CODE_TN':
                case 44:
                    message.stateCode = 44;
                    break;
                case 'STATE_CODE_TX':
                case 45:
                    message.stateCode = 45;
                    break;
                case 'STATE_CODE_UT':
                case 46:
                    message.stateCode = 46;
                    break;
                case 'STATE_CODE_VA':
                case 47:
                    message.stateCode = 47;
                    break;
                case 'STATE_CODE_VT':
                case 48:
                    message.stateCode = 48;
                    break;
                case 'STATE_CODE_WA':
                case 49:
                    message.stateCode = 49;
                    break;
                case 'STATE_CODE_WI':
                case 50:
                    message.stateCode = 50;
                    break;
                case 'STATE_CODE_WV':
                case 51:
                    message.stateCode = 51;
                    break;
                case 'STATE_CODE_WY':
                case 52:
                    message.stateCode = 52;
                    break;
                case 'STATE_CODE_KY':
                case 53:
                    message.stateCode = 53;
                    break;
            }
            if (object.stateNumber != null)
                message.stateNumber = object.stateNumber | 0;
            if (object.programIds) {
                if (!Array.isArray(object.programIds))
                    throw TypeError(
                        '.mcreviewproto.HealthPlanFormData.programIds: array expected'
                    );
                message.programIds = [];
                for (let i = 0; i < object.programIds.length; ++i)
                    message.programIds[i] = String(object.programIds[i]);
            }
            switch (object.submissionType) {
                default:
                    if (typeof object.submissionType === 'number') {
                        message.submissionType = object.submissionType;
                        break;
                    }
                    break;
                case 'SUBMISSION_TYPE_UNSPECIFIED':
                case 0:
                    message.submissionType = 0;
                    break;
                case 'SUBMISSION_TYPE_CONTRACT_ONLY':
                case 1:
                    message.submissionType = 1;
                    break;
                case 'SUBMISSION_TYPE_CONTRACT_AND_RATES':
                case 3:
                    message.submissionType = 3;
                    break;
            }
            if (object.submissionDescription != null)
                message.submissionDescription = String(
                    object.submissionDescription
                );
            if (object.stateContacts) {
                if (!Array.isArray(object.stateContacts))
                    throw TypeError(
                        '.mcreviewproto.HealthPlanFormData.stateContacts: array expected'
                    );
                message.stateContacts = [];
                for (let i = 0; i < object.stateContacts.length; ++i) {
                    if (typeof object.stateContacts[i] !== 'object')
                        throw TypeError(
                            '.mcreviewproto.HealthPlanFormData.stateContacts: object expected'
                        );
                    message.stateContacts[i] =
                        $root.mcreviewproto.Contact.fromObject(
                            object.stateContacts[i]
                        );
                }
            }
            if (object.contractInfo != null) {
                if (typeof object.contractInfo !== 'object')
                    throw TypeError(
                        '.mcreviewproto.HealthPlanFormData.contractInfo: object expected'
                    );
                message.contractInfo =
                    $root.mcreviewproto.ContractInfo.fromObject(
                        object.contractInfo
                    );
            }
            if (object.documents) {
                if (!Array.isArray(object.documents))
                    throw TypeError(
                        '.mcreviewproto.HealthPlanFormData.documents: array expected'
                    );
                message.documents = [];
                for (let i = 0; i < object.documents.length; ++i) {
                    if (typeof object.documents[i] !== 'object')
                        throw TypeError(
                            '.mcreviewproto.HealthPlanFormData.documents: object expected'
                        );
                    message.documents[i] =
                        $root.mcreviewproto.Document.fromObject(
                            object.documents[i]
                        );
                }
            }
            if (object.addtlActuaryContacts) {
                if (!Array.isArray(object.addtlActuaryContacts))
                    throw TypeError(
                        '.mcreviewproto.HealthPlanFormData.addtlActuaryContacts: array expected'
                    );
                message.addtlActuaryContacts = [];
                for (let i = 0; i < object.addtlActuaryContacts.length; ++i) {
                    if (typeof object.addtlActuaryContacts[i] !== 'object')
                        throw TypeError(
                            '.mcreviewproto.HealthPlanFormData.addtlActuaryContacts: object expected'
                        );
                    message.addtlActuaryContacts[i] =
                        $root.mcreviewproto.ActuaryContact.fromObject(
                            object.addtlActuaryContacts[i]
                        );
                }
            }
            switch (object.addtlActuaryCommunicationPreference) {
                default:
                    if (
                        typeof object.addtlActuaryCommunicationPreference ===
                        'number'
                    ) {
                        message.addtlActuaryCommunicationPreference =
                            object.addtlActuaryCommunicationPreference;
                        break;
                    }
                    break;
                case 'ACTUARY_COMMUNICATION_TYPE_UNSPECIFIED':
                case 0:
                    message.addtlActuaryCommunicationPreference = 0;
                    break;
                case 'ACTUARY_COMMUNICATION_TYPE_OACT_TO_ACTUARY':
                case 1:
                    message.addtlActuaryCommunicationPreference = 1;
                    break;
                case 'ACTUARY_COMMUNICATION_TYPE_OACT_TO_STATE':
                case 2:
                    message.addtlActuaryCommunicationPreference = 2;
                    break;
            }
            if (object.riskBasedContract != null)
                message.riskBasedContract = Boolean(object.riskBasedContract);
            switch (object.populationCovered) {
                default:
                    if (typeof object.populationCovered === 'number') {
                        message.populationCovered = object.populationCovered;
                        break;
                    }
                    break;
                case 'POPULATION_COVERED_UNSPECIFIED':
                case 0:
                    message.populationCovered = 0;
                    break;
                case 'POPULATION_COVERED_MEDICAID':
                case 1:
                    message.populationCovered = 1;
                    break;
                case 'POPULATION_COVERED_CHIP':
                case 2:
                    message.populationCovered = 2;
                    break;
                case 'POPULATION_COVERED_MEDICAID_AND_CHIP':
                case 3:
                    message.populationCovered = 3;
                    break;
            }
            if (object.rateInfos) {
                if (!Array.isArray(object.rateInfos))
                    throw TypeError(
                        '.mcreviewproto.HealthPlanFormData.rateInfos: array expected'
                    );
                message.rateInfos = [];
                for (let i = 0; i < object.rateInfos.length; ++i) {
                    if (typeof object.rateInfos[i] !== 'object')
                        throw TypeError(
                            '.mcreviewproto.HealthPlanFormData.rateInfos: object expected'
                        );
                    message.rateInfos[i] =
                        $root.mcreviewproto.RateInfo.fromObject(
                            object.rateInfos[i]
                        );
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a HealthPlanFormData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof mcreviewproto.HealthPlanFormData
         * @static
         * @param {mcreviewproto.HealthPlanFormData} message HealthPlanFormData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        HealthPlanFormData.toObject = function toObject(message, options) {
            if (!options) options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.programIds = [];
                object.stateContacts = [];
                object.documents = [];
                object.addtlActuaryContacts = [];
                object.rateInfos = [];
            }
            if (
                message.protoName != null &&
                message.hasOwnProperty('protoName')
            ) {
                object.protoName = message.protoName;
                if (options.oneofs) object._protoName = 'protoName';
            }
            if (
                message.protoVersion != null &&
                message.hasOwnProperty('protoVersion')
            ) {
                object.protoVersion = message.protoVersion;
                if (options.oneofs) object._protoVersion = 'protoVersion';
            }
            if (message.id != null && message.hasOwnProperty('id')) {
                object.id = message.id;
                if (options.oneofs) object._id = 'id';
            }
            if (message.status != null && message.hasOwnProperty('status')) {
                object.status = message.status;
                if (options.oneofs) object._status = 'status';
            }
            if (
                message.createdAt != null &&
                message.hasOwnProperty('createdAt')
            ) {
                object.createdAt = $root.mcreviewproto.Date.toObject(
                    message.createdAt,
                    options
                );
                if (options.oneofs) object._createdAt = 'createdAt';
            }
            if (
                message.updatedAt != null &&
                message.hasOwnProperty('updatedAt')
            ) {
                object.updatedAt = $root.google.protobuf.Timestamp.toObject(
                    message.updatedAt,
                    options
                );
                if (options.oneofs) object._updatedAt = 'updatedAt';
            }
            if (
                message.submittedAt != null &&
                message.hasOwnProperty('submittedAt')
            ) {
                object.submittedAt = $root.google.protobuf.Timestamp.toObject(
                    message.submittedAt,
                    options
                );
                if (options.oneofs) object._submittedAt = 'submittedAt';
            }
            if (
                message.submissionStatus != null &&
                message.hasOwnProperty('submissionStatus')
            ) {
                object.submissionStatus =
                    options.enums === String
                        ? $root.mcreviewproto.SubmissionStatus[
                              message.submissionStatus
                          ] === undefined
                            ? message.submissionStatus
                            : $root.mcreviewproto.SubmissionStatus[
                                  message.submissionStatus
                              ]
                        : message.submissionStatus;
                if (options.oneofs)
                    object._submissionStatus = 'submissionStatus';
            }
            if (
                message.stateCode != null &&
                message.hasOwnProperty('stateCode')
            ) {
                object.stateCode =
                    options.enums === String
                        ? $root.mcreviewproto.StateCode[message.stateCode] ===
                          undefined
                            ? message.stateCode
                            : $root.mcreviewproto.StateCode[message.stateCode]
                        : message.stateCode;
                if (options.oneofs) object._stateCode = 'stateCode';
            }
            if (
                message.stateNumber != null &&
                message.hasOwnProperty('stateNumber')
            ) {
                object.stateNumber = message.stateNumber;
                if (options.oneofs) object._stateNumber = 'stateNumber';
            }
            if (message.programIds && message.programIds.length) {
                object.programIds = [];
                for (let j = 0; j < message.programIds.length; ++j)
                    object.programIds[j] = message.programIds[j];
            }
            if (
                message.submissionType != null &&
                message.hasOwnProperty('submissionType')
            ) {
                object.submissionType =
                    options.enums === String
                        ? $root.mcreviewproto.SubmissionType[
                              message.submissionType
                          ] === undefined
                            ? message.submissionType
                            : $root.mcreviewproto.SubmissionType[
                                  message.submissionType
                              ]
                        : message.submissionType;
                if (options.oneofs) object._submissionType = 'submissionType';
            }
            if (
                message.submissionDescription != null &&
                message.hasOwnProperty('submissionDescription')
            ) {
                object.submissionDescription = message.submissionDescription;
                if (options.oneofs)
                    object._submissionDescription = 'submissionDescription';
            }
            if (message.stateContacts && message.stateContacts.length) {
                object.stateContacts = [];
                for (let j = 0; j < message.stateContacts.length; ++j)
                    object.stateContacts[j] =
                        $root.mcreviewproto.Contact.toObject(
                            message.stateContacts[j],
                            options
                        );
            }
            if (
                message.contractInfo != null &&
                message.hasOwnProperty('contractInfo')
            ) {
                object.contractInfo = $root.mcreviewproto.ContractInfo.toObject(
                    message.contractInfo,
                    options
                );
                if (options.oneofs) object._contractInfo = 'contractInfo';
            }
            if (message.documents && message.documents.length) {
                object.documents = [];
                for (let j = 0; j < message.documents.length; ++j)
                    object.documents[j] = $root.mcreviewproto.Document.toObject(
                        message.documents[j],
                        options
                    );
            }
            if (
                message.addtlActuaryContacts &&
                message.addtlActuaryContacts.length
            ) {
                object.addtlActuaryContacts = [];
                for (let j = 0; j < message.addtlActuaryContacts.length; ++j)
                    object.addtlActuaryContacts[j] =
                        $root.mcreviewproto.ActuaryContact.toObject(
                            message.addtlActuaryContacts[j],
                            options
                        );
            }
            if (
                message.addtlActuaryCommunicationPreference != null &&
                message.hasOwnProperty('addtlActuaryCommunicationPreference')
            ) {
                object.addtlActuaryCommunicationPreference =
                    options.enums === String
                        ? $root.mcreviewproto.ActuaryCommunicationType[
                              message.addtlActuaryCommunicationPreference
                          ] === undefined
                            ? message.addtlActuaryCommunicationPreference
                            : $root.mcreviewproto.ActuaryCommunicationType[
                                  message.addtlActuaryCommunicationPreference
                              ]
                        : message.addtlActuaryCommunicationPreference;
                if (options.oneofs)
                    object._addtlActuaryCommunicationPreference =
                        'addtlActuaryCommunicationPreference';
            }
            if (
                message.riskBasedContract != null &&
                message.hasOwnProperty('riskBasedContract')
            ) {
                object.riskBasedContract = message.riskBasedContract;
                if (options.oneofs)
                    object._riskBasedContract = 'riskBasedContract';
            }
            if (
                message.populationCovered != null &&
                message.hasOwnProperty('populationCovered')
            ) {
                object.populationCovered =
                    options.enums === String
                        ? $root.mcreviewproto.PopulationCovered[
                              message.populationCovered
                          ] === undefined
                            ? message.populationCovered
                            : $root.mcreviewproto.PopulationCovered[
                                  message.populationCovered
                              ]
                        : message.populationCovered;
                if (options.oneofs)
                    object._populationCovered = 'populationCovered';
            }
            if (message.rateInfos && message.rateInfos.length) {
                object.rateInfos = [];
                for (let j = 0; j < message.rateInfos.length; ++j)
                    object.rateInfos[j] = $root.mcreviewproto.RateInfo.toObject(
                        message.rateInfos[j],
                        options
                    );
            }
            return object;
        };

        /**
         * Converts this HealthPlanFormData to JSON.
         * @function toJSON
         * @memberof mcreviewproto.HealthPlanFormData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HealthPlanFormData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(
                this,
                $protobuf.util.toJSONOptions
            );
        };

        /**
         * Gets the default type url for HealthPlanFormData
         * @function getTypeUrl
         * @memberof mcreviewproto.HealthPlanFormData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        HealthPlanFormData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = 'type.googleapis.com';
            }
            return typeUrlPrefix + '/mcreviewproto.HealthPlanFormData';
        };

        return HealthPlanFormData;
    })();

    /**
     * Submission related enums
     * @name mcreviewproto.SubmissionType
     * @enum {number}
     * @property {number} SUBMISSION_TYPE_UNSPECIFIED=0 SUBMISSION_TYPE_UNSPECIFIED value
     * @property {number} SUBMISSION_TYPE_CONTRACT_ONLY=1 SUBMISSION_TYPE_CONTRACT_ONLY value
     * @property {number} SUBMISSION_TYPE_CONTRACT_AND_RATES=3 SUBMISSION_TYPE_CONTRACT_AND_RATES value
     */
    mcreviewproto.SubmissionType = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'SUBMISSION_TYPE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'SUBMISSION_TYPE_CONTRACT_ONLY')] = 1;
        values[(valuesById[3] = 'SUBMISSION_TYPE_CONTRACT_AND_RATES')] = 3;
        return values;
    })();

    mcreviewproto.Date = (function () {
        /**
         * Properties of a Date.
         * @memberof mcreviewproto
         * @interface IDate
         * @property {number|null} [year] Date year
         * @property {number|null} [month] Date month
         * @property {number|null} [day] Date day
         */

        /**
         * Constructs a new Date.
         * @memberof mcreviewproto
         * @classdesc Represents a Date.
         * @implements IDate
         * @constructor
         * @param {mcreviewproto.IDate=} [properties] Properties to set
         */
        function Date(properties) {
            if (properties)
                for (
                    let keys = Object.keys(properties), i = 0;
                    i < keys.length;
                    ++i
                )
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Date year.
         * @member {number|null|undefined} year
         * @memberof mcreviewproto.Date
         * @instance
         */
        Date.prototype.year = null;

        /**
         * Date month.
         * @member {number|null|undefined} month
         * @memberof mcreviewproto.Date
         * @instance
         */
        Date.prototype.month = null;

        /**
         * Date day.
         * @member {number|null|undefined} day
         * @memberof mcreviewproto.Date
         * @instance
         */
        Date.prototype.day = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Date _year.
         * @member {"year"|undefined} _year
         * @memberof mcreviewproto.Date
         * @instance
         */
        Object.defineProperty(Date.prototype, '_year', {
            get: $util.oneOfGetter(($oneOfFields = ['year'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Date _month.
         * @member {"month"|undefined} _month
         * @memberof mcreviewproto.Date
         * @instance
         */
        Object.defineProperty(Date.prototype, '_month', {
            get: $util.oneOfGetter(($oneOfFields = ['month'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Date _day.
         * @member {"day"|undefined} _day
         * @memberof mcreviewproto.Date
         * @instance
         */
        Object.defineProperty(Date.prototype, '_day', {
            get: $util.oneOfGetter(($oneOfFields = ['day'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new Date instance using the specified properties.
         * @function create
         * @memberof mcreviewproto.Date
         * @static
         * @param {mcreviewproto.IDate=} [properties] Properties to set
         * @returns {mcreviewproto.Date} Date instance
         */
        Date.create = function create(properties) {
            return new Date(properties);
        };

        /**
         * Encodes the specified Date message. Does not implicitly {@link mcreviewproto.Date.verify|verify} messages.
         * @function encode
         * @memberof mcreviewproto.Date
         * @static
         * @param {mcreviewproto.IDate} message Date message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Date.encode = function encode(message, writer) {
            if (!writer) writer = $Writer.create();
            if (
                message.year != null &&
                Object.hasOwnProperty.call(message, 'year')
            )
                writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.year);
            if (
                message.month != null &&
                Object.hasOwnProperty.call(message, 'month')
            )
                writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.month);
            if (
                message.day != null &&
                Object.hasOwnProperty.call(message, 'day')
            )
                writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.day);
            return writer;
        };

        /**
         * Encodes the specified Date message, length delimited. Does not implicitly {@link mcreviewproto.Date.verify|verify} messages.
         * @function encodeDelimited
         * @memberof mcreviewproto.Date
         * @static
         * @param {mcreviewproto.IDate} message Date message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Date.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Date message from the specified reader or buffer.
         * @function decode
         * @memberof mcreviewproto.Date
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {mcreviewproto.Date} Date
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Date.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length,
                message = new $root.mcreviewproto.Date();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1: {
                        message.year = reader.int32();
                        break;
                    }
                    case 2: {
                        message.month = reader.int32();
                        break;
                    }
                    case 3: {
                        message.day = reader.int32();
                        break;
                    }
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        };

        /**
         * Decodes a Date message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof mcreviewproto.Date
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {mcreviewproto.Date} Date
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Date.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader)) reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Date message.
         * @function verify
         * @memberof mcreviewproto.Date
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Date.verify = function verify(message) {
            if (typeof message !== 'object' || message === null)
                return 'object expected';
            let properties = {};
            if (message.year != null && message.hasOwnProperty('year')) {
                properties._year = 1;
                if (!$util.isInteger(message.year))
                    return 'year: integer expected';
            }
            if (message.month != null && message.hasOwnProperty('month')) {
                properties._month = 1;
                if (!$util.isInteger(message.month))
                    return 'month: integer expected';
            }
            if (message.day != null && message.hasOwnProperty('day')) {
                properties._day = 1;
                if (!$util.isInteger(message.day))
                    return 'day: integer expected';
            }
            return null;
        };

        /**
         * Creates a Date message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof mcreviewproto.Date
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {mcreviewproto.Date} Date
         */
        Date.fromObject = function fromObject(object) {
            if (object instanceof $root.mcreviewproto.Date) return object;
            let message = new $root.mcreviewproto.Date();
            if (object.year != null) message.year = object.year | 0;
            if (object.month != null) message.month = object.month | 0;
            if (object.day != null) message.day = object.day | 0;
            return message;
        };

        /**
         * Creates a plain object from a Date message. Also converts values to other types if specified.
         * @function toObject
         * @memberof mcreviewproto.Date
         * @static
         * @param {mcreviewproto.Date} message Date
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Date.toObject = function toObject(message, options) {
            if (!options) options = {};
            let object = {};
            if (message.year != null && message.hasOwnProperty('year')) {
                object.year = message.year;
                if (options.oneofs) object._year = 'year';
            }
            if (message.month != null && message.hasOwnProperty('month')) {
                object.month = message.month;
                if (options.oneofs) object._month = 'month';
            }
            if (message.day != null && message.hasOwnProperty('day')) {
                object.day = message.day;
                if (options.oneofs) object._day = 'day';
            }
            return object;
        };

        /**
         * Converts this Date to JSON.
         * @function toJSON
         * @memberof mcreviewproto.Date
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Date.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(
                this,
                $protobuf.util.toJSONOptions
            );
        };

        /**
         * Gets the default type url for Date
         * @function getTypeUrl
         * @memberof mcreviewproto.Date
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Date.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = 'type.googleapis.com';
            }
            return typeUrlPrefix + '/mcreviewproto.Date';
        };

        return Date;
    })();

    /**
     * SubmissionStatus enum.
     * @name mcreviewproto.SubmissionStatus
     * @enum {number}
     * @property {number} SUBMISSION_STATUS_UNSPECIFIED=0 SUBMISSION_STATUS_UNSPECIFIED value
     * @property {number} SUBMISSION_STATUS_DRAFT=1 SUBMISSION_STATUS_DRAFT value
     * @property {number} SUBMISSION_STATUS_SUBMITTED=2 SUBMISSION_STATUS_SUBMITTED value
     */
    mcreviewproto.SubmissionStatus = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'SUBMISSION_STATUS_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'SUBMISSION_STATUS_DRAFT')] = 1;
        values[(valuesById[2] = 'SUBMISSION_STATUS_SUBMITTED')] = 2;
        return values;
    })();

    /**
     * PopulationCovered enum.
     * @name mcreviewproto.PopulationCovered
     * @enum {number}
     * @property {number} POPULATION_COVERED_UNSPECIFIED=0 POPULATION_COVERED_UNSPECIFIED value
     * @property {number} POPULATION_COVERED_MEDICAID=1 POPULATION_COVERED_MEDICAID value
     * @property {number} POPULATION_COVERED_CHIP=2 POPULATION_COVERED_CHIP value
     * @property {number} POPULATION_COVERED_MEDICAID_AND_CHIP=3 POPULATION_COVERED_MEDICAID_AND_CHIP value
     */
    mcreviewproto.PopulationCovered = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'POPULATION_COVERED_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'POPULATION_COVERED_MEDICAID')] = 1;
        values[(valuesById[2] = 'POPULATION_COVERED_CHIP')] = 2;
        values[(valuesById[3] = 'POPULATION_COVERED_MEDICAID_AND_CHIP')] = 3;
        return values;
    })();

    mcreviewproto.Contact = (function () {
        /**
         * Properties of a Contact.
         * @memberof mcreviewproto
         * @interface IContact
         * @property {string|null} [name] Contact name
         * @property {string|null} [titleRole] Contact titleRole
         * @property {string|null} [email] Contact email
         * @property {string|null} [id] Contact id
         */

        /**
         * Constructs a new Contact.
         * @memberof mcreviewproto
         * @classdesc Represents a Contact.
         * @implements IContact
         * @constructor
         * @param {mcreviewproto.IContact=} [properties] Properties to set
         */
        function Contact(properties) {
            if (properties)
                for (
                    let keys = Object.keys(properties), i = 0;
                    i < keys.length;
                    ++i
                )
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Contact name.
         * @member {string|null|undefined} name
         * @memberof mcreviewproto.Contact
         * @instance
         */
        Contact.prototype.name = null;

        /**
         * Contact titleRole.
         * @member {string|null|undefined} titleRole
         * @memberof mcreviewproto.Contact
         * @instance
         */
        Contact.prototype.titleRole = null;

        /**
         * Contact email.
         * @member {string|null|undefined} email
         * @memberof mcreviewproto.Contact
         * @instance
         */
        Contact.prototype.email = null;

        /**
         * Contact id.
         * @member {string|null|undefined} id
         * @memberof mcreviewproto.Contact
         * @instance
         */
        Contact.prototype.id = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Contact _name.
         * @member {"name"|undefined} _name
         * @memberof mcreviewproto.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, '_name', {
            get: $util.oneOfGetter(($oneOfFields = ['name'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Contact _titleRole.
         * @member {"titleRole"|undefined} _titleRole
         * @memberof mcreviewproto.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, '_titleRole', {
            get: $util.oneOfGetter(($oneOfFields = ['titleRole'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Contact _email.
         * @member {"email"|undefined} _email
         * @memberof mcreviewproto.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, '_email', {
            get: $util.oneOfGetter(($oneOfFields = ['email'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Contact _id.
         * @member {"id"|undefined} _id
         * @memberof mcreviewproto.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, '_id', {
            get: $util.oneOfGetter(($oneOfFields = ['id'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new Contact instance using the specified properties.
         * @function create
         * @memberof mcreviewproto.Contact
         * @static
         * @param {mcreviewproto.IContact=} [properties] Properties to set
         * @returns {mcreviewproto.Contact} Contact instance
         */
        Contact.create = function create(properties) {
            return new Contact(properties);
        };

        /**
         * Encodes the specified Contact message. Does not implicitly {@link mcreviewproto.Contact.verify|verify} messages.
         * @function encode
         * @memberof mcreviewproto.Contact
         * @static
         * @param {mcreviewproto.IContact} message Contact message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Contact.encode = function encode(message, writer) {
            if (!writer) writer = $Writer.create();
            if (
                message.name != null &&
                Object.hasOwnProperty.call(message, 'name')
            )
                writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.name);
            if (
                message.titleRole != null &&
                Object.hasOwnProperty.call(message, 'titleRole')
            )
                writer
                    .uint32(/* id 2, wireType 2 =*/ 18)
                    .string(message.titleRole);
            if (
                message.email != null &&
                Object.hasOwnProperty.call(message, 'email')
            )
                writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.email);
            if (message.id != null && Object.hasOwnProperty.call(message, 'id'))
                writer.uint32(/* id 4, wireType 2 =*/ 34).string(message.id);
            return writer;
        };

        /**
         * Encodes the specified Contact message, length delimited. Does not implicitly {@link mcreviewproto.Contact.verify|verify} messages.
         * @function encodeDelimited
         * @memberof mcreviewproto.Contact
         * @static
         * @param {mcreviewproto.IContact} message Contact message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Contact.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Contact message from the specified reader or buffer.
         * @function decode
         * @memberof mcreviewproto.Contact
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {mcreviewproto.Contact} Contact
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Contact.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length,
                message = new $root.mcreviewproto.Contact();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1: {
                        message.name = reader.string();
                        break;
                    }
                    case 2: {
                        message.titleRole = reader.string();
                        break;
                    }
                    case 3: {
                        message.email = reader.string();
                        break;
                    }
                    case 4: {
                        message.id = reader.string();
                        break;
                    }
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        };

        /**
         * Decodes a Contact message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof mcreviewproto.Contact
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {mcreviewproto.Contact} Contact
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Contact.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader)) reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Contact message.
         * @function verify
         * @memberof mcreviewproto.Contact
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Contact.verify = function verify(message) {
            if (typeof message !== 'object' || message === null)
                return 'object expected';
            let properties = {};
            if (message.name != null && message.hasOwnProperty('name')) {
                properties._name = 1;
                if (!$util.isString(message.name))
                    return 'name: string expected';
            }
            if (
                message.titleRole != null &&
                message.hasOwnProperty('titleRole')
            ) {
                properties._titleRole = 1;
                if (!$util.isString(message.titleRole))
                    return 'titleRole: string expected';
            }
            if (message.email != null && message.hasOwnProperty('email')) {
                properties._email = 1;
                if (!$util.isString(message.email))
                    return 'email: string expected';
            }
            if (message.id != null && message.hasOwnProperty('id')) {
                properties._id = 1;
                if (!$util.isString(message.id)) return 'id: string expected';
            }
            return null;
        };

        /**
         * Creates a Contact message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof mcreviewproto.Contact
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {mcreviewproto.Contact} Contact
         */
        Contact.fromObject = function fromObject(object) {
            if (object instanceof $root.mcreviewproto.Contact) return object;
            let message = new $root.mcreviewproto.Contact();
            if (object.name != null) message.name = String(object.name);
            if (object.titleRole != null)
                message.titleRole = String(object.titleRole);
            if (object.email != null) message.email = String(object.email);
            if (object.id != null) message.id = String(object.id);
            return message;
        };

        /**
         * Creates a plain object from a Contact message. Also converts values to other types if specified.
         * @function toObject
         * @memberof mcreviewproto.Contact
         * @static
         * @param {mcreviewproto.Contact} message Contact
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Contact.toObject = function toObject(message, options) {
            if (!options) options = {};
            let object = {};
            if (message.name != null && message.hasOwnProperty('name')) {
                object.name = message.name;
                if (options.oneofs) object._name = 'name';
            }
            if (
                message.titleRole != null &&
                message.hasOwnProperty('titleRole')
            ) {
                object.titleRole = message.titleRole;
                if (options.oneofs) object._titleRole = 'titleRole';
            }
            if (message.email != null && message.hasOwnProperty('email')) {
                object.email = message.email;
                if (options.oneofs) object._email = 'email';
            }
            if (message.id != null && message.hasOwnProperty('id')) {
                object.id = message.id;
                if (options.oneofs) object._id = 'id';
            }
            return object;
        };

        /**
         * Converts this Contact to JSON.
         * @function toJSON
         * @memberof mcreviewproto.Contact
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Contact.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(
                this,
                $protobuf.util.toJSONOptions
            );
        };

        /**
         * Gets the default type url for Contact
         * @function getTypeUrl
         * @memberof mcreviewproto.Contact
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Contact.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = 'type.googleapis.com';
            }
            return typeUrlPrefix + '/mcreviewproto.Contact';
        };

        return Contact;
    })();

    mcreviewproto.ContractInfo = (function () {
        /**
         * Properties of a ContractInfo.
         * @memberof mcreviewproto
         * @interface IContractInfo
         * @property {mcreviewproto.ContractType|null} [contractType] ContractInfo contractType
         * @property {mcreviewproto.IDate|null} [contractDateStart] ContractInfo contractDateStart
         * @property {mcreviewproto.IDate|null} [contractDateEnd] ContractInfo contractDateEnd
         * @property {Array.<mcreviewproto.ManagedCareEntity>|null} [managedCareEntities] ContractInfo managedCareEntities
         * @property {Array.<mcreviewproto.FederalAuthority>|null} [federalAuthorities] ContractInfo federalAuthorities
         * @property {Array.<mcreviewproto.IDocument>|null} [contractDocuments] ContractInfo contractDocuments
         * @property {mcreviewproto.ContractExecutionStatus|null} [contractExecutionStatus] ContractInfo contractExecutionStatus
         * @property {boolean|null} [statutoryRegulatoryAttestation] ContractInfo statutoryRegulatoryAttestation
         * @property {string|null} [statutoryRegulatoryAttestationDescription] ContractInfo statutoryRegulatoryAttestationDescription
         * @property {mcreviewproto.ContractInfo.IContractAmendmentInfo|null} [contractAmendmentInfo] ContractInfo contractAmendmentInfo
         */

        /**
         * Constructs a new ContractInfo.
         * @memberof mcreviewproto
         * @classdesc Represents a ContractInfo.
         * @implements IContractInfo
         * @constructor
         * @param {mcreviewproto.IContractInfo=} [properties] Properties to set
         */
        function ContractInfo(properties) {
            this.managedCareEntities = [];
            this.federalAuthorities = [];
            this.contractDocuments = [];
            if (properties)
                for (
                    let keys = Object.keys(properties), i = 0;
                    i < keys.length;
                    ++i
                )
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ContractInfo contractType.
         * @member {mcreviewproto.ContractType|null|undefined} contractType
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        ContractInfo.prototype.contractType = null;

        /**
         * ContractInfo contractDateStart.
         * @member {mcreviewproto.IDate|null|undefined} contractDateStart
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        ContractInfo.prototype.contractDateStart = null;

        /**
         * ContractInfo contractDateEnd.
         * @member {mcreviewproto.IDate|null|undefined} contractDateEnd
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        ContractInfo.prototype.contractDateEnd = null;

        /**
         * ContractInfo managedCareEntities.
         * @member {Array.<mcreviewproto.ManagedCareEntity>} managedCareEntities
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        ContractInfo.prototype.managedCareEntities = $util.emptyArray;

        /**
         * ContractInfo federalAuthorities.
         * @member {Array.<mcreviewproto.FederalAuthority>} federalAuthorities
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        ContractInfo.prototype.federalAuthorities = $util.emptyArray;

        /**
         * ContractInfo contractDocuments.
         * @member {Array.<mcreviewproto.IDocument>} contractDocuments
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        ContractInfo.prototype.contractDocuments = $util.emptyArray;

        /**
         * ContractInfo contractExecutionStatus.
         * @member {mcreviewproto.ContractExecutionStatus|null|undefined} contractExecutionStatus
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        ContractInfo.prototype.contractExecutionStatus = null;

        /**
         * ContractInfo statutoryRegulatoryAttestation.
         * @member {boolean|null|undefined} statutoryRegulatoryAttestation
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        ContractInfo.prototype.statutoryRegulatoryAttestation = null;

        /**
         * ContractInfo statutoryRegulatoryAttestationDescription.
         * @member {string|null|undefined} statutoryRegulatoryAttestationDescription
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        ContractInfo.prototype.statutoryRegulatoryAttestationDescription = null;

        /**
         * ContractInfo contractAmendmentInfo.
         * @member {mcreviewproto.ContractInfo.IContractAmendmentInfo|null|undefined} contractAmendmentInfo
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        ContractInfo.prototype.contractAmendmentInfo = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * ContractInfo _contractType.
         * @member {"contractType"|undefined} _contractType
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        Object.defineProperty(ContractInfo.prototype, '_contractType', {
            get: $util.oneOfGetter(($oneOfFields = ['contractType'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * ContractInfo _contractDateStart.
         * @member {"contractDateStart"|undefined} _contractDateStart
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        Object.defineProperty(ContractInfo.prototype, '_contractDateStart', {
            get: $util.oneOfGetter(($oneOfFields = ['contractDateStart'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * ContractInfo _contractDateEnd.
         * @member {"contractDateEnd"|undefined} _contractDateEnd
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        Object.defineProperty(ContractInfo.prototype, '_contractDateEnd', {
            get: $util.oneOfGetter(($oneOfFields = ['contractDateEnd'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * ContractInfo _contractExecutionStatus.
         * @member {"contractExecutionStatus"|undefined} _contractExecutionStatus
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        Object.defineProperty(
            ContractInfo.prototype,
            '_contractExecutionStatus',
            {
                get: $util.oneOfGetter(
                    ($oneOfFields = ['contractExecutionStatus'])
                ),
                set: $util.oneOfSetter($oneOfFields),
            }
        );

        /**
         * ContractInfo _statutoryRegulatoryAttestation.
         * @member {"statutoryRegulatoryAttestation"|undefined} _statutoryRegulatoryAttestation
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        Object.defineProperty(
            ContractInfo.prototype,
            '_statutoryRegulatoryAttestation',
            {
                get: $util.oneOfGetter(
                    ($oneOfFields = ['statutoryRegulatoryAttestation'])
                ),
                set: $util.oneOfSetter($oneOfFields),
            }
        );

        /**
         * ContractInfo _statutoryRegulatoryAttestationDescription.
         * @member {"statutoryRegulatoryAttestationDescription"|undefined} _statutoryRegulatoryAttestationDescription
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        Object.defineProperty(
            ContractInfo.prototype,
            '_statutoryRegulatoryAttestationDescription',
            {
                get: $util.oneOfGetter(
                    ($oneOfFields = [
                        'statutoryRegulatoryAttestationDescription',
                    ])
                ),
                set: $util.oneOfSetter($oneOfFields),
            }
        );

        /**
         * ContractInfo _contractAmendmentInfo.
         * @member {"contractAmendmentInfo"|undefined} _contractAmendmentInfo
         * @memberof mcreviewproto.ContractInfo
         * @instance
         */
        Object.defineProperty(
            ContractInfo.prototype,
            '_contractAmendmentInfo',
            {
                get: $util.oneOfGetter(
                    ($oneOfFields = ['contractAmendmentInfo'])
                ),
                set: $util.oneOfSetter($oneOfFields),
            }
        );

        /**
         * Creates a new ContractInfo instance using the specified properties.
         * @function create
         * @memberof mcreviewproto.ContractInfo
         * @static
         * @param {mcreviewproto.IContractInfo=} [properties] Properties to set
         * @returns {mcreviewproto.ContractInfo} ContractInfo instance
         */
        ContractInfo.create = function create(properties) {
            return new ContractInfo(properties);
        };

        /**
         * Encodes the specified ContractInfo message. Does not implicitly {@link mcreviewproto.ContractInfo.verify|verify} messages.
         * @function encode
         * @memberof mcreviewproto.ContractInfo
         * @static
         * @param {mcreviewproto.IContractInfo} message ContractInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ContractInfo.encode = function encode(message, writer) {
            if (!writer) writer = $Writer.create();
            if (
                message.contractType != null &&
                Object.hasOwnProperty.call(message, 'contractType')
            )
                writer
                    .uint32(/* id 1, wireType 0 =*/ 8)
                    .int32(message.contractType);
            if (
                message.contractDateStart != null &&
                Object.hasOwnProperty.call(message, 'contractDateStart')
            )
                $root.mcreviewproto.Date.encode(
                    message.contractDateStart,
                    writer.uint32(/* id 2, wireType 2 =*/ 18).fork()
                ).ldelim();
            if (
                message.contractDateEnd != null &&
                Object.hasOwnProperty.call(message, 'contractDateEnd')
            )
                $root.mcreviewproto.Date.encode(
                    message.contractDateEnd,
                    writer.uint32(/* id 3, wireType 2 =*/ 26).fork()
                ).ldelim();
            if (
                message.managedCareEntities != null &&
                message.managedCareEntities.length
            ) {
                writer.uint32(/* id 4, wireType 2 =*/ 34).fork();
                for (let i = 0; i < message.managedCareEntities.length; ++i)
                    writer.int32(message.managedCareEntities[i]);
                writer.ldelim();
            }
            if (
                message.federalAuthorities != null &&
                message.federalAuthorities.length
            ) {
                writer.uint32(/* id 5, wireType 2 =*/ 42).fork();
                for (let i = 0; i < message.federalAuthorities.length; ++i)
                    writer.int32(message.federalAuthorities[i]);
                writer.ldelim();
            }
            if (
                message.contractDocuments != null &&
                message.contractDocuments.length
            )
                for (let i = 0; i < message.contractDocuments.length; ++i)
                    $root.mcreviewproto.Document.encode(
                        message.contractDocuments[i],
                        writer.uint32(/* id 6, wireType 2 =*/ 50).fork()
                    ).ldelim();
            if (
                message.contractExecutionStatus != null &&
                Object.hasOwnProperty.call(message, 'contractExecutionStatus')
            )
                writer
                    .uint32(/* id 7, wireType 0 =*/ 56)
                    .int32(message.contractExecutionStatus);
            if (
                message.statutoryRegulatoryAttestation != null &&
                Object.hasOwnProperty.call(
                    message,
                    'statutoryRegulatoryAttestation'
                )
            )
                writer
                    .uint32(/* id 8, wireType 0 =*/ 64)
                    .bool(message.statutoryRegulatoryAttestation);
            if (
                message.statutoryRegulatoryAttestationDescription != null &&
                Object.hasOwnProperty.call(
                    message,
                    'statutoryRegulatoryAttestationDescription'
                )
            )
                writer
                    .uint32(/* id 9, wireType 2 =*/ 74)
                    .string(message.statutoryRegulatoryAttestationDescription);
            if (
                message.contractAmendmentInfo != null &&
                Object.hasOwnProperty.call(message, 'contractAmendmentInfo')
            )
                $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.encode(
                    message.contractAmendmentInfo,
                    writer.uint32(/* id 50, wireType 2 =*/ 402).fork()
                ).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ContractInfo message, length delimited. Does not implicitly {@link mcreviewproto.ContractInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof mcreviewproto.ContractInfo
         * @static
         * @param {mcreviewproto.IContractInfo} message ContractInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ContractInfo.encodeDelimited = function encodeDelimited(
            message,
            writer
        ) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ContractInfo message from the specified reader or buffer.
         * @function decode
         * @memberof mcreviewproto.ContractInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {mcreviewproto.ContractInfo} ContractInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ContractInfo.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length,
                message = new $root.mcreviewproto.ContractInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1: {
                        message.contractType = reader.int32();
                        break;
                    }
                    case 2: {
                        message.contractDateStart =
                            $root.mcreviewproto.Date.decode(
                                reader,
                                reader.uint32()
                            );
                        break;
                    }
                    case 3: {
                        message.contractDateEnd =
                            $root.mcreviewproto.Date.decode(
                                reader,
                                reader.uint32()
                            );
                        break;
                    }
                    case 4: {
                        if (
                            !(
                                message.managedCareEntities &&
                                message.managedCareEntities.length
                            )
                        )
                            message.managedCareEntities = [];
                        if ((tag & 7) === 2) {
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.managedCareEntities.push(
                                    reader.int32()
                                );
                        } else message.managedCareEntities.push(reader.int32());
                        break;
                    }
                    case 5: {
                        if (
                            !(
                                message.federalAuthorities &&
                                message.federalAuthorities.length
                            )
                        )
                            message.federalAuthorities = [];
                        if ((tag & 7) === 2) {
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.federalAuthorities.push(reader.int32());
                        } else message.federalAuthorities.push(reader.int32());
                        break;
                    }
                    case 6: {
                        if (
                            !(
                                message.contractDocuments &&
                                message.contractDocuments.length
                            )
                        )
                            message.contractDocuments = [];
                        message.contractDocuments.push(
                            $root.mcreviewproto.Document.decode(
                                reader,
                                reader.uint32()
                            )
                        );
                        break;
                    }
                    case 7: {
                        message.contractExecutionStatus = reader.int32();
                        break;
                    }
                    case 8: {
                        message.statutoryRegulatoryAttestation = reader.bool();
                        break;
                    }
                    case 9: {
                        message.statutoryRegulatoryAttestationDescription =
                            reader.string();
                        break;
                    }
                    case 50: {
                        message.contractAmendmentInfo =
                            $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.decode(
                                reader,
                                reader.uint32()
                            );
                        break;
                    }
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        };

        /**
         * Decodes a ContractInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof mcreviewproto.ContractInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {mcreviewproto.ContractInfo} ContractInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ContractInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader)) reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ContractInfo message.
         * @function verify
         * @memberof mcreviewproto.ContractInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ContractInfo.verify = function verify(message) {
            if (typeof message !== 'object' || message === null)
                return 'object expected';
            let properties = {};
            if (
                message.contractType != null &&
                message.hasOwnProperty('contractType')
            ) {
                properties._contractType = 1;
                switch (message.contractType) {
                    default:
                        return 'contractType: enum value expected';
                    case 0:
                    case 1:
                    case 2:
                        break;
                }
            }
            if (
                message.contractDateStart != null &&
                message.hasOwnProperty('contractDateStart')
            ) {
                properties._contractDateStart = 1;
                {
                    let error = $root.mcreviewproto.Date.verify(
                        message.contractDateStart
                    );
                    if (error) return 'contractDateStart.' + error;
                }
            }
            if (
                message.contractDateEnd != null &&
                message.hasOwnProperty('contractDateEnd')
            ) {
                properties._contractDateEnd = 1;
                {
                    let error = $root.mcreviewproto.Date.verify(
                        message.contractDateEnd
                    );
                    if (error) return 'contractDateEnd.' + error;
                }
            }
            if (
                message.managedCareEntities != null &&
                message.hasOwnProperty('managedCareEntities')
            ) {
                if (!Array.isArray(message.managedCareEntities))
                    return 'managedCareEntities: array expected';
                for (let i = 0; i < message.managedCareEntities.length; ++i)
                    switch (message.managedCareEntities[i]) {
                        default:
                            return 'managedCareEntities: enum value[] expected';
                        case 0:
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                            break;
                    }
            }
            if (
                message.federalAuthorities != null &&
                message.hasOwnProperty('federalAuthorities')
            ) {
                if (!Array.isArray(message.federalAuthorities))
                    return 'federalAuthorities: array expected';
                for (let i = 0; i < message.federalAuthorities.length; ++i)
                    switch (message.federalAuthorities[i]) {
                        default:
                            return 'federalAuthorities: enum value[] expected';
                        case 0:
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                        case 5:
                        case 6:
                            break;
                    }
            }
            if (
                message.contractDocuments != null &&
                message.hasOwnProperty('contractDocuments')
            ) {
                if (!Array.isArray(message.contractDocuments))
                    return 'contractDocuments: array expected';
                for (let i = 0; i < message.contractDocuments.length; ++i) {
                    let error = $root.mcreviewproto.Document.verify(
                        message.contractDocuments[i]
                    );
                    if (error) return 'contractDocuments.' + error;
                }
            }
            if (
                message.contractExecutionStatus != null &&
                message.hasOwnProperty('contractExecutionStatus')
            ) {
                properties._contractExecutionStatus = 1;
                switch (message.contractExecutionStatus) {
                    default:
                        return 'contractExecutionStatus: enum value expected';
                    case 0:
                    case 1:
                    case 2:
                        break;
                }
            }
            if (
                message.statutoryRegulatoryAttestation != null &&
                message.hasOwnProperty('statutoryRegulatoryAttestation')
            ) {
                properties._statutoryRegulatoryAttestation = 1;
                if (typeof message.statutoryRegulatoryAttestation !== 'boolean')
                    return 'statutoryRegulatoryAttestation: boolean expected';
            }
            if (
                message.statutoryRegulatoryAttestationDescription != null &&
                message.hasOwnProperty(
                    'statutoryRegulatoryAttestationDescription'
                )
            ) {
                properties._statutoryRegulatoryAttestationDescription = 1;
                if (
                    !$util.isString(
                        message.statutoryRegulatoryAttestationDescription
                    )
                )
                    return 'statutoryRegulatoryAttestationDescription: string expected';
            }
            if (
                message.contractAmendmentInfo != null &&
                message.hasOwnProperty('contractAmendmentInfo')
            ) {
                properties._contractAmendmentInfo = 1;
                {
                    let error =
                        $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.verify(
                            message.contractAmendmentInfo
                        );
                    if (error) return 'contractAmendmentInfo.' + error;
                }
            }
            return null;
        };

        /**
         * Creates a ContractInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof mcreviewproto.ContractInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {mcreviewproto.ContractInfo} ContractInfo
         */
        ContractInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.mcreviewproto.ContractInfo)
                return object;
            let message = new $root.mcreviewproto.ContractInfo();
            switch (object.contractType) {
                default:
                    if (typeof object.contractType === 'number') {
                        message.contractType = object.contractType;
                        break;
                    }
                    break;
                case 'CONTRACT_TYPE_UNSPECIFIED':
                case 0:
                    message.contractType = 0;
                    break;
                case 'CONTRACT_TYPE_BASE':
                case 1:
                    message.contractType = 1;
                    break;
                case 'CONTRACT_TYPE_AMENDMENT':
                case 2:
                    message.contractType = 2;
                    break;
            }
            if (object.contractDateStart != null) {
                if (typeof object.contractDateStart !== 'object')
                    throw TypeError(
                        '.mcreviewproto.ContractInfo.contractDateStart: object expected'
                    );
                message.contractDateStart = $root.mcreviewproto.Date.fromObject(
                    object.contractDateStart
                );
            }
            if (object.contractDateEnd != null) {
                if (typeof object.contractDateEnd !== 'object')
                    throw TypeError(
                        '.mcreviewproto.ContractInfo.contractDateEnd: object expected'
                    );
                message.contractDateEnd = $root.mcreviewproto.Date.fromObject(
                    object.contractDateEnd
                );
            }
            if (object.managedCareEntities) {
                if (!Array.isArray(object.managedCareEntities))
                    throw TypeError(
                        '.mcreviewproto.ContractInfo.managedCareEntities: array expected'
                    );
                message.managedCareEntities = [];
                for (let i = 0; i < object.managedCareEntities.length; ++i)
                    switch (object.managedCareEntities[i]) {
                        default:
                            if (
                                typeof object.managedCareEntities[i] ===
                                'number'
                            ) {
                                message.managedCareEntities[i] =
                                    object.managedCareEntities[i];
                                break;
                            }
                        case 'MANAGED_CARE_ENTITY_UNSPECIFIED':
                        case 0:
                            message.managedCareEntities[i] = 0;
                            break;
                        case 'MANAGED_CARE_ENTITY_MCO':
                        case 1:
                            message.managedCareEntities[i] = 1;
                            break;
                        case 'MANAGED_CARE_ENTITY_PIHP':
                        case 2:
                            message.managedCareEntities[i] = 2;
                            break;
                        case 'MANAGED_CARE_ENTITY_PAHP':
                        case 3:
                            message.managedCareEntities[i] = 3;
                            break;
                        case 'MANAGED_CARE_ENTITY_PCCM':
                        case 4:
                            message.managedCareEntities[i] = 4;
                            break;
                    }
            }
            if (object.federalAuthorities) {
                if (!Array.isArray(object.federalAuthorities))
                    throw TypeError(
                        '.mcreviewproto.ContractInfo.federalAuthorities: array expected'
                    );
                message.federalAuthorities = [];
                for (let i = 0; i < object.federalAuthorities.length; ++i)
                    switch (object.federalAuthorities[i]) {
                        default:
                            if (
                                typeof object.federalAuthorities[i] === 'number'
                            ) {
                                message.federalAuthorities[i] =
                                    object.federalAuthorities[i];
                                break;
                            }
                        case 'FEDERAL_AUTHORITY_UNSPECIFIED':
                        case 0:
                            message.federalAuthorities[i] = 0;
                            break;
                        case 'FEDERAL_AUTHORITY_STATE_PLAN':
                        case 1:
                            message.federalAuthorities[i] = 1;
                            break;
                        case 'FEDERAL_AUTHORITY_WAIVER_1915B':
                        case 2:
                            message.federalAuthorities[i] = 2;
                            break;
                        case 'FEDERAL_AUTHORITY_WAIVER_1115':
                        case 3:
                            message.federalAuthorities[i] = 3;
                            break;
                        case 'FEDERAL_AUTHORITY_VOLUNTARY':
                        case 4:
                            message.federalAuthorities[i] = 4;
                            break;
                        case 'FEDERAL_AUTHORITY_BENCHMARK':
                        case 5:
                            message.federalAuthorities[i] = 5;
                            break;
                        case 'FEDERAL_AUTHORITY_TITLE_XXI':
                        case 6:
                            message.federalAuthorities[i] = 6;
                            break;
                    }
            }
            if (object.contractDocuments) {
                if (!Array.isArray(object.contractDocuments))
                    throw TypeError(
                        '.mcreviewproto.ContractInfo.contractDocuments: array expected'
                    );
                message.contractDocuments = [];
                for (let i = 0; i < object.contractDocuments.length; ++i) {
                    if (typeof object.contractDocuments[i] !== 'object')
                        throw TypeError(
                            '.mcreviewproto.ContractInfo.contractDocuments: object expected'
                        );
                    message.contractDocuments[i] =
                        $root.mcreviewproto.Document.fromObject(
                            object.contractDocuments[i]
                        );
                }
            }
            switch (object.contractExecutionStatus) {
                default:
                    if (typeof object.contractExecutionStatus === 'number') {
                        message.contractExecutionStatus =
                            object.contractExecutionStatus;
                        break;
                    }
                    break;
                case 'CONTRACT_EXECUTION_STATUS_UNSPECIFIED':
                case 0:
                    message.contractExecutionStatus = 0;
                    break;
                case 'CONTRACT_EXECUTION_STATUS_EXECUTED':
                case 1:
                    message.contractExecutionStatus = 1;
                    break;
                case 'CONTRACT_EXECUTION_STATUS_UNEXECUTED':
                case 2:
                    message.contractExecutionStatus = 2;
                    break;
            }
            if (object.statutoryRegulatoryAttestation != null)
                message.statutoryRegulatoryAttestation = Boolean(
                    object.statutoryRegulatoryAttestation
                );
            if (object.statutoryRegulatoryAttestationDescription != null)
                message.statutoryRegulatoryAttestationDescription = String(
                    object.statutoryRegulatoryAttestationDescription
                );
            if (object.contractAmendmentInfo != null) {
                if (typeof object.contractAmendmentInfo !== 'object')
                    throw TypeError(
                        '.mcreviewproto.ContractInfo.contractAmendmentInfo: object expected'
                    );
                message.contractAmendmentInfo =
                    $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.fromObject(
                        object.contractAmendmentInfo
                    );
            }
            return message;
        };

        /**
         * Creates a plain object from a ContractInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof mcreviewproto.ContractInfo
         * @static
         * @param {mcreviewproto.ContractInfo} message ContractInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ContractInfo.toObject = function toObject(message, options) {
            if (!options) options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.managedCareEntities = [];
                object.federalAuthorities = [];
                object.contractDocuments = [];
            }
            if (
                message.contractType != null &&
                message.hasOwnProperty('contractType')
            ) {
                object.contractType =
                    options.enums === String
                        ? $root.mcreviewproto.ContractType[
                              message.contractType
                          ] === undefined
                            ? message.contractType
                            : $root.mcreviewproto.ContractType[
                                  message.contractType
                              ]
                        : message.contractType;
                if (options.oneofs) object._contractType = 'contractType';
            }
            if (
                message.contractDateStart != null &&
                message.hasOwnProperty('contractDateStart')
            ) {
                object.contractDateStart = $root.mcreviewproto.Date.toObject(
                    message.contractDateStart,
                    options
                );
                if (options.oneofs)
                    object._contractDateStart = 'contractDateStart';
            }
            if (
                message.contractDateEnd != null &&
                message.hasOwnProperty('contractDateEnd')
            ) {
                object.contractDateEnd = $root.mcreviewproto.Date.toObject(
                    message.contractDateEnd,
                    options
                );
                if (options.oneofs) object._contractDateEnd = 'contractDateEnd';
            }
            if (
                message.managedCareEntities &&
                message.managedCareEntities.length
            ) {
                object.managedCareEntities = [];
                for (let j = 0; j < message.managedCareEntities.length; ++j)
                    object.managedCareEntities[j] =
                        options.enums === String
                            ? $root.mcreviewproto.ManagedCareEntity[
                                  message.managedCareEntities[j]
                              ] === undefined
                                ? message.managedCareEntities[j]
                                : $root.mcreviewproto.ManagedCareEntity[
                                      message.managedCareEntities[j]
                                  ]
                            : message.managedCareEntities[j];
            }
            if (
                message.federalAuthorities &&
                message.federalAuthorities.length
            ) {
                object.federalAuthorities = [];
                for (let j = 0; j < message.federalAuthorities.length; ++j)
                    object.federalAuthorities[j] =
                        options.enums === String
                            ? $root.mcreviewproto.FederalAuthority[
                                  message.federalAuthorities[j]
                              ] === undefined
                                ? message.federalAuthorities[j]
                                : $root.mcreviewproto.FederalAuthority[
                                      message.federalAuthorities[j]
                                  ]
                            : message.federalAuthorities[j];
            }
            if (message.contractDocuments && message.contractDocuments.length) {
                object.contractDocuments = [];
                for (let j = 0; j < message.contractDocuments.length; ++j)
                    object.contractDocuments[j] =
                        $root.mcreviewproto.Document.toObject(
                            message.contractDocuments[j],
                            options
                        );
            }
            if (
                message.contractExecutionStatus != null &&
                message.hasOwnProperty('contractExecutionStatus')
            ) {
                object.contractExecutionStatus =
                    options.enums === String
                        ? $root.mcreviewproto.ContractExecutionStatus[
                              message.contractExecutionStatus
                          ] === undefined
                            ? message.contractExecutionStatus
                            : $root.mcreviewproto.ContractExecutionStatus[
                                  message.contractExecutionStatus
                              ]
                        : message.contractExecutionStatus;
                if (options.oneofs)
                    object._contractExecutionStatus = 'contractExecutionStatus';
            }
            if (
                message.statutoryRegulatoryAttestation != null &&
                message.hasOwnProperty('statutoryRegulatoryAttestation')
            ) {
                object.statutoryRegulatoryAttestation =
                    message.statutoryRegulatoryAttestation;
                if (options.oneofs)
                    object._statutoryRegulatoryAttestation =
                        'statutoryRegulatoryAttestation';
            }
            if (
                message.statutoryRegulatoryAttestationDescription != null &&
                message.hasOwnProperty(
                    'statutoryRegulatoryAttestationDescription'
                )
            ) {
                object.statutoryRegulatoryAttestationDescription =
                    message.statutoryRegulatoryAttestationDescription;
                if (options.oneofs)
                    object._statutoryRegulatoryAttestationDescription =
                        'statutoryRegulatoryAttestationDescription';
            }
            if (
                message.contractAmendmentInfo != null &&
                message.hasOwnProperty('contractAmendmentInfo')
            ) {
                object.contractAmendmentInfo =
                    $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.toObject(
                        message.contractAmendmentInfo,
                        options
                    );
                if (options.oneofs)
                    object._contractAmendmentInfo = 'contractAmendmentInfo';
            }
            return object;
        };

        /**
         * Converts this ContractInfo to JSON.
         * @function toJSON
         * @memberof mcreviewproto.ContractInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ContractInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(
                this,
                $protobuf.util.toJSONOptions
            );
        };

        /**
         * Gets the default type url for ContractInfo
         * @function getTypeUrl
         * @memberof mcreviewproto.ContractInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ContractInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = 'type.googleapis.com';
            }
            return typeUrlPrefix + '/mcreviewproto.ContractInfo';
        };

        ContractInfo.ContractAmendmentInfo = (function () {
            /**
             * Properties of a ContractAmendmentInfo.
             * @memberof mcreviewproto.ContractInfo
             * @interface IContractAmendmentInfo
             * @property {Array.<mcreviewproto.AmendedItem>|null} [amendableItems] ContractAmendmentInfo amendableItems
             * @property {string|null} [otherAmendableItem] ContractAmendmentInfo otherAmendableItem
             * @property {mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo|null} [capitationRatesAmendedInfo] ContractAmendmentInfo capitationRatesAmendedInfo
             * @property {mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions|null} [modifiedProvisions] ContractAmendmentInfo modifiedProvisions
             */

            /**
             * Constructs a new ContractAmendmentInfo.
             * @memberof mcreviewproto.ContractInfo
             * @classdesc Represents a ContractAmendmentInfo.
             * @implements IContractAmendmentInfo
             * @constructor
             * @param {mcreviewproto.ContractInfo.IContractAmendmentInfo=} [properties] Properties to set
             */
            function ContractAmendmentInfo(properties) {
                this.amendableItems = [];
                if (properties)
                    for (
                        let keys = Object.keys(properties), i = 0;
                        i < keys.length;
                        ++i
                    )
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ContractAmendmentInfo amendableItems.
             * @member {Array.<mcreviewproto.AmendedItem>} amendableItems
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @instance
             */
            ContractAmendmentInfo.prototype.amendableItems = $util.emptyArray;

            /**
             * ContractAmendmentInfo otherAmendableItem.
             * @member {string|null|undefined} otherAmendableItem
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @instance
             */
            ContractAmendmentInfo.prototype.otherAmendableItem = null;

            /**
             * ContractAmendmentInfo capitationRatesAmendedInfo.
             * @member {mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo|null|undefined} capitationRatesAmendedInfo
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @instance
             */
            ContractAmendmentInfo.prototype.capitationRatesAmendedInfo = null;

            /**
             * ContractAmendmentInfo modifiedProvisions.
             * @member {mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions|null|undefined} modifiedProvisions
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @instance
             */
            ContractAmendmentInfo.prototype.modifiedProvisions = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * ContractAmendmentInfo _otherAmendableItem.
             * @member {"otherAmendableItem"|undefined} _otherAmendableItem
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @instance
             */
            Object.defineProperty(
                ContractAmendmentInfo.prototype,
                '_otherAmendableItem',
                {
                    get: $util.oneOfGetter(
                        ($oneOfFields = ['otherAmendableItem'])
                    ),
                    set: $util.oneOfSetter($oneOfFields),
                }
            );

            /**
             * ContractAmendmentInfo _capitationRatesAmendedInfo.
             * @member {"capitationRatesAmendedInfo"|undefined} _capitationRatesAmendedInfo
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @instance
             */
            Object.defineProperty(
                ContractAmendmentInfo.prototype,
                '_capitationRatesAmendedInfo',
                {
                    get: $util.oneOfGetter(
                        ($oneOfFields = ['capitationRatesAmendedInfo'])
                    ),
                    set: $util.oneOfSetter($oneOfFields),
                }
            );

            /**
             * ContractAmendmentInfo _modifiedProvisions.
             * @member {"modifiedProvisions"|undefined} _modifiedProvisions
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @instance
             */
            Object.defineProperty(
                ContractAmendmentInfo.prototype,
                '_modifiedProvisions',
                {
                    get: $util.oneOfGetter(
                        ($oneOfFields = ['modifiedProvisions'])
                    ),
                    set: $util.oneOfSetter($oneOfFields),
                }
            );

            /**
             * Creates a new ContractAmendmentInfo instance using the specified properties.
             * @function create
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @static
             * @param {mcreviewproto.ContractInfo.IContractAmendmentInfo=} [properties] Properties to set
             * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo} ContractAmendmentInfo instance
             */
            ContractAmendmentInfo.create = function create(properties) {
                return new ContractAmendmentInfo(properties);
            };

            /**
             * Encodes the specified ContractAmendmentInfo message. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.verify|verify} messages.
             * @function encode
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @static
             * @param {mcreviewproto.ContractInfo.IContractAmendmentInfo} message ContractAmendmentInfo message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ContractAmendmentInfo.encode = function encode(message, writer) {
                if (!writer) writer = $Writer.create();
                if (
                    message.amendableItems != null &&
                    message.amendableItems.length
                ) {
                    writer.uint32(/* id 1, wireType 2 =*/ 10).fork();
                    for (let i = 0; i < message.amendableItems.length; ++i)
                        writer.int32(message.amendableItems[i]);
                    writer.ldelim();
                }
                if (
                    message.otherAmendableItem != null &&
                    Object.hasOwnProperty.call(message, 'otherAmendableItem')
                )
                    writer
                        .uint32(/* id 2, wireType 2 =*/ 18)
                        .string(message.otherAmendableItem);
                if (
                    message.capitationRatesAmendedInfo != null &&
                    Object.hasOwnProperty.call(
                        message,
                        'capitationRatesAmendedInfo'
                    )
                )
                    $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo.encode(
                        message.capitationRatesAmendedInfo,
                        writer.uint32(/* id 3, wireType 2 =*/ 26).fork()
                    ).ldelim();
                if (
                    message.modifiedProvisions != null &&
                    Object.hasOwnProperty.call(message, 'modifiedProvisions')
                )
                    $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions.encode(
                        message.modifiedProvisions,
                        writer.uint32(/* id 4, wireType 2 =*/ 34).fork()
                    ).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ContractAmendmentInfo message, length delimited. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.verify|verify} messages.
             * @function encodeDelimited
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @static
             * @param {mcreviewproto.ContractInfo.IContractAmendmentInfo} message ContractAmendmentInfo message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ContractAmendmentInfo.encodeDelimited = function encodeDelimited(
                message,
                writer
            ) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ContractAmendmentInfo message from the specified reader or buffer.
             * @function decode
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo} ContractAmendmentInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ContractAmendmentInfo.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end =
                        length === undefined ? reader.len : reader.pos + length,
                    message =
                        new $root.mcreviewproto.ContractInfo.ContractAmendmentInfo();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1: {
                            if (
                                !(
                                    message.amendableItems &&
                                    message.amendableItems.length
                                )
                            )
                                message.amendableItems = [];
                            if ((tag & 7) === 2) {
                                let end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.amendableItems.push(reader.int32());
                            } else message.amendableItems.push(reader.int32());
                            break;
                        }
                        case 2: {
                            message.otherAmendableItem = reader.string();
                            break;
                        }
                        case 3: {
                            message.capitationRatesAmendedInfo =
                                $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo.decode(
                                    reader,
                                    reader.uint32()
                                );
                            break;
                        }
                        case 4: {
                            message.modifiedProvisions =
                                $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions.decode(
                                    reader,
                                    reader.uint32()
                                );
                            break;
                        }
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ContractAmendmentInfo message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo} ContractAmendmentInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ContractAmendmentInfo.decodeDelimited = function decodeDelimited(
                reader
            ) {
                if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ContractAmendmentInfo message.
             * @function verify
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ContractAmendmentInfo.verify = function verify(message) {
                if (typeof message !== 'object' || message === null)
                    return 'object expected';
                let properties = {};
                if (
                    message.amendableItems != null &&
                    message.hasOwnProperty('amendableItems')
                ) {
                    if (!Array.isArray(message.amendableItems))
                        return 'amendableItems: array expected';
                    for (let i = 0; i < message.amendableItems.length; ++i)
                        switch (message.amendableItems[i]) {
                            default:
                                return 'amendableItems: enum value[] expected';
                            case 0:
                            case 1:
                            case 2:
                            case 3:
                            case 4:
                            case 5:
                            case 6:
                            case 7:
                            case 8:
                            case 9:
                            case 10:
                            case 11:
                            case 12:
                            case 13:
                            case 14:
                                break;
                        }
                }
                if (
                    message.otherAmendableItem != null &&
                    message.hasOwnProperty('otherAmendableItem')
                ) {
                    properties._otherAmendableItem = 1;
                    if (!$util.isString(message.otherAmendableItem))
                        return 'otherAmendableItem: string expected';
                }
                if (
                    message.capitationRatesAmendedInfo != null &&
                    message.hasOwnProperty('capitationRatesAmendedInfo')
                ) {
                    properties._capitationRatesAmendedInfo = 1;
                    {
                        let error =
                            $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo.verify(
                                message.capitationRatesAmendedInfo
                            );
                        if (error) return 'capitationRatesAmendedInfo.' + error;
                    }
                }
                if (
                    message.modifiedProvisions != null &&
                    message.hasOwnProperty('modifiedProvisions')
                ) {
                    properties._modifiedProvisions = 1;
                    {
                        let error =
                            $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions.verify(
                                message.modifiedProvisions
                            );
                        if (error) return 'modifiedProvisions.' + error;
                    }
                }
                return null;
            };

            /**
             * Creates a ContractAmendmentInfo message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo} ContractAmendmentInfo
             */
            ContractAmendmentInfo.fromObject = function fromObject(object) {
                if (
                    object instanceof
                    $root.mcreviewproto.ContractInfo.ContractAmendmentInfo
                )
                    return object;
                let message =
                    new $root.mcreviewproto.ContractInfo.ContractAmendmentInfo();
                if (object.amendableItems) {
                    if (!Array.isArray(object.amendableItems))
                        throw TypeError(
                            '.mcreviewproto.ContractInfo.ContractAmendmentInfo.amendableItems: array expected'
                        );
                    message.amendableItems = [];
                    for (let i = 0; i < object.amendableItems.length; ++i)
                        switch (object.amendableItems[i]) {
                            default:
                                if (
                                    typeof object.amendableItems[i] === 'number'
                                ) {
                                    message.amendableItems[i] =
                                        object.amendableItems[i];
                                    break;
                                }
                            case 'AMENDED_ITEM_UNSPECIFIED':
                            case 0:
                                message.amendableItems[i] = 0;
                                break;
                            case 'AMENDED_ITEM_BENEFITS_PROVIDED':
                            case 1:
                                message.amendableItems[i] = 1;
                                break;
                            case 'AMENDED_ITEM_CAPITATION_RATES':
                            case 2:
                                message.amendableItems[i] = 2;
                                break;
                            case 'AMENDED_ITEM_ENCOUNTER_DATA':
                            case 3:
                                message.amendableItems[i] = 3;
                                break;
                            case 'AMENDED_ITEM_ENROLLEE_ACCESS':
                            case 4:
                                message.amendableItems[i] = 4;
                                break;
                            case 'AMENDED_ITEM_ENROLLMENT_PROCESS':
                            case 5:
                                message.amendableItems[i] = 5;
                                break;
                            case 'AMENDED_ITEM_FINANCIAL_INCENTIVES':
                            case 6:
                                message.amendableItems[i] = 6;
                                break;
                            case 'AMENDED_ITEM_GEO_AREA_SERVED':
                            case 7:
                                message.amendableItems[i] = 7;
                                break;
                            case 'AMENDED_ITEM_GRIEVANCES_AND_APPEALS_SYSTEM':
                            case 8:
                                message.amendableItems[i] = 8;
                                break;
                            case 'AMENDED_ITEM_LENGTH_OF_CONTRACT_PERIOD':
                            case 9:
                                message.amendableItems[i] = 9;
                                break;
                            case 'AMENDED_ITEM_NON_RISK_PAYMENT':
                            case 10:
                                message.amendableItems[i] = 10;
                                break;
                            case 'AMENDED_ITEM_PROGRAM_INTEGRITY':
                            case 11:
                                message.amendableItems[i] = 11;
                                break;
                            case 'AMENDED_ITEM_QUALITY_STANDARDS':
                            case 12:
                                message.amendableItems[i] = 12;
                                break;
                            case 'AMENDED_ITEM_RISK_SHARING_MECHANISM':
                            case 13:
                                message.amendableItems[i] = 13;
                                break;
                            case 'AMENDED_ITEM_OTHER':
                            case 14:
                                message.amendableItems[i] = 14;
                                break;
                        }
                }
                if (object.otherAmendableItem != null)
                    message.otherAmendableItem = String(
                        object.otherAmendableItem
                    );
                if (object.capitationRatesAmendedInfo != null) {
                    if (typeof object.capitationRatesAmendedInfo !== 'object')
                        throw TypeError(
                            '.mcreviewproto.ContractInfo.ContractAmendmentInfo.capitationRatesAmendedInfo: object expected'
                        );
                    message.capitationRatesAmendedInfo =
                        $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo.fromObject(
                            object.capitationRatesAmendedInfo
                        );
                }
                if (object.modifiedProvisions != null) {
                    if (typeof object.modifiedProvisions !== 'object')
                        throw TypeError(
                            '.mcreviewproto.ContractInfo.ContractAmendmentInfo.modifiedProvisions: object expected'
                        );
                    message.modifiedProvisions =
                        $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions.fromObject(
                            object.modifiedProvisions
                        );
                }
                return message;
            };

            /**
             * Creates a plain object from a ContractAmendmentInfo message. Also converts values to other types if specified.
             * @function toObject
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @static
             * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo} message ContractAmendmentInfo
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ContractAmendmentInfo.toObject = function toObject(
                message,
                options
            ) {
                if (!options) options = {};
                let object = {};
                if (options.arrays || options.defaults)
                    object.amendableItems = [];
                if (message.amendableItems && message.amendableItems.length) {
                    object.amendableItems = [];
                    for (let j = 0; j < message.amendableItems.length; ++j)
                        object.amendableItems[j] =
                            options.enums === String
                                ? $root.mcreviewproto.AmendedItem[
                                      message.amendableItems[j]
                                  ] === undefined
                                    ? message.amendableItems[j]
                                    : $root.mcreviewproto.AmendedItem[
                                          message.amendableItems[j]
                                      ]
                                : message.amendableItems[j];
                }
                if (
                    message.otherAmendableItem != null &&
                    message.hasOwnProperty('otherAmendableItem')
                ) {
                    object.otherAmendableItem = message.otherAmendableItem;
                    if (options.oneofs)
                        object._otherAmendableItem = 'otherAmendableItem';
                }
                if (
                    message.capitationRatesAmendedInfo != null &&
                    message.hasOwnProperty('capitationRatesAmendedInfo')
                ) {
                    object.capitationRatesAmendedInfo =
                        $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo.toObject(
                            message.capitationRatesAmendedInfo,
                            options
                        );
                    if (options.oneofs)
                        object._capitationRatesAmendedInfo =
                            'capitationRatesAmendedInfo';
                }
                if (
                    message.modifiedProvisions != null &&
                    message.hasOwnProperty('modifiedProvisions')
                ) {
                    object.modifiedProvisions =
                        $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions.toObject(
                            message.modifiedProvisions,
                            options
                        );
                    if (options.oneofs)
                        object._modifiedProvisions = 'modifiedProvisions';
                }
                return object;
            };

            /**
             * Converts this ContractAmendmentInfo to JSON.
             * @function toJSON
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ContractAmendmentInfo.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(
                    this,
                    $protobuf.util.toJSONOptions
                );
            };

            /**
             * Gets the default type url for ContractAmendmentInfo
             * @function getTypeUrl
             * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ContractAmendmentInfo.getTypeUrl = function getTypeUrl(
                typeUrlPrefix
            ) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = 'type.googleapis.com';
                }
                return (
                    typeUrlPrefix +
                    '/mcreviewproto.ContractInfo.ContractAmendmentInfo'
                );
            };

            ContractAmendmentInfo.CapitationRatesAmendedInfo = (function () {
                /**
                 * Properties of a CapitationRatesAmendedInfo.
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
                 * @interface ICapitationRatesAmendedInfo
                 * @property {mcreviewproto.CapitationRateAmendmentReason|null} [reason] CapitationRatesAmendedInfo reason
                 * @property {string|null} [otherReason] CapitationRatesAmendedInfo otherReason
                 */

                /**
                 * Constructs a new CapitationRatesAmendedInfo.
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
                 * @classdesc Represents a CapitationRatesAmendedInfo.
                 * @implements ICapitationRatesAmendedInfo
                 * @constructor
                 * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo=} [properties] Properties to set
                 */
                function CapitationRatesAmendedInfo(properties) {
                    if (properties)
                        for (
                            let keys = Object.keys(properties), i = 0;
                            i < keys.length;
                            ++i
                        )
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * CapitationRatesAmendedInfo reason.
                 * @member {mcreviewproto.CapitationRateAmendmentReason|null|undefined} reason
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @instance
                 */
                CapitationRatesAmendedInfo.prototype.reason = null;

                /**
                 * CapitationRatesAmendedInfo otherReason.
                 * @member {string|null|undefined} otherReason
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @instance
                 */
                CapitationRatesAmendedInfo.prototype.otherReason = null;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * CapitationRatesAmendedInfo _reason.
                 * @member {"reason"|undefined} _reason
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @instance
                 */
                Object.defineProperty(
                    CapitationRatesAmendedInfo.prototype,
                    '_reason',
                    {
                        get: $util.oneOfGetter(($oneOfFields = ['reason'])),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * CapitationRatesAmendedInfo _otherReason.
                 * @member {"otherReason"|undefined} _otherReason
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @instance
                 */
                Object.defineProperty(
                    CapitationRatesAmendedInfo.prototype,
                    '_otherReason',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['otherReason'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * Creates a new CapitationRatesAmendedInfo instance using the specified properties.
                 * @function create
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @static
                 * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo=} [properties] Properties to set
                 * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo} CapitationRatesAmendedInfo instance
                 */
                CapitationRatesAmendedInfo.create = function create(
                    properties
                ) {
                    return new CapitationRatesAmendedInfo(properties);
                };

                /**
                 * Encodes the specified CapitationRatesAmendedInfo message. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo.verify|verify} messages.
                 * @function encode
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @static
                 * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo} message CapitationRatesAmendedInfo message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                CapitationRatesAmendedInfo.encode = function encode(
                    message,
                    writer
                ) {
                    if (!writer) writer = $Writer.create();
                    if (
                        message.reason != null &&
                        Object.hasOwnProperty.call(message, 'reason')
                    )
                        writer
                            .uint32(/* id 1, wireType 0 =*/ 8)
                            .int32(message.reason);
                    if (
                        message.otherReason != null &&
                        Object.hasOwnProperty.call(message, 'otherReason')
                    )
                        writer
                            .uint32(/* id 2, wireType 2 =*/ 18)
                            .string(message.otherReason);
                    return writer;
                };

                /**
                 * Encodes the specified CapitationRatesAmendedInfo message, length delimited. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @static
                 * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo.ICapitationRatesAmendedInfo} message CapitationRatesAmendedInfo message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                CapitationRatesAmendedInfo.encodeDelimited =
                    function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };

                /**
                 * Decodes a CapitationRatesAmendedInfo message from the specified reader or buffer.
                 * @function decode
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo} CapitationRatesAmendedInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                CapitationRatesAmendedInfo.decode = function decode(
                    reader,
                    length
                ) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end =
                            length === undefined
                                ? reader.len
                                : reader.pos + length,
                        message =
                            new $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1: {
                                message.reason = reader.int32();
                                break;
                            }
                            case 2: {
                                message.otherReason = reader.string();
                                break;
                            }
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a CapitationRatesAmendedInfo message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo} CapitationRatesAmendedInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                CapitationRatesAmendedInfo.decodeDelimited =
                    function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };

                /**
                 * Verifies a CapitationRatesAmendedInfo message.
                 * @function verify
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                CapitationRatesAmendedInfo.verify = function verify(message) {
                    if (typeof message !== 'object' || message === null)
                        return 'object expected';
                    let properties = {};
                    if (
                        message.reason != null &&
                        message.hasOwnProperty('reason')
                    ) {
                        properties._reason = 1;
                        switch (message.reason) {
                            default:
                                return 'reason: enum value expected';
                            case 0:
                            case 1:
                            case 2:
                            case 3:
                                break;
                        }
                    }
                    if (
                        message.otherReason != null &&
                        message.hasOwnProperty('otherReason')
                    ) {
                        properties._otherReason = 1;
                        if (!$util.isString(message.otherReason))
                            return 'otherReason: string expected';
                    }
                    return null;
                };

                /**
                 * Creates a CapitationRatesAmendedInfo message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo} CapitationRatesAmendedInfo
                 */
                CapitationRatesAmendedInfo.fromObject = function fromObject(
                    object
                ) {
                    if (
                        object instanceof
                        $root.mcreviewproto.ContractInfo.ContractAmendmentInfo
                            .CapitationRatesAmendedInfo
                    )
                        return object;
                    let message =
                        new $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo();
                    switch (object.reason) {
                        default:
                            if (typeof object.reason === 'number') {
                                message.reason = object.reason;
                                break;
                            }
                            break;
                        case 'CAPITATION_RATE_AMENDMENT_REASON_UNSPECIFIED':
                        case 0:
                            message.reason = 0;
                            break;
                        case 'CAPITATION_RATE_AMENDMENT_REASON_ANNUAL':
                        case 1:
                            message.reason = 1;
                            break;
                        case 'CAPITATION_RATE_AMENDMENT_REASON_MIDYEAR':
                        case 2:
                            message.reason = 2;
                            break;
                        case 'CAPITATION_RATE_AMENDMENT_REASON_OTHER':
                        case 3:
                            message.reason = 3;
                            break;
                    }
                    if (object.otherReason != null)
                        message.otherReason = String(object.otherReason);
                    return message;
                };

                /**
                 * Creates a plain object from a CapitationRatesAmendedInfo message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @static
                 * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo} message CapitationRatesAmendedInfo
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                CapitationRatesAmendedInfo.toObject = function toObject(
                    message,
                    options
                ) {
                    if (!options) options = {};
                    let object = {};
                    if (
                        message.reason != null &&
                        message.hasOwnProperty('reason')
                    ) {
                        object.reason =
                            options.enums === String
                                ? $root.mcreviewproto
                                      .CapitationRateAmendmentReason[
                                      message.reason
                                  ] === undefined
                                    ? message.reason
                                    : $root.mcreviewproto
                                          .CapitationRateAmendmentReason[
                                          message.reason
                                      ]
                                : message.reason;
                        if (options.oneofs) object._reason = 'reason';
                    }
                    if (
                        message.otherReason != null &&
                        message.hasOwnProperty('otherReason')
                    ) {
                        object.otherReason = message.otherReason;
                        if (options.oneofs) object._otherReason = 'otherReason';
                    }
                    return object;
                };

                /**
                 * Converts this CapitationRatesAmendedInfo to JSON.
                 * @function toJSON
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                CapitationRatesAmendedInfo.prototype.toJSON =
                    function toJSON() {
                        return this.constructor.toObject(
                            this,
                            $protobuf.util.toJSONOptions
                        );
                    };

                /**
                 * Gets the default type url for CapitationRatesAmendedInfo
                 * @function getTypeUrl
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                CapitationRatesAmendedInfo.getTypeUrl = function getTypeUrl(
                    typeUrlPrefix
                ) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = 'type.googleapis.com';
                    }
                    return (
                        typeUrlPrefix +
                        '/mcreviewproto.ContractInfo.ContractAmendmentInfo.CapitationRatesAmendedInfo'
                    );
                };

                return CapitationRatesAmendedInfo;
            })();

            ContractAmendmentInfo.ModifiedProvisions = (function () {
                /**
                 * Properties of a ModifiedProvisions.
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
                 * @interface IModifiedProvisions
                 * @property {boolean|null} [modifiedBenefitsProvided] ModifiedProvisions modifiedBenefitsProvided
                 * @property {boolean|null} [modifiedGeoAreaServed] ModifiedProvisions modifiedGeoAreaServed
                 * @property {boolean|null} [modifiedMedicaidBeneficiaries] ModifiedProvisions modifiedMedicaidBeneficiaries
                 * @property {boolean|null} [modifiedRiskSharingStrategy] ModifiedProvisions modifiedRiskSharingStrategy
                 * @property {boolean|null} [modifiedIncentiveArrangements] ModifiedProvisions modifiedIncentiveArrangements
                 * @property {boolean|null} [modifiedWitholdAgreements] ModifiedProvisions modifiedWitholdAgreements
                 * @property {boolean|null} [modifiedStateDirectedPayments] ModifiedProvisions modifiedStateDirectedPayments
                 * @property {boolean|null} [modifiedPassThroughPayments] ModifiedProvisions modifiedPassThroughPayments
                 * @property {boolean|null} [modifiedPaymentsForMentalDiseaseInstitutions] ModifiedProvisions modifiedPaymentsForMentalDiseaseInstitutions
                 * @property {boolean|null} [modifiedMedicalLossRatioStandards] ModifiedProvisions modifiedMedicalLossRatioStandards
                 * @property {boolean|null} [modifiedOtherFinancialPaymentIncentive] ModifiedProvisions modifiedOtherFinancialPaymentIncentive
                 * @property {boolean|null} [modifiedEnrollmentProcess] ModifiedProvisions modifiedEnrollmentProcess
                 * @property {boolean|null} [modifiedGrevienceAndAppeal] ModifiedProvisions modifiedGrevienceAndAppeal
                 * @property {boolean|null} [modifiedNetworkAdequacyStandards] ModifiedProvisions modifiedNetworkAdequacyStandards
                 * @property {boolean|null} [modifiedLengthOfContract] ModifiedProvisions modifiedLengthOfContract
                 * @property {boolean|null} [modifiedNonRiskPaymentArrangements] ModifiedProvisions modifiedNonRiskPaymentArrangements
                 * @property {boolean|null} [inLieuServicesAndSettings] ModifiedProvisions inLieuServicesAndSettings
                 */

                /**
                 * Constructs a new ModifiedProvisions.
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo
                 * @classdesc Represents a ModifiedProvisions.
                 * @implements IModifiedProvisions
                 * @constructor
                 * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions=} [properties] Properties to set
                 */
                function ModifiedProvisions(properties) {
                    if (properties)
                        for (
                            let keys = Object.keys(properties), i = 0;
                            i < keys.length;
                            ++i
                        )
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * ModifiedProvisions modifiedBenefitsProvided.
                 * @member {boolean|null|undefined} modifiedBenefitsProvided
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedBenefitsProvided = null;

                /**
                 * ModifiedProvisions modifiedGeoAreaServed.
                 * @member {boolean|null|undefined} modifiedGeoAreaServed
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedGeoAreaServed = null;

                /**
                 * ModifiedProvisions modifiedMedicaidBeneficiaries.
                 * @member {boolean|null|undefined} modifiedMedicaidBeneficiaries
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedMedicaidBeneficiaries =
                    null;

                /**
                 * ModifiedProvisions modifiedRiskSharingStrategy.
                 * @member {boolean|null|undefined} modifiedRiskSharingStrategy
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedRiskSharingStrategy = null;

                /**
                 * ModifiedProvisions modifiedIncentiveArrangements.
                 * @member {boolean|null|undefined} modifiedIncentiveArrangements
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedIncentiveArrangements =
                    null;

                /**
                 * ModifiedProvisions modifiedWitholdAgreements.
                 * @member {boolean|null|undefined} modifiedWitholdAgreements
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedWitholdAgreements = null;

                /**
                 * ModifiedProvisions modifiedStateDirectedPayments.
                 * @member {boolean|null|undefined} modifiedStateDirectedPayments
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedStateDirectedPayments =
                    null;

                /**
                 * ModifiedProvisions modifiedPassThroughPayments.
                 * @member {boolean|null|undefined} modifiedPassThroughPayments
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedPassThroughPayments = null;

                /**
                 * ModifiedProvisions modifiedPaymentsForMentalDiseaseInstitutions.
                 * @member {boolean|null|undefined} modifiedPaymentsForMentalDiseaseInstitutions
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedPaymentsForMentalDiseaseInstitutions =
                    null;

                /**
                 * ModifiedProvisions modifiedMedicalLossRatioStandards.
                 * @member {boolean|null|undefined} modifiedMedicalLossRatioStandards
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedMedicalLossRatioStandards =
                    null;

                /**
                 * ModifiedProvisions modifiedOtherFinancialPaymentIncentive.
                 * @member {boolean|null|undefined} modifiedOtherFinancialPaymentIncentive
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedOtherFinancialPaymentIncentive =
                    null;

                /**
                 * ModifiedProvisions modifiedEnrollmentProcess.
                 * @member {boolean|null|undefined} modifiedEnrollmentProcess
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedEnrollmentProcess = null;

                /**
                 * ModifiedProvisions modifiedGrevienceAndAppeal.
                 * @member {boolean|null|undefined} modifiedGrevienceAndAppeal
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedGrevienceAndAppeal = null;

                /**
                 * ModifiedProvisions modifiedNetworkAdequacyStandards.
                 * @member {boolean|null|undefined} modifiedNetworkAdequacyStandards
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedNetworkAdequacyStandards =
                    null;

                /**
                 * ModifiedProvisions modifiedLengthOfContract.
                 * @member {boolean|null|undefined} modifiedLengthOfContract
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedLengthOfContract = null;

                /**
                 * ModifiedProvisions modifiedNonRiskPaymentArrangements.
                 * @member {boolean|null|undefined} modifiedNonRiskPaymentArrangements
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.modifiedNonRiskPaymentArrangements =
                    null;

                /**
                 * ModifiedProvisions inLieuServicesAndSettings.
                 * @member {boolean|null|undefined} inLieuServicesAndSettings
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                ModifiedProvisions.prototype.inLieuServicesAndSettings = null;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * ModifiedProvisions _modifiedBenefitsProvided.
                 * @member {"modifiedBenefitsProvided"|undefined} _modifiedBenefitsProvided
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedBenefitsProvided',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedBenefitsProvided'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedGeoAreaServed.
                 * @member {"modifiedGeoAreaServed"|undefined} _modifiedGeoAreaServed
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedGeoAreaServed',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedGeoAreaServed'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedMedicaidBeneficiaries.
                 * @member {"modifiedMedicaidBeneficiaries"|undefined} _modifiedMedicaidBeneficiaries
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedMedicaidBeneficiaries',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedMedicaidBeneficiaries'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedRiskSharingStrategy.
                 * @member {"modifiedRiskSharingStrategy"|undefined} _modifiedRiskSharingStrategy
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedRiskSharingStrategy',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedRiskSharingStrategy'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedIncentiveArrangements.
                 * @member {"modifiedIncentiveArrangements"|undefined} _modifiedIncentiveArrangements
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedIncentiveArrangements',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedIncentiveArrangements'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedWitholdAgreements.
                 * @member {"modifiedWitholdAgreements"|undefined} _modifiedWitholdAgreements
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedWitholdAgreements',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedWitholdAgreements'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedStateDirectedPayments.
                 * @member {"modifiedStateDirectedPayments"|undefined} _modifiedStateDirectedPayments
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedStateDirectedPayments',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedStateDirectedPayments'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedPassThroughPayments.
                 * @member {"modifiedPassThroughPayments"|undefined} _modifiedPassThroughPayments
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedPassThroughPayments',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedPassThroughPayments'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedPaymentsForMentalDiseaseInstitutions.
                 * @member {"modifiedPaymentsForMentalDiseaseInstitutions"|undefined} _modifiedPaymentsForMentalDiseaseInstitutions
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedPaymentsForMentalDiseaseInstitutions',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = [
                                'modifiedPaymentsForMentalDiseaseInstitutions',
                            ])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedMedicalLossRatioStandards.
                 * @member {"modifiedMedicalLossRatioStandards"|undefined} _modifiedMedicalLossRatioStandards
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedMedicalLossRatioStandards',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = [
                                'modifiedMedicalLossRatioStandards',
                            ])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedOtherFinancialPaymentIncentive.
                 * @member {"modifiedOtherFinancialPaymentIncentive"|undefined} _modifiedOtherFinancialPaymentIncentive
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedOtherFinancialPaymentIncentive',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = [
                                'modifiedOtherFinancialPaymentIncentive',
                            ])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedEnrollmentProcess.
                 * @member {"modifiedEnrollmentProcess"|undefined} _modifiedEnrollmentProcess
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedEnrollmentProcess',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedEnrollmentProcess'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedGrevienceAndAppeal.
                 * @member {"modifiedGrevienceAndAppeal"|undefined} _modifiedGrevienceAndAppeal
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedGrevienceAndAppeal',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedGrevienceAndAppeal'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedNetworkAdequacyStandards.
                 * @member {"modifiedNetworkAdequacyStandards"|undefined} _modifiedNetworkAdequacyStandards
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedNetworkAdequacyStandards',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = [
                                'modifiedNetworkAdequacyStandards',
                            ])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedLengthOfContract.
                 * @member {"modifiedLengthOfContract"|undefined} _modifiedLengthOfContract
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedLengthOfContract',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['modifiedLengthOfContract'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _modifiedNonRiskPaymentArrangements.
                 * @member {"modifiedNonRiskPaymentArrangements"|undefined} _modifiedNonRiskPaymentArrangements
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_modifiedNonRiskPaymentArrangements',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = [
                                'modifiedNonRiskPaymentArrangements',
                            ])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * ModifiedProvisions _inLieuServicesAndSettings.
                 * @member {"inLieuServicesAndSettings"|undefined} _inLieuServicesAndSettings
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 */
                Object.defineProperty(
                    ModifiedProvisions.prototype,
                    '_inLieuServicesAndSettings',
                    {
                        get: $util.oneOfGetter(
                            ($oneOfFields = ['inLieuServicesAndSettings'])
                        ),
                        set: $util.oneOfSetter($oneOfFields),
                    }
                );

                /**
                 * Creates a new ModifiedProvisions instance using the specified properties.
                 * @function create
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @static
                 * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions=} [properties] Properties to set
                 * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions} ModifiedProvisions instance
                 */
                ModifiedProvisions.create = function create(properties) {
                    return new ModifiedProvisions(properties);
                };

                /**
                 * Encodes the specified ModifiedProvisions message. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions.verify|verify} messages.
                 * @function encode
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @static
                 * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions} message ModifiedProvisions message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ModifiedProvisions.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (
                        message.modifiedBenefitsProvided != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedBenefitsProvided'
                        )
                    )
                        writer
                            .uint32(/* id 1, wireType 0 =*/ 8)
                            .bool(message.modifiedBenefitsProvided);
                    if (
                        message.modifiedGeoAreaServed != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedGeoAreaServed'
                        )
                    )
                        writer
                            .uint32(/* id 2, wireType 0 =*/ 16)
                            .bool(message.modifiedGeoAreaServed);
                    if (
                        message.modifiedMedicaidBeneficiaries != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedMedicaidBeneficiaries'
                        )
                    )
                        writer
                            .uint32(/* id 3, wireType 0 =*/ 24)
                            .bool(message.modifiedMedicaidBeneficiaries);
                    if (
                        message.modifiedRiskSharingStrategy != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedRiskSharingStrategy'
                        )
                    )
                        writer
                            .uint32(/* id 4, wireType 0 =*/ 32)
                            .bool(message.modifiedRiskSharingStrategy);
                    if (
                        message.modifiedIncentiveArrangements != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedIncentiveArrangements'
                        )
                    )
                        writer
                            .uint32(/* id 5, wireType 0 =*/ 40)
                            .bool(message.modifiedIncentiveArrangements);
                    if (
                        message.modifiedWitholdAgreements != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedWitholdAgreements'
                        )
                    )
                        writer
                            .uint32(/* id 6, wireType 0 =*/ 48)
                            .bool(message.modifiedWitholdAgreements);
                    if (
                        message.modifiedStateDirectedPayments != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedStateDirectedPayments'
                        )
                    )
                        writer
                            .uint32(/* id 7, wireType 0 =*/ 56)
                            .bool(message.modifiedStateDirectedPayments);
                    if (
                        message.modifiedPassThroughPayments != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedPassThroughPayments'
                        )
                    )
                        writer
                            .uint32(/* id 8, wireType 0 =*/ 64)
                            .bool(message.modifiedPassThroughPayments);
                    if (
                        message.modifiedPaymentsForMentalDiseaseInstitutions !=
                            null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedPaymentsForMentalDiseaseInstitutions'
                        )
                    )
                        writer
                            .uint32(/* id 9, wireType 0 =*/ 72)
                            .bool(
                                message.modifiedPaymentsForMentalDiseaseInstitutions
                            );
                    if (
                        message.modifiedMedicalLossRatioStandards != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedMedicalLossRatioStandards'
                        )
                    )
                        writer
                            .uint32(/* id 10, wireType 0 =*/ 80)
                            .bool(message.modifiedMedicalLossRatioStandards);
                    if (
                        message.modifiedOtherFinancialPaymentIncentive !=
                            null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedOtherFinancialPaymentIncentive'
                        )
                    )
                        writer
                            .uint32(/* id 11, wireType 0 =*/ 88)
                            .bool(
                                message.modifiedOtherFinancialPaymentIncentive
                            );
                    if (
                        message.modifiedEnrollmentProcess != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedEnrollmentProcess'
                        )
                    )
                        writer
                            .uint32(/* id 12, wireType 0 =*/ 96)
                            .bool(message.modifiedEnrollmentProcess);
                    if (
                        message.modifiedGrevienceAndAppeal != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedGrevienceAndAppeal'
                        )
                    )
                        writer
                            .uint32(/* id 13, wireType 0 =*/ 104)
                            .bool(message.modifiedGrevienceAndAppeal);
                    if (
                        message.modifiedNetworkAdequacyStandards != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedNetworkAdequacyStandards'
                        )
                    )
                        writer
                            .uint32(/* id 14, wireType 0 =*/ 112)
                            .bool(message.modifiedNetworkAdequacyStandards);
                    if (
                        message.modifiedLengthOfContract != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedLengthOfContract'
                        )
                    )
                        writer
                            .uint32(/* id 15, wireType 0 =*/ 120)
                            .bool(message.modifiedLengthOfContract);
                    if (
                        message.modifiedNonRiskPaymentArrangements != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'modifiedNonRiskPaymentArrangements'
                        )
                    )
                        writer
                            .uint32(/* id 16, wireType 0 =*/ 128)
                            .bool(message.modifiedNonRiskPaymentArrangements);
                    if (
                        message.inLieuServicesAndSettings != null &&
                        Object.hasOwnProperty.call(
                            message,
                            'inLieuServicesAndSettings'
                        )
                    )
                        writer
                            .uint32(/* id 17, wireType 0 =*/ 136)
                            .bool(message.inLieuServicesAndSettings);
                    return writer;
                };

                /**
                 * Encodes the specified ModifiedProvisions message, length delimited. Does not implicitly {@link mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @static
                 * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo.IModifiedProvisions} message ModifiedProvisions message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ModifiedProvisions.encodeDelimited = function encodeDelimited(
                    message,
                    writer
                ) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a ModifiedProvisions message from the specified reader or buffer.
                 * @function decode
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions} ModifiedProvisions
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ModifiedProvisions.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end =
                            length === undefined
                                ? reader.len
                                : reader.pos + length,
                        message =
                            new $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1: {
                                message.modifiedBenefitsProvided =
                                    reader.bool();
                                break;
                            }
                            case 2: {
                                message.modifiedGeoAreaServed = reader.bool();
                                break;
                            }
                            case 3: {
                                message.modifiedMedicaidBeneficiaries =
                                    reader.bool();
                                break;
                            }
                            case 4: {
                                message.modifiedRiskSharingStrategy =
                                    reader.bool();
                                break;
                            }
                            case 5: {
                                message.modifiedIncentiveArrangements =
                                    reader.bool();
                                break;
                            }
                            case 6: {
                                message.modifiedWitholdAgreements =
                                    reader.bool();
                                break;
                            }
                            case 7: {
                                message.modifiedStateDirectedPayments =
                                    reader.bool();
                                break;
                            }
                            case 8: {
                                message.modifiedPassThroughPayments =
                                    reader.bool();
                                break;
                            }
                            case 9: {
                                message.modifiedPaymentsForMentalDiseaseInstitutions =
                                    reader.bool();
                                break;
                            }
                            case 10: {
                                message.modifiedMedicalLossRatioStandards =
                                    reader.bool();
                                break;
                            }
                            case 11: {
                                message.modifiedOtherFinancialPaymentIncentive =
                                    reader.bool();
                                break;
                            }
                            case 12: {
                                message.modifiedEnrollmentProcess =
                                    reader.bool();
                                break;
                            }
                            case 13: {
                                message.modifiedGrevienceAndAppeal =
                                    reader.bool();
                                break;
                            }
                            case 14: {
                                message.modifiedNetworkAdequacyStandards =
                                    reader.bool();
                                break;
                            }
                            case 15: {
                                message.modifiedLengthOfContract =
                                    reader.bool();
                                break;
                            }
                            case 16: {
                                message.modifiedNonRiskPaymentArrangements =
                                    reader.bool();
                                break;
                            }
                            case 17: {
                                message.inLieuServicesAndSettings =
                                    reader.bool();
                                break;
                            }
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a ModifiedProvisions message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions} ModifiedProvisions
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ModifiedProvisions.decodeDelimited = function decodeDelimited(
                    reader
                ) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a ModifiedProvisions message.
                 * @function verify
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ModifiedProvisions.verify = function verify(message) {
                    if (typeof message !== 'object' || message === null)
                        return 'object expected';
                    let properties = {};
                    if (
                        message.modifiedBenefitsProvided != null &&
                        message.hasOwnProperty('modifiedBenefitsProvided')
                    ) {
                        properties._modifiedBenefitsProvided = 1;
                        if (
                            typeof message.modifiedBenefitsProvided !==
                            'boolean'
                        )
                            return 'modifiedBenefitsProvided: boolean expected';
                    }
                    if (
                        message.modifiedGeoAreaServed != null &&
                        message.hasOwnProperty('modifiedGeoAreaServed')
                    ) {
                        properties._modifiedGeoAreaServed = 1;
                        if (typeof message.modifiedGeoAreaServed !== 'boolean')
                            return 'modifiedGeoAreaServed: boolean expected';
                    }
                    if (
                        message.modifiedMedicaidBeneficiaries != null &&
                        message.hasOwnProperty('modifiedMedicaidBeneficiaries')
                    ) {
                        properties._modifiedMedicaidBeneficiaries = 1;
                        if (
                            typeof message.modifiedMedicaidBeneficiaries !==
                            'boolean'
                        )
                            return 'modifiedMedicaidBeneficiaries: boolean expected';
                    }
                    if (
                        message.modifiedRiskSharingStrategy != null &&
                        message.hasOwnProperty('modifiedRiskSharingStrategy')
                    ) {
                        properties._modifiedRiskSharingStrategy = 1;
                        if (
                            typeof message.modifiedRiskSharingStrategy !==
                            'boolean'
                        )
                            return 'modifiedRiskSharingStrategy: boolean expected';
                    }
                    if (
                        message.modifiedIncentiveArrangements != null &&
                        message.hasOwnProperty('modifiedIncentiveArrangements')
                    ) {
                        properties._modifiedIncentiveArrangements = 1;
                        if (
                            typeof message.modifiedIncentiveArrangements !==
                            'boolean'
                        )
                            return 'modifiedIncentiveArrangements: boolean expected';
                    }
                    if (
                        message.modifiedWitholdAgreements != null &&
                        message.hasOwnProperty('modifiedWitholdAgreements')
                    ) {
                        properties._modifiedWitholdAgreements = 1;
                        if (
                            typeof message.modifiedWitholdAgreements !==
                            'boolean'
                        )
                            return 'modifiedWitholdAgreements: boolean expected';
                    }
                    if (
                        message.modifiedStateDirectedPayments != null &&
                        message.hasOwnProperty('modifiedStateDirectedPayments')
                    ) {
                        properties._modifiedStateDirectedPayments = 1;
                        if (
                            typeof message.modifiedStateDirectedPayments !==
                            'boolean'
                        )
                            return 'modifiedStateDirectedPayments: boolean expected';
                    }
                    if (
                        message.modifiedPassThroughPayments != null &&
                        message.hasOwnProperty('modifiedPassThroughPayments')
                    ) {
                        properties._modifiedPassThroughPayments = 1;
                        if (
                            typeof message.modifiedPassThroughPayments !==
                            'boolean'
                        )
                            return 'modifiedPassThroughPayments: boolean expected';
                    }
                    if (
                        message.modifiedPaymentsForMentalDiseaseInstitutions !=
                            null &&
                        message.hasOwnProperty(
                            'modifiedPaymentsForMentalDiseaseInstitutions'
                        )
                    ) {
                        properties._modifiedPaymentsForMentalDiseaseInstitutions = 1;
                        if (
                            typeof message.modifiedPaymentsForMentalDiseaseInstitutions !==
                            'boolean'
                        )
                            return 'modifiedPaymentsForMentalDiseaseInstitutions: boolean expected';
                    }
                    if (
                        message.modifiedMedicalLossRatioStandards != null &&
                        message.hasOwnProperty(
                            'modifiedMedicalLossRatioStandards'
                        )
                    ) {
                        properties._modifiedMedicalLossRatioStandards = 1;
                        if (
                            typeof message.modifiedMedicalLossRatioStandards !==
                            'boolean'
                        )
                            return 'modifiedMedicalLossRatioStandards: boolean expected';
                    }
                    if (
                        message.modifiedOtherFinancialPaymentIncentive !=
                            null &&
                        message.hasOwnProperty(
                            'modifiedOtherFinancialPaymentIncentive'
                        )
                    ) {
                        properties._modifiedOtherFinancialPaymentIncentive = 1;
                        if (
                            typeof message.modifiedOtherFinancialPaymentIncentive !==
                            'boolean'
                        )
                            return 'modifiedOtherFinancialPaymentIncentive: boolean expected';
                    }
                    if (
                        message.modifiedEnrollmentProcess != null &&
                        message.hasOwnProperty('modifiedEnrollmentProcess')
                    ) {
                        properties._modifiedEnrollmentProcess = 1;
                        if (
                            typeof message.modifiedEnrollmentProcess !==
                            'boolean'
                        )
                            return 'modifiedEnrollmentProcess: boolean expected';
                    }
                    if (
                        message.modifiedGrevienceAndAppeal != null &&
                        message.hasOwnProperty('modifiedGrevienceAndAppeal')
                    ) {
                        properties._modifiedGrevienceAndAppeal = 1;
                        if (
                            typeof message.modifiedGrevienceAndAppeal !==
                            'boolean'
                        )
                            return 'modifiedGrevienceAndAppeal: boolean expected';
                    }
                    if (
                        message.modifiedNetworkAdequacyStandards != null &&
                        message.hasOwnProperty(
                            'modifiedNetworkAdequacyStandards'
                        )
                    ) {
                        properties._modifiedNetworkAdequacyStandards = 1;
                        if (
                            typeof message.modifiedNetworkAdequacyStandards !==
                            'boolean'
                        )
                            return 'modifiedNetworkAdequacyStandards: boolean expected';
                    }
                    if (
                        message.modifiedLengthOfContract != null &&
                        message.hasOwnProperty('modifiedLengthOfContract')
                    ) {
                        properties._modifiedLengthOfContract = 1;
                        if (
                            typeof message.modifiedLengthOfContract !==
                            'boolean'
                        )
                            return 'modifiedLengthOfContract: boolean expected';
                    }
                    if (
                        message.modifiedNonRiskPaymentArrangements != null &&
                        message.hasOwnProperty(
                            'modifiedNonRiskPaymentArrangements'
                        )
                    ) {
                        properties._modifiedNonRiskPaymentArrangements = 1;
                        if (
                            typeof message.modifiedNonRiskPaymentArrangements !==
                            'boolean'
                        )
                            return 'modifiedNonRiskPaymentArrangements: boolean expected';
                    }
                    if (
                        message.inLieuServicesAndSettings != null &&
                        message.hasOwnProperty('inLieuServicesAndSettings')
                    ) {
                        properties._inLieuServicesAndSettings = 1;
                        if (
                            typeof message.inLieuServicesAndSettings !==
                            'boolean'
                        )
                            return 'inLieuServicesAndSettings: boolean expected';
                    }
                    return null;
                };

                /**
                 * Creates a ModifiedProvisions message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions} ModifiedProvisions
                 */
                ModifiedProvisions.fromObject = function fromObject(object) {
                    if (
                        object instanceof
                        $root.mcreviewproto.ContractInfo.ContractAmendmentInfo
                            .ModifiedProvisions
                    )
                        return object;
                    let message =
                        new $root.mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions();
                    if (object.modifiedBenefitsProvided != null)
                        message.modifiedBenefitsProvided = Boolean(
                            object.modifiedBenefitsProvided
                        );
                    if (object.modifiedGeoAreaServed != null)
                        message.modifiedGeoAreaServed = Boolean(
                            object.modifiedGeoAreaServed
                        );
                    if (object.modifiedMedicaidBeneficiaries != null)
                        message.modifiedMedicaidBeneficiaries = Boolean(
                            object.modifiedMedicaidBeneficiaries
                        );
                    if (object.modifiedRiskSharingStrategy != null)
                        message.modifiedRiskSharingStrategy = Boolean(
                            object.modifiedRiskSharingStrategy
                        );
                    if (object.modifiedIncentiveArrangements != null)
                        message.modifiedIncentiveArrangements = Boolean(
                            object.modifiedIncentiveArrangements
                        );
                    if (object.modifiedWitholdAgreements != null)
                        message.modifiedWitholdAgreements = Boolean(
                            object.modifiedWitholdAgreements
                        );
                    if (object.modifiedStateDirectedPayments != null)
                        message.modifiedStateDirectedPayments = Boolean(
                            object.modifiedStateDirectedPayments
                        );
                    if (object.modifiedPassThroughPayments != null)
                        message.modifiedPassThroughPayments = Boolean(
                            object.modifiedPassThroughPayments
                        );
                    if (
                        object.modifiedPaymentsForMentalDiseaseInstitutions !=
                        null
                    )
                        message.modifiedPaymentsForMentalDiseaseInstitutions =
                            Boolean(
                                object.modifiedPaymentsForMentalDiseaseInstitutions
                            );
                    if (object.modifiedMedicalLossRatioStandards != null)
                        message.modifiedMedicalLossRatioStandards = Boolean(
                            object.modifiedMedicalLossRatioStandards
                        );
                    if (object.modifiedOtherFinancialPaymentIncentive != null)
                        message.modifiedOtherFinancialPaymentIncentive =
                            Boolean(
                                object.modifiedOtherFinancialPaymentIncentive
                            );
                    if (object.modifiedEnrollmentProcess != null)
                        message.modifiedEnrollmentProcess = Boolean(
                            object.modifiedEnrollmentProcess
                        );
                    if (object.modifiedGrevienceAndAppeal != null)
                        message.modifiedGrevienceAndAppeal = Boolean(
                            object.modifiedGrevienceAndAppeal
                        );
                    if (object.modifiedNetworkAdequacyStandards != null)
                        message.modifiedNetworkAdequacyStandards = Boolean(
                            object.modifiedNetworkAdequacyStandards
                        );
                    if (object.modifiedLengthOfContract != null)
                        message.modifiedLengthOfContract = Boolean(
                            object.modifiedLengthOfContract
                        );
                    if (object.modifiedNonRiskPaymentArrangements != null)
                        message.modifiedNonRiskPaymentArrangements = Boolean(
                            object.modifiedNonRiskPaymentArrangements
                        );
                    if (object.inLieuServicesAndSettings != null)
                        message.inLieuServicesAndSettings = Boolean(
                            object.inLieuServicesAndSettings
                        );
                    return message;
                };

                /**
                 * Creates a plain object from a ModifiedProvisions message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @static
                 * @param {mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions} message ModifiedProvisions
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ModifiedProvisions.toObject = function toObject(
                    message,
                    options
                ) {
                    if (!options) options = {};
                    let object = {};
                    if (
                        message.modifiedBenefitsProvided != null &&
                        message.hasOwnProperty('modifiedBenefitsProvided')
                    ) {
                        object.modifiedBenefitsProvided =
                            message.modifiedBenefitsProvided;
                        if (options.oneofs)
                            object._modifiedBenefitsProvided =
                                'modifiedBenefitsProvided';
                    }
                    if (
                        message.modifiedGeoAreaServed != null &&
                        message.hasOwnProperty('modifiedGeoAreaServed')
                    ) {
                        object.modifiedGeoAreaServed =
                            message.modifiedGeoAreaServed;
                        if (options.oneofs)
                            object._modifiedGeoAreaServed =
                                'modifiedGeoAreaServed';
                    }
                    if (
                        message.modifiedMedicaidBeneficiaries != null &&
                        message.hasOwnProperty('modifiedMedicaidBeneficiaries')
                    ) {
                        object.modifiedMedicaidBeneficiaries =
                            message.modifiedMedicaidBeneficiaries;
                        if (options.oneofs)
                            object._modifiedMedicaidBeneficiaries =
                                'modifiedMedicaidBeneficiaries';
                    }
                    if (
                        message.modifiedRiskSharingStrategy != null &&
                        message.hasOwnProperty('modifiedRiskSharingStrategy')
                    ) {
                        object.modifiedRiskSharingStrategy =
                            message.modifiedRiskSharingStrategy;
                        if (options.oneofs)
                            object._modifiedRiskSharingStrategy =
                                'modifiedRiskSharingStrategy';
                    }
                    if (
                        message.modifiedIncentiveArrangements != null &&
                        message.hasOwnProperty('modifiedIncentiveArrangements')
                    ) {
                        object.modifiedIncentiveArrangements =
                            message.modifiedIncentiveArrangements;
                        if (options.oneofs)
                            object._modifiedIncentiveArrangements =
                                'modifiedIncentiveArrangements';
                    }
                    if (
                        message.modifiedWitholdAgreements != null &&
                        message.hasOwnProperty('modifiedWitholdAgreements')
                    ) {
                        object.modifiedWitholdAgreements =
                            message.modifiedWitholdAgreements;
                        if (options.oneofs)
                            object._modifiedWitholdAgreements =
                                'modifiedWitholdAgreements';
                    }
                    if (
                        message.modifiedStateDirectedPayments != null &&
                        message.hasOwnProperty('modifiedStateDirectedPayments')
                    ) {
                        object.modifiedStateDirectedPayments =
                            message.modifiedStateDirectedPayments;
                        if (options.oneofs)
                            object._modifiedStateDirectedPayments =
                                'modifiedStateDirectedPayments';
                    }
                    if (
                        message.modifiedPassThroughPayments != null &&
                        message.hasOwnProperty('modifiedPassThroughPayments')
                    ) {
                        object.modifiedPassThroughPayments =
                            message.modifiedPassThroughPayments;
                        if (options.oneofs)
                            object._modifiedPassThroughPayments =
                                'modifiedPassThroughPayments';
                    }
                    if (
                        message.modifiedPaymentsForMentalDiseaseInstitutions !=
                            null &&
                        message.hasOwnProperty(
                            'modifiedPaymentsForMentalDiseaseInstitutions'
                        )
                    ) {
                        object.modifiedPaymentsForMentalDiseaseInstitutions =
                            message.modifiedPaymentsForMentalDiseaseInstitutions;
                        if (options.oneofs)
                            object._modifiedPaymentsForMentalDiseaseInstitutions =
                                'modifiedPaymentsForMentalDiseaseInstitutions';
                    }
                    if (
                        message.modifiedMedicalLossRatioStandards != null &&
                        message.hasOwnProperty(
                            'modifiedMedicalLossRatioStandards'
                        )
                    ) {
                        object.modifiedMedicalLossRatioStandards =
                            message.modifiedMedicalLossRatioStandards;
                        if (options.oneofs)
                            object._modifiedMedicalLossRatioStandards =
                                'modifiedMedicalLossRatioStandards';
                    }
                    if (
                        message.modifiedOtherFinancialPaymentIncentive !=
                            null &&
                        message.hasOwnProperty(
                            'modifiedOtherFinancialPaymentIncentive'
                        )
                    ) {
                        object.modifiedOtherFinancialPaymentIncentive =
                            message.modifiedOtherFinancialPaymentIncentive;
                        if (options.oneofs)
                            object._modifiedOtherFinancialPaymentIncentive =
                                'modifiedOtherFinancialPaymentIncentive';
                    }
                    if (
                        message.modifiedEnrollmentProcess != null &&
                        message.hasOwnProperty('modifiedEnrollmentProcess')
                    ) {
                        object.modifiedEnrollmentProcess =
                            message.modifiedEnrollmentProcess;
                        if (options.oneofs)
                            object._modifiedEnrollmentProcess =
                                'modifiedEnrollmentProcess';
                    }
                    if (
                        message.modifiedGrevienceAndAppeal != null &&
                        message.hasOwnProperty('modifiedGrevienceAndAppeal')
                    ) {
                        object.modifiedGrevienceAndAppeal =
                            message.modifiedGrevienceAndAppeal;
                        if (options.oneofs)
                            object._modifiedGrevienceAndAppeal =
                                'modifiedGrevienceAndAppeal';
                    }
                    if (
                        message.modifiedNetworkAdequacyStandards != null &&
                        message.hasOwnProperty(
                            'modifiedNetworkAdequacyStandards'
                        )
                    ) {
                        object.modifiedNetworkAdequacyStandards =
                            message.modifiedNetworkAdequacyStandards;
                        if (options.oneofs)
                            object._modifiedNetworkAdequacyStandards =
                                'modifiedNetworkAdequacyStandards';
                    }
                    if (
                        message.modifiedLengthOfContract != null &&
                        message.hasOwnProperty('modifiedLengthOfContract')
                    ) {
                        object.modifiedLengthOfContract =
                            message.modifiedLengthOfContract;
                        if (options.oneofs)
                            object._modifiedLengthOfContract =
                                'modifiedLengthOfContract';
                    }
                    if (
                        message.modifiedNonRiskPaymentArrangements != null &&
                        message.hasOwnProperty(
                            'modifiedNonRiskPaymentArrangements'
                        )
                    ) {
                        object.modifiedNonRiskPaymentArrangements =
                            message.modifiedNonRiskPaymentArrangements;
                        if (options.oneofs)
                            object._modifiedNonRiskPaymentArrangements =
                                'modifiedNonRiskPaymentArrangements';
                    }
                    if (
                        message.inLieuServicesAndSettings != null &&
                        message.hasOwnProperty('inLieuServicesAndSettings')
                    ) {
                        object.inLieuServicesAndSettings =
                            message.inLieuServicesAndSettings;
                        if (options.oneofs)
                            object._inLieuServicesAndSettings =
                                'inLieuServicesAndSettings';
                    }
                    return object;
                };

                /**
                 * Converts this ModifiedProvisions to JSON.
                 * @function toJSON
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ModifiedProvisions.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(
                        this,
                        $protobuf.util.toJSONOptions
                    );
                };

                /**
                 * Gets the default type url for ModifiedProvisions
                 * @function getTypeUrl
                 * @memberof mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                ModifiedProvisions.getTypeUrl = function getTypeUrl(
                    typeUrlPrefix
                ) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = 'type.googleapis.com';
                    }
                    return (
                        typeUrlPrefix +
                        '/mcreviewproto.ContractInfo.ContractAmendmentInfo.ModifiedProvisions'
                    );
                };

                return ModifiedProvisions;
            })();

            return ContractAmendmentInfo;
        })();

        return ContractInfo;
    })();

    /**
     * Contract related enums
     * @name mcreviewproto.AmendedItem
     * @enum {number}
     * @property {number} AMENDED_ITEM_UNSPECIFIED=0 AMENDED_ITEM_UNSPECIFIED value
     * @property {number} AMENDED_ITEM_BENEFITS_PROVIDED=1 AMENDED_ITEM_BENEFITS_PROVIDED value
     * @property {number} AMENDED_ITEM_CAPITATION_RATES=2 AMENDED_ITEM_CAPITATION_RATES value
     * @property {number} AMENDED_ITEM_ENCOUNTER_DATA=3 AMENDED_ITEM_ENCOUNTER_DATA value
     * @property {number} AMENDED_ITEM_ENROLLEE_ACCESS=4 AMENDED_ITEM_ENROLLEE_ACCESS value
     * @property {number} AMENDED_ITEM_ENROLLMENT_PROCESS=5 AMENDED_ITEM_ENROLLMENT_PROCESS value
     * @property {number} AMENDED_ITEM_FINANCIAL_INCENTIVES=6 AMENDED_ITEM_FINANCIAL_INCENTIVES value
     * @property {number} AMENDED_ITEM_GEO_AREA_SERVED=7 AMENDED_ITEM_GEO_AREA_SERVED value
     * @property {number} AMENDED_ITEM_GRIEVANCES_AND_APPEALS_SYSTEM=8 AMENDED_ITEM_GRIEVANCES_AND_APPEALS_SYSTEM value
     * @property {number} AMENDED_ITEM_LENGTH_OF_CONTRACT_PERIOD=9 AMENDED_ITEM_LENGTH_OF_CONTRACT_PERIOD value
     * @property {number} AMENDED_ITEM_NON_RISK_PAYMENT=10 AMENDED_ITEM_NON_RISK_PAYMENT value
     * @property {number} AMENDED_ITEM_PROGRAM_INTEGRITY=11 AMENDED_ITEM_PROGRAM_INTEGRITY value
     * @property {number} AMENDED_ITEM_QUALITY_STANDARDS=12 AMENDED_ITEM_QUALITY_STANDARDS value
     * @property {number} AMENDED_ITEM_RISK_SHARING_MECHANISM=13 AMENDED_ITEM_RISK_SHARING_MECHANISM value
     * @property {number} AMENDED_ITEM_OTHER=14 AMENDED_ITEM_OTHER value
     */
    mcreviewproto.AmendedItem = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'AMENDED_ITEM_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'AMENDED_ITEM_BENEFITS_PROVIDED')] = 1;
        values[(valuesById[2] = 'AMENDED_ITEM_CAPITATION_RATES')] = 2;
        values[(valuesById[3] = 'AMENDED_ITEM_ENCOUNTER_DATA')] = 3;
        values[(valuesById[4] = 'AMENDED_ITEM_ENROLLEE_ACCESS')] = 4;
        values[(valuesById[5] = 'AMENDED_ITEM_ENROLLMENT_PROCESS')] = 5;
        values[(valuesById[6] = 'AMENDED_ITEM_FINANCIAL_INCENTIVES')] = 6;
        values[(valuesById[7] = 'AMENDED_ITEM_GEO_AREA_SERVED')] = 7;
        values[(valuesById[8] = 'AMENDED_ITEM_GRIEVANCES_AND_APPEALS_SYSTEM')] =
            8;
        values[(valuesById[9] = 'AMENDED_ITEM_LENGTH_OF_CONTRACT_PERIOD')] = 9;
        values[(valuesById[10] = 'AMENDED_ITEM_NON_RISK_PAYMENT')] = 10;
        values[(valuesById[11] = 'AMENDED_ITEM_PROGRAM_INTEGRITY')] = 11;
        values[(valuesById[12] = 'AMENDED_ITEM_QUALITY_STANDARDS')] = 12;
        values[(valuesById[13] = 'AMENDED_ITEM_RISK_SHARING_MECHANISM')] = 13;
        values[(valuesById[14] = 'AMENDED_ITEM_OTHER')] = 14;
        return values;
    })();

    /**
     * CapitationRateAmendmentReason enum.
     * @name mcreviewproto.CapitationRateAmendmentReason
     * @enum {number}
     * @property {number} CAPITATION_RATE_AMENDMENT_REASON_UNSPECIFIED=0 CAPITATION_RATE_AMENDMENT_REASON_UNSPECIFIED value
     * @property {number} CAPITATION_RATE_AMENDMENT_REASON_ANNUAL=1 CAPITATION_RATE_AMENDMENT_REASON_ANNUAL value
     * @property {number} CAPITATION_RATE_AMENDMENT_REASON_MIDYEAR=2 CAPITATION_RATE_AMENDMENT_REASON_MIDYEAR value
     * @property {number} CAPITATION_RATE_AMENDMENT_REASON_OTHER=3 CAPITATION_RATE_AMENDMENT_REASON_OTHER value
     */
    mcreviewproto.CapitationRateAmendmentReason = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[
            (valuesById[0] = 'CAPITATION_RATE_AMENDMENT_REASON_UNSPECIFIED')
        ] = 0;
        values[(valuesById[1] = 'CAPITATION_RATE_AMENDMENT_REASON_ANNUAL')] = 1;
        values[(valuesById[2] = 'CAPITATION_RATE_AMENDMENT_REASON_MIDYEAR')] =
            2;
        values[(valuesById[3] = 'CAPITATION_RATE_AMENDMENT_REASON_OTHER')] = 3;
        return values;
    })();

    /**
     * ContractType enum.
     * @name mcreviewproto.ContractType
     * @enum {number}
     * @property {number} CONTRACT_TYPE_UNSPECIFIED=0 CONTRACT_TYPE_UNSPECIFIED value
     * @property {number} CONTRACT_TYPE_BASE=1 CONTRACT_TYPE_BASE value
     * @property {number} CONTRACT_TYPE_AMENDMENT=2 CONTRACT_TYPE_AMENDMENT value
     */
    mcreviewproto.ContractType = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'CONTRACT_TYPE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'CONTRACT_TYPE_BASE')] = 1;
        values[(valuesById[2] = 'CONTRACT_TYPE_AMENDMENT')] = 2;
        return values;
    })();

    /**
     * ContractExecutionStatus enum.
     * @name mcreviewproto.ContractExecutionStatus
     * @enum {number}
     * @property {number} CONTRACT_EXECUTION_STATUS_UNSPECIFIED=0 CONTRACT_EXECUTION_STATUS_UNSPECIFIED value
     * @property {number} CONTRACT_EXECUTION_STATUS_EXECUTED=1 CONTRACT_EXECUTION_STATUS_EXECUTED value
     * @property {number} CONTRACT_EXECUTION_STATUS_UNEXECUTED=2 CONTRACT_EXECUTION_STATUS_UNEXECUTED value
     */
    mcreviewproto.ContractExecutionStatus = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'CONTRACT_EXECUTION_STATUS_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'CONTRACT_EXECUTION_STATUS_EXECUTED')] = 1;
        values[(valuesById[2] = 'CONTRACT_EXECUTION_STATUS_UNEXECUTED')] = 2;
        return values;
    })();

    /**
     * FederalAuthority enum.
     * @name mcreviewproto.FederalAuthority
     * @enum {number}
     * @property {number} FEDERAL_AUTHORITY_UNSPECIFIED=0 FEDERAL_AUTHORITY_UNSPECIFIED value
     * @property {number} FEDERAL_AUTHORITY_STATE_PLAN=1 FEDERAL_AUTHORITY_STATE_PLAN value
     * @property {number} FEDERAL_AUTHORITY_WAIVER_1915B=2 FEDERAL_AUTHORITY_WAIVER_1915B value
     * @property {number} FEDERAL_AUTHORITY_WAIVER_1115=3 FEDERAL_AUTHORITY_WAIVER_1115 value
     * @property {number} FEDERAL_AUTHORITY_VOLUNTARY=4 FEDERAL_AUTHORITY_VOLUNTARY value
     * @property {number} FEDERAL_AUTHORITY_BENCHMARK=5 FEDERAL_AUTHORITY_BENCHMARK value
     * @property {number} FEDERAL_AUTHORITY_TITLE_XXI=6 FEDERAL_AUTHORITY_TITLE_XXI value
     */
    mcreviewproto.FederalAuthority = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'FEDERAL_AUTHORITY_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'FEDERAL_AUTHORITY_STATE_PLAN')] = 1;
        values[(valuesById[2] = 'FEDERAL_AUTHORITY_WAIVER_1915B')] = 2;
        values[(valuesById[3] = 'FEDERAL_AUTHORITY_WAIVER_1115')] = 3;
        values[(valuesById[4] = 'FEDERAL_AUTHORITY_VOLUNTARY')] = 4;
        values[(valuesById[5] = 'FEDERAL_AUTHORITY_BENCHMARK')] = 5;
        values[(valuesById[6] = 'FEDERAL_AUTHORITY_TITLE_XXI')] = 6;
        return values;
    })();

    /**
     * ManagedCareEntity enum.
     * @name mcreviewproto.ManagedCareEntity
     * @enum {number}
     * @property {number} MANAGED_CARE_ENTITY_UNSPECIFIED=0 MANAGED_CARE_ENTITY_UNSPECIFIED value
     * @property {number} MANAGED_CARE_ENTITY_MCO=1 MANAGED_CARE_ENTITY_MCO value
     * @property {number} MANAGED_CARE_ENTITY_PIHP=2 MANAGED_CARE_ENTITY_PIHP value
     * @property {number} MANAGED_CARE_ENTITY_PAHP=3 MANAGED_CARE_ENTITY_PAHP value
     * @property {number} MANAGED_CARE_ENTITY_PCCM=4 MANAGED_CARE_ENTITY_PCCM value
     */
    mcreviewproto.ManagedCareEntity = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'MANAGED_CARE_ENTITY_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'MANAGED_CARE_ENTITY_MCO')] = 1;
        values[(valuesById[2] = 'MANAGED_CARE_ENTITY_PIHP')] = 2;
        values[(valuesById[3] = 'MANAGED_CARE_ENTITY_PAHP')] = 3;
        values[(valuesById[4] = 'MANAGED_CARE_ENTITY_PCCM')] = 4;
        return values;
    })();

    mcreviewproto.SharedRateCertDisplay = (function () {
        /**
         * Properties of a SharedRateCertDisplay.
         * @memberof mcreviewproto
         * @interface ISharedRateCertDisplay
         * @property {string|null} [packageId] SharedRateCertDisplay packageId
         * @property {string|null} [packageName] SharedRateCertDisplay packageName
         */

        /**
         * Constructs a new SharedRateCertDisplay.
         * @memberof mcreviewproto
         * @classdesc Represents a SharedRateCertDisplay.
         * @implements ISharedRateCertDisplay
         * @constructor
         * @param {mcreviewproto.ISharedRateCertDisplay=} [properties] Properties to set
         */
        function SharedRateCertDisplay(properties) {
            if (properties)
                for (
                    let keys = Object.keys(properties), i = 0;
                    i < keys.length;
                    ++i
                )
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SharedRateCertDisplay packageId.
         * @member {string} packageId
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @instance
         */
        SharedRateCertDisplay.prototype.packageId = '';

        /**
         * SharedRateCertDisplay packageName.
         * @member {string} packageName
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @instance
         */
        SharedRateCertDisplay.prototype.packageName = '';

        /**
         * Creates a new SharedRateCertDisplay instance using the specified properties.
         * @function create
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @static
         * @param {mcreviewproto.ISharedRateCertDisplay=} [properties] Properties to set
         * @returns {mcreviewproto.SharedRateCertDisplay} SharedRateCertDisplay instance
         */
        SharedRateCertDisplay.create = function create(properties) {
            return new SharedRateCertDisplay(properties);
        };

        /**
         * Encodes the specified SharedRateCertDisplay message. Does not implicitly {@link mcreviewproto.SharedRateCertDisplay.verify|verify} messages.
         * @function encode
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @static
         * @param {mcreviewproto.ISharedRateCertDisplay} message SharedRateCertDisplay message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SharedRateCertDisplay.encode = function encode(message, writer) {
            if (!writer) writer = $Writer.create();
            if (
                message.packageId != null &&
                Object.hasOwnProperty.call(message, 'packageId')
            )
                writer
                    .uint32(/* id 1, wireType 2 =*/ 10)
                    .string(message.packageId);
            if (
                message.packageName != null &&
                Object.hasOwnProperty.call(message, 'packageName')
            )
                writer
                    .uint32(/* id 2, wireType 2 =*/ 18)
                    .string(message.packageName);
            return writer;
        };

        /**
         * Encodes the specified SharedRateCertDisplay message, length delimited. Does not implicitly {@link mcreviewproto.SharedRateCertDisplay.verify|verify} messages.
         * @function encodeDelimited
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @static
         * @param {mcreviewproto.ISharedRateCertDisplay} message SharedRateCertDisplay message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SharedRateCertDisplay.encodeDelimited = function encodeDelimited(
            message,
            writer
        ) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SharedRateCertDisplay message from the specified reader or buffer.
         * @function decode
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {mcreviewproto.SharedRateCertDisplay} SharedRateCertDisplay
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SharedRateCertDisplay.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length,
                message = new $root.mcreviewproto.SharedRateCertDisplay();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1: {
                        message.packageId = reader.string();
                        break;
                    }
                    case 2: {
                        message.packageName = reader.string();
                        break;
                    }
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        };

        /**
         * Decodes a SharedRateCertDisplay message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {mcreviewproto.SharedRateCertDisplay} SharedRateCertDisplay
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SharedRateCertDisplay.decodeDelimited = function decodeDelimited(
            reader
        ) {
            if (!(reader instanceof $Reader)) reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SharedRateCertDisplay message.
         * @function verify
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SharedRateCertDisplay.verify = function verify(message) {
            if (typeof message !== 'object' || message === null)
                return 'object expected';
            if (
                message.packageId != null &&
                message.hasOwnProperty('packageId')
            )
                if (!$util.isString(message.packageId))
                    return 'packageId: string expected';
            if (
                message.packageName != null &&
                message.hasOwnProperty('packageName')
            )
                if (!$util.isString(message.packageName))
                    return 'packageName: string expected';
            return null;
        };

        /**
         * Creates a SharedRateCertDisplay message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {mcreviewproto.SharedRateCertDisplay} SharedRateCertDisplay
         */
        SharedRateCertDisplay.fromObject = function fromObject(object) {
            if (object instanceof $root.mcreviewproto.SharedRateCertDisplay)
                return object;
            let message = new $root.mcreviewproto.SharedRateCertDisplay();
            if (object.packageId != null)
                message.packageId = String(object.packageId);
            if (object.packageName != null)
                message.packageName = String(object.packageName);
            return message;
        };

        /**
         * Creates a plain object from a SharedRateCertDisplay message. Also converts values to other types if specified.
         * @function toObject
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @static
         * @param {mcreviewproto.SharedRateCertDisplay} message SharedRateCertDisplay
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SharedRateCertDisplay.toObject = function toObject(message, options) {
            if (!options) options = {};
            let object = {};
            if (options.defaults) {
                object.packageId = '';
                object.packageName = '';
            }
            if (
                message.packageId != null &&
                message.hasOwnProperty('packageId')
            )
                object.packageId = message.packageId;
            if (
                message.packageName != null &&
                message.hasOwnProperty('packageName')
            )
                object.packageName = message.packageName;
            return object;
        };

        /**
         * Converts this SharedRateCertDisplay to JSON.
         * @function toJSON
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SharedRateCertDisplay.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(
                this,
                $protobuf.util.toJSONOptions
            );
        };

        /**
         * Gets the default type url for SharedRateCertDisplay
         * @function getTypeUrl
         * @memberof mcreviewproto.SharedRateCertDisplay
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SharedRateCertDisplay.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = 'type.googleapis.com';
            }
            return typeUrlPrefix + '/mcreviewproto.SharedRateCertDisplay';
        };

        return SharedRateCertDisplay;
    })();

    mcreviewproto.RateInfo = (function () {
        /**
         * Properties of a RateInfo.
         * @memberof mcreviewproto
         * @interface IRateInfo
         * @property {string|null} [id] RateInfo id
         * @property {mcreviewproto.RateType|null} [rateType] RateInfo rateType
         * @property {mcreviewproto.IDate|null} [rateDateStart] RateInfo rateDateStart
         * @property {mcreviewproto.IDate|null} [rateDateEnd] RateInfo rateDateEnd
         * @property {mcreviewproto.IDate|null} [rateDateCertified] RateInfo rateDateCertified
         * @property {Array.<mcreviewproto.IActuaryContact>|null} [actuaryContacts] RateInfo actuaryContacts
         * @property {mcreviewproto.ActuaryCommunicationType|null} [actuaryCommunicationPreference] RateInfo actuaryCommunicationPreference
         * @property {Array.<mcreviewproto.IDocument>|null} [rateDocuments] RateInfo rateDocuments
         * @property {mcreviewproto.RateCapitationType|null} [rateCapitationType] RateInfo rateCapitationType
         * @property {Array.<string>|null} [rateProgramIds] RateInfo rateProgramIds
         * @property {string|null} [rateCertificationName] RateInfo rateCertificationName
         * @property {Array.<mcreviewproto.ISharedRateCertDisplay>|null} [packagesWithSharedRateCerts] RateInfo packagesWithSharedRateCerts
         * @property {Array.<mcreviewproto.IDocument>|null} [supportingDocuments] RateInfo supportingDocuments
         * @property {mcreviewproto.RateInfo.IRateAmendmentInfo|null} [rateAmendmentInfo] RateInfo rateAmendmentInfo
         */

        /**
         * Constructs a new RateInfo.
         * @memberof mcreviewproto
         * @classdesc Rate Info subtypes
         * @implements IRateInfo
         * @constructor
         * @param {mcreviewproto.IRateInfo=} [properties] Properties to set
         */
        function RateInfo(properties) {
            this.actuaryContacts = [];
            this.rateDocuments = [];
            this.rateProgramIds = [];
            this.packagesWithSharedRateCerts = [];
            this.supportingDocuments = [];
            if (properties)
                for (
                    let keys = Object.keys(properties), i = 0;
                    i < keys.length;
                    ++i
                )
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * RateInfo id.
         * @member {string|null|undefined} id
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.id = null;

        /**
         * RateInfo rateType.
         * @member {mcreviewproto.RateType|null|undefined} rateType
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.rateType = null;

        /**
         * RateInfo rateDateStart.
         * @member {mcreviewproto.IDate|null|undefined} rateDateStart
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.rateDateStart = null;

        /**
         * RateInfo rateDateEnd.
         * @member {mcreviewproto.IDate|null|undefined} rateDateEnd
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.rateDateEnd = null;

        /**
         * RateInfo rateDateCertified.
         * @member {mcreviewproto.IDate|null|undefined} rateDateCertified
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.rateDateCertified = null;

        /**
         * RateInfo actuaryContacts.
         * @member {Array.<mcreviewproto.IActuaryContact>} actuaryContacts
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.actuaryContacts = $util.emptyArray;

        /**
         * RateInfo actuaryCommunicationPreference.
         * @member {mcreviewproto.ActuaryCommunicationType|null|undefined} actuaryCommunicationPreference
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.actuaryCommunicationPreference = null;

        /**
         * RateInfo rateDocuments.
         * @member {Array.<mcreviewproto.IDocument>} rateDocuments
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.rateDocuments = $util.emptyArray;

        /**
         * RateInfo rateCapitationType.
         * @member {mcreviewproto.RateCapitationType|null|undefined} rateCapitationType
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.rateCapitationType = null;

        /**
         * RateInfo rateProgramIds.
         * @member {Array.<string>} rateProgramIds
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.rateProgramIds = $util.emptyArray;

        /**
         * RateInfo rateCertificationName.
         * @member {string|null|undefined} rateCertificationName
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.rateCertificationName = null;

        /**
         * RateInfo packagesWithSharedRateCerts.
         * @member {Array.<mcreviewproto.ISharedRateCertDisplay>} packagesWithSharedRateCerts
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.packagesWithSharedRateCerts = $util.emptyArray;

        /**
         * RateInfo supportingDocuments.
         * @member {Array.<mcreviewproto.IDocument>} supportingDocuments
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.supportingDocuments = $util.emptyArray;

        /**
         * RateInfo rateAmendmentInfo.
         * @member {mcreviewproto.RateInfo.IRateAmendmentInfo|null|undefined} rateAmendmentInfo
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        RateInfo.prototype.rateAmendmentInfo = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * RateInfo _id.
         * @member {"id"|undefined} _id
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        Object.defineProperty(RateInfo.prototype, '_id', {
            get: $util.oneOfGetter(($oneOfFields = ['id'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * RateInfo _rateType.
         * @member {"rateType"|undefined} _rateType
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        Object.defineProperty(RateInfo.prototype, '_rateType', {
            get: $util.oneOfGetter(($oneOfFields = ['rateType'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * RateInfo _rateDateStart.
         * @member {"rateDateStart"|undefined} _rateDateStart
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        Object.defineProperty(RateInfo.prototype, '_rateDateStart', {
            get: $util.oneOfGetter(($oneOfFields = ['rateDateStart'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * RateInfo _rateDateEnd.
         * @member {"rateDateEnd"|undefined} _rateDateEnd
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        Object.defineProperty(RateInfo.prototype, '_rateDateEnd', {
            get: $util.oneOfGetter(($oneOfFields = ['rateDateEnd'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * RateInfo _rateDateCertified.
         * @member {"rateDateCertified"|undefined} _rateDateCertified
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        Object.defineProperty(RateInfo.prototype, '_rateDateCertified', {
            get: $util.oneOfGetter(($oneOfFields = ['rateDateCertified'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * RateInfo _actuaryCommunicationPreference.
         * @member {"actuaryCommunicationPreference"|undefined} _actuaryCommunicationPreference
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        Object.defineProperty(
            RateInfo.prototype,
            '_actuaryCommunicationPreference',
            {
                get: $util.oneOfGetter(
                    ($oneOfFields = ['actuaryCommunicationPreference'])
                ),
                set: $util.oneOfSetter($oneOfFields),
            }
        );

        /**
         * RateInfo _rateCapitationType.
         * @member {"rateCapitationType"|undefined} _rateCapitationType
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        Object.defineProperty(RateInfo.prototype, '_rateCapitationType', {
            get: $util.oneOfGetter(($oneOfFields = ['rateCapitationType'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * RateInfo _rateCertificationName.
         * @member {"rateCertificationName"|undefined} _rateCertificationName
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        Object.defineProperty(RateInfo.prototype, '_rateCertificationName', {
            get: $util.oneOfGetter(($oneOfFields = ['rateCertificationName'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * RateInfo _rateAmendmentInfo.
         * @member {"rateAmendmentInfo"|undefined} _rateAmendmentInfo
         * @memberof mcreviewproto.RateInfo
         * @instance
         */
        Object.defineProperty(RateInfo.prototype, '_rateAmendmentInfo', {
            get: $util.oneOfGetter(($oneOfFields = ['rateAmendmentInfo'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new RateInfo instance using the specified properties.
         * @function create
         * @memberof mcreviewproto.RateInfo
         * @static
         * @param {mcreviewproto.IRateInfo=} [properties] Properties to set
         * @returns {mcreviewproto.RateInfo} RateInfo instance
         */
        RateInfo.create = function create(properties) {
            return new RateInfo(properties);
        };

        /**
         * Encodes the specified RateInfo message. Does not implicitly {@link mcreviewproto.RateInfo.verify|verify} messages.
         * @function encode
         * @memberof mcreviewproto.RateInfo
         * @static
         * @param {mcreviewproto.IRateInfo} message RateInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RateInfo.encode = function encode(message, writer) {
            if (!writer) writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, 'id'))
                writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.id);
            if (
                message.rateType != null &&
                Object.hasOwnProperty.call(message, 'rateType')
            )
                writer
                    .uint32(/* id 2, wireType 0 =*/ 16)
                    .int32(message.rateType);
            if (
                message.rateDateStart != null &&
                Object.hasOwnProperty.call(message, 'rateDateStart')
            )
                $root.mcreviewproto.Date.encode(
                    message.rateDateStart,
                    writer.uint32(/* id 3, wireType 2 =*/ 26).fork()
                ).ldelim();
            if (
                message.rateDateEnd != null &&
                Object.hasOwnProperty.call(message, 'rateDateEnd')
            )
                $root.mcreviewproto.Date.encode(
                    message.rateDateEnd,
                    writer.uint32(/* id 4, wireType 2 =*/ 34).fork()
                ).ldelim();
            if (
                message.rateDateCertified != null &&
                Object.hasOwnProperty.call(message, 'rateDateCertified')
            )
                $root.mcreviewproto.Date.encode(
                    message.rateDateCertified,
                    writer.uint32(/* id 5, wireType 2 =*/ 42).fork()
                ).ldelim();
            if (
                message.actuaryContacts != null &&
                message.actuaryContacts.length
            )
                for (let i = 0; i < message.actuaryContacts.length; ++i)
                    $root.mcreviewproto.ActuaryContact.encode(
                        message.actuaryContacts[i],
                        writer.uint32(/* id 6, wireType 2 =*/ 50).fork()
                    ).ldelim();
            if (
                message.actuaryCommunicationPreference != null &&
                Object.hasOwnProperty.call(
                    message,
                    'actuaryCommunicationPreference'
                )
            )
                writer
                    .uint32(/* id 7, wireType 0 =*/ 56)
                    .int32(message.actuaryCommunicationPreference);
            if (message.rateDocuments != null && message.rateDocuments.length)
                for (let i = 0; i < message.rateDocuments.length; ++i)
                    $root.mcreviewproto.Document.encode(
                        message.rateDocuments[i],
                        writer.uint32(/* id 8, wireType 2 =*/ 66).fork()
                    ).ldelim();
            if (
                message.rateCapitationType != null &&
                Object.hasOwnProperty.call(message, 'rateCapitationType')
            )
                writer
                    .uint32(/* id 9, wireType 0 =*/ 72)
                    .int32(message.rateCapitationType);
            if (message.rateProgramIds != null && message.rateProgramIds.length)
                for (let i = 0; i < message.rateProgramIds.length; ++i)
                    writer
                        .uint32(/* id 10, wireType 2 =*/ 82)
                        .string(message.rateProgramIds[i]);
            if (
                message.rateCertificationName != null &&
                Object.hasOwnProperty.call(message, 'rateCertificationName')
            )
                writer
                    .uint32(/* id 11, wireType 2 =*/ 90)
                    .string(message.rateCertificationName);
            if (
                message.packagesWithSharedRateCerts != null &&
                message.packagesWithSharedRateCerts.length
            )
                for (
                    let i = 0;
                    i < message.packagesWithSharedRateCerts.length;
                    ++i
                )
                    $root.mcreviewproto.SharedRateCertDisplay.encode(
                        message.packagesWithSharedRateCerts[i],
                        writer.uint32(/* id 12, wireType 2 =*/ 98).fork()
                    ).ldelim();
            if (
                message.supportingDocuments != null &&
                message.supportingDocuments.length
            )
                for (let i = 0; i < message.supportingDocuments.length; ++i)
                    $root.mcreviewproto.Document.encode(
                        message.supportingDocuments[i],
                        writer.uint32(/* id 13, wireType 2 =*/ 106).fork()
                    ).ldelim();
            if (
                message.rateAmendmentInfo != null &&
                Object.hasOwnProperty.call(message, 'rateAmendmentInfo')
            )
                $root.mcreviewproto.RateInfo.RateAmendmentInfo.encode(
                    message.rateAmendmentInfo,
                    writer.uint32(/* id 50, wireType 2 =*/ 402).fork()
                ).ldelim();
            return writer;
        };

        /**
         * Encodes the specified RateInfo message, length delimited. Does not implicitly {@link mcreviewproto.RateInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof mcreviewproto.RateInfo
         * @static
         * @param {mcreviewproto.IRateInfo} message RateInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RateInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RateInfo message from the specified reader or buffer.
         * @function decode
         * @memberof mcreviewproto.RateInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {mcreviewproto.RateInfo} RateInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RateInfo.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length,
                message = new $root.mcreviewproto.RateInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1: {
                        message.id = reader.string();
                        break;
                    }
                    case 2: {
                        message.rateType = reader.int32();
                        break;
                    }
                    case 3: {
                        message.rateDateStart = $root.mcreviewproto.Date.decode(
                            reader,
                            reader.uint32()
                        );
                        break;
                    }
                    case 4: {
                        message.rateDateEnd = $root.mcreviewproto.Date.decode(
                            reader,
                            reader.uint32()
                        );
                        break;
                    }
                    case 5: {
                        message.rateDateCertified =
                            $root.mcreviewproto.Date.decode(
                                reader,
                                reader.uint32()
                            );
                        break;
                    }
                    case 6: {
                        if (
                            !(
                                message.actuaryContacts &&
                                message.actuaryContacts.length
                            )
                        )
                            message.actuaryContacts = [];
                        message.actuaryContacts.push(
                            $root.mcreviewproto.ActuaryContact.decode(
                                reader,
                                reader.uint32()
                            )
                        );
                        break;
                    }
                    case 7: {
                        message.actuaryCommunicationPreference = reader.int32();
                        break;
                    }
                    case 8: {
                        if (
                            !(
                                message.rateDocuments &&
                                message.rateDocuments.length
                            )
                        )
                            message.rateDocuments = [];
                        message.rateDocuments.push(
                            $root.mcreviewproto.Document.decode(
                                reader,
                                reader.uint32()
                            )
                        );
                        break;
                    }
                    case 9: {
                        message.rateCapitationType = reader.int32();
                        break;
                    }
                    case 10: {
                        if (
                            !(
                                message.rateProgramIds &&
                                message.rateProgramIds.length
                            )
                        )
                            message.rateProgramIds = [];
                        message.rateProgramIds.push(reader.string());
                        break;
                    }
                    case 11: {
                        message.rateCertificationName = reader.string();
                        break;
                    }
                    case 12: {
                        if (
                            !(
                                message.packagesWithSharedRateCerts &&
                                message.packagesWithSharedRateCerts.length
                            )
                        )
                            message.packagesWithSharedRateCerts = [];
                        message.packagesWithSharedRateCerts.push(
                            $root.mcreviewproto.SharedRateCertDisplay.decode(
                                reader,
                                reader.uint32()
                            )
                        );
                        break;
                    }
                    case 13: {
                        if (
                            !(
                                message.supportingDocuments &&
                                message.supportingDocuments.length
                            )
                        )
                            message.supportingDocuments = [];
                        message.supportingDocuments.push(
                            $root.mcreviewproto.Document.decode(
                                reader,
                                reader.uint32()
                            )
                        );
                        break;
                    }
                    case 50: {
                        message.rateAmendmentInfo =
                            $root.mcreviewproto.RateInfo.RateAmendmentInfo.decode(
                                reader,
                                reader.uint32()
                            );
                        break;
                    }
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        };

        /**
         * Decodes a RateInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof mcreviewproto.RateInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {mcreviewproto.RateInfo} RateInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RateInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader)) reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RateInfo message.
         * @function verify
         * @memberof mcreviewproto.RateInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RateInfo.verify = function verify(message) {
            if (typeof message !== 'object' || message === null)
                return 'object expected';
            let properties = {};
            if (message.id != null && message.hasOwnProperty('id')) {
                properties._id = 1;
                if (!$util.isString(message.id)) return 'id: string expected';
            }
            if (
                message.rateType != null &&
                message.hasOwnProperty('rateType')
            ) {
                properties._rateType = 1;
                switch (message.rateType) {
                    default:
                        return 'rateType: enum value expected';
                    case 0:
                    case 1:
                    case 2:
                        break;
                }
            }
            if (
                message.rateDateStart != null &&
                message.hasOwnProperty('rateDateStart')
            ) {
                properties._rateDateStart = 1;
                {
                    let error = $root.mcreviewproto.Date.verify(
                        message.rateDateStart
                    );
                    if (error) return 'rateDateStart.' + error;
                }
            }
            if (
                message.rateDateEnd != null &&
                message.hasOwnProperty('rateDateEnd')
            ) {
                properties._rateDateEnd = 1;
                {
                    let error = $root.mcreviewproto.Date.verify(
                        message.rateDateEnd
                    );
                    if (error) return 'rateDateEnd.' + error;
                }
            }
            if (
                message.rateDateCertified != null &&
                message.hasOwnProperty('rateDateCertified')
            ) {
                properties._rateDateCertified = 1;
                {
                    let error = $root.mcreviewproto.Date.verify(
                        message.rateDateCertified
                    );
                    if (error) return 'rateDateCertified.' + error;
                }
            }
            if (
                message.actuaryContacts != null &&
                message.hasOwnProperty('actuaryContacts')
            ) {
                if (!Array.isArray(message.actuaryContacts))
                    return 'actuaryContacts: array expected';
                for (let i = 0; i < message.actuaryContacts.length; ++i) {
                    let error = $root.mcreviewproto.ActuaryContact.verify(
                        message.actuaryContacts[i]
                    );
                    if (error) return 'actuaryContacts.' + error;
                }
            }
            if (
                message.actuaryCommunicationPreference != null &&
                message.hasOwnProperty('actuaryCommunicationPreference')
            ) {
                properties._actuaryCommunicationPreference = 1;
                switch (message.actuaryCommunicationPreference) {
                    default:
                        return 'actuaryCommunicationPreference: enum value expected';
                    case 0:
                    case 1:
                    case 2:
                        break;
                }
            }
            if (
                message.rateDocuments != null &&
                message.hasOwnProperty('rateDocuments')
            ) {
                if (!Array.isArray(message.rateDocuments))
                    return 'rateDocuments: array expected';
                for (let i = 0; i < message.rateDocuments.length; ++i) {
                    let error = $root.mcreviewproto.Document.verify(
                        message.rateDocuments[i]
                    );
                    if (error) return 'rateDocuments.' + error;
                }
            }
            if (
                message.rateCapitationType != null &&
                message.hasOwnProperty('rateCapitationType')
            ) {
                properties._rateCapitationType = 1;
                switch (message.rateCapitationType) {
                    default:
                        return 'rateCapitationType: enum value expected';
                    case 0:
                    case 1:
                    case 2:
                        break;
                }
            }
            if (
                message.rateProgramIds != null &&
                message.hasOwnProperty('rateProgramIds')
            ) {
                if (!Array.isArray(message.rateProgramIds))
                    return 'rateProgramIds: array expected';
                for (let i = 0; i < message.rateProgramIds.length; ++i)
                    if (!$util.isString(message.rateProgramIds[i]))
                        return 'rateProgramIds: string[] expected';
            }
            if (
                message.rateCertificationName != null &&
                message.hasOwnProperty('rateCertificationName')
            ) {
                properties._rateCertificationName = 1;
                if (!$util.isString(message.rateCertificationName))
                    return 'rateCertificationName: string expected';
            }
            if (
                message.packagesWithSharedRateCerts != null &&
                message.hasOwnProperty('packagesWithSharedRateCerts')
            ) {
                if (!Array.isArray(message.packagesWithSharedRateCerts))
                    return 'packagesWithSharedRateCerts: array expected';
                for (
                    let i = 0;
                    i < message.packagesWithSharedRateCerts.length;
                    ++i
                ) {
                    let error =
                        $root.mcreviewproto.SharedRateCertDisplay.verify(
                            message.packagesWithSharedRateCerts[i]
                        );
                    if (error) return 'packagesWithSharedRateCerts.' + error;
                }
            }
            if (
                message.supportingDocuments != null &&
                message.hasOwnProperty('supportingDocuments')
            ) {
                if (!Array.isArray(message.supportingDocuments))
                    return 'supportingDocuments: array expected';
                for (let i = 0; i < message.supportingDocuments.length; ++i) {
                    let error = $root.mcreviewproto.Document.verify(
                        message.supportingDocuments[i]
                    );
                    if (error) return 'supportingDocuments.' + error;
                }
            }
            if (
                message.rateAmendmentInfo != null &&
                message.hasOwnProperty('rateAmendmentInfo')
            ) {
                properties._rateAmendmentInfo = 1;
                {
                    let error =
                        $root.mcreviewproto.RateInfo.RateAmendmentInfo.verify(
                            message.rateAmendmentInfo
                        );
                    if (error) return 'rateAmendmentInfo.' + error;
                }
            }
            return null;
        };

        /**
         * Creates a RateInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof mcreviewproto.RateInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {mcreviewproto.RateInfo} RateInfo
         */
        RateInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.mcreviewproto.RateInfo) return object;
            let message = new $root.mcreviewproto.RateInfo();
            if (object.id != null) message.id = String(object.id);
            switch (object.rateType) {
                default:
                    if (typeof object.rateType === 'number') {
                        message.rateType = object.rateType;
                        break;
                    }
                    break;
                case 'RATE_TYPE_UNSPECIFIED':
                case 0:
                    message.rateType = 0;
                    break;
                case 'RATE_TYPE_NEW':
                case 1:
                    message.rateType = 1;
                    break;
                case 'RATE_TYPE_AMENDMENT':
                case 2:
                    message.rateType = 2;
                    break;
            }
            if (object.rateDateStart != null) {
                if (typeof object.rateDateStart !== 'object')
                    throw TypeError(
                        '.mcreviewproto.RateInfo.rateDateStart: object expected'
                    );
                message.rateDateStart = $root.mcreviewproto.Date.fromObject(
                    object.rateDateStart
                );
            }
            if (object.rateDateEnd != null) {
                if (typeof object.rateDateEnd !== 'object')
                    throw TypeError(
                        '.mcreviewproto.RateInfo.rateDateEnd: object expected'
                    );
                message.rateDateEnd = $root.mcreviewproto.Date.fromObject(
                    object.rateDateEnd
                );
            }
            if (object.rateDateCertified != null) {
                if (typeof object.rateDateCertified !== 'object')
                    throw TypeError(
                        '.mcreviewproto.RateInfo.rateDateCertified: object expected'
                    );
                message.rateDateCertified = $root.mcreviewproto.Date.fromObject(
                    object.rateDateCertified
                );
            }
            if (object.actuaryContacts) {
                if (!Array.isArray(object.actuaryContacts))
                    throw TypeError(
                        '.mcreviewproto.RateInfo.actuaryContacts: array expected'
                    );
                message.actuaryContacts = [];
                for (let i = 0; i < object.actuaryContacts.length; ++i) {
                    if (typeof object.actuaryContacts[i] !== 'object')
                        throw TypeError(
                            '.mcreviewproto.RateInfo.actuaryContacts: object expected'
                        );
                    message.actuaryContacts[i] =
                        $root.mcreviewproto.ActuaryContact.fromObject(
                            object.actuaryContacts[i]
                        );
                }
            }
            switch (object.actuaryCommunicationPreference) {
                default:
                    if (
                        typeof object.actuaryCommunicationPreference ===
                        'number'
                    ) {
                        message.actuaryCommunicationPreference =
                            object.actuaryCommunicationPreference;
                        break;
                    }
                    break;
                case 'ACTUARY_COMMUNICATION_TYPE_UNSPECIFIED':
                case 0:
                    message.actuaryCommunicationPreference = 0;
                    break;
                case 'ACTUARY_COMMUNICATION_TYPE_OACT_TO_ACTUARY':
                case 1:
                    message.actuaryCommunicationPreference = 1;
                    break;
                case 'ACTUARY_COMMUNICATION_TYPE_OACT_TO_STATE':
                case 2:
                    message.actuaryCommunicationPreference = 2;
                    break;
            }
            if (object.rateDocuments) {
                if (!Array.isArray(object.rateDocuments))
                    throw TypeError(
                        '.mcreviewproto.RateInfo.rateDocuments: array expected'
                    );
                message.rateDocuments = [];
                for (let i = 0; i < object.rateDocuments.length; ++i) {
                    if (typeof object.rateDocuments[i] !== 'object')
                        throw TypeError(
                            '.mcreviewproto.RateInfo.rateDocuments: object expected'
                        );
                    message.rateDocuments[i] =
                        $root.mcreviewproto.Document.fromObject(
                            object.rateDocuments[i]
                        );
                }
            }
            switch (object.rateCapitationType) {
                default:
                    if (typeof object.rateCapitationType === 'number') {
                        message.rateCapitationType = object.rateCapitationType;
                        break;
                    }
                    break;
                case 'RATE_CAPITATION_TYPE_UNSPECIFIED':
                case 0:
                    message.rateCapitationType = 0;
                    break;
                case 'RATE_CAPITATION_TYPE_RATE_CELL':
                case 1:
                    message.rateCapitationType = 1;
                    break;
                case 'RATE_CAPITATION_TYPE_RATE_RANGE':
                case 2:
                    message.rateCapitationType = 2;
                    break;
            }
            if (object.rateProgramIds) {
                if (!Array.isArray(object.rateProgramIds))
                    throw TypeError(
                        '.mcreviewproto.RateInfo.rateProgramIds: array expected'
                    );
                message.rateProgramIds = [];
                for (let i = 0; i < object.rateProgramIds.length; ++i)
                    message.rateProgramIds[i] = String(
                        object.rateProgramIds[i]
                    );
            }
            if (object.rateCertificationName != null)
                message.rateCertificationName = String(
                    object.rateCertificationName
                );
            if (object.packagesWithSharedRateCerts) {
                if (!Array.isArray(object.packagesWithSharedRateCerts))
                    throw TypeError(
                        '.mcreviewproto.RateInfo.packagesWithSharedRateCerts: array expected'
                    );
                message.packagesWithSharedRateCerts = [];
                for (
                    let i = 0;
                    i < object.packagesWithSharedRateCerts.length;
                    ++i
                ) {
                    if (
                        typeof object.packagesWithSharedRateCerts[i] !==
                        'object'
                    )
                        throw TypeError(
                            '.mcreviewproto.RateInfo.packagesWithSharedRateCerts: object expected'
                        );
                    message.packagesWithSharedRateCerts[i] =
                        $root.mcreviewproto.SharedRateCertDisplay.fromObject(
                            object.packagesWithSharedRateCerts[i]
                        );
                }
            }
            if (object.supportingDocuments) {
                if (!Array.isArray(object.supportingDocuments))
                    throw TypeError(
                        '.mcreviewproto.RateInfo.supportingDocuments: array expected'
                    );
                message.supportingDocuments = [];
                for (let i = 0; i < object.supportingDocuments.length; ++i) {
                    if (typeof object.supportingDocuments[i] !== 'object')
                        throw TypeError(
                            '.mcreviewproto.RateInfo.supportingDocuments: object expected'
                        );
                    message.supportingDocuments[i] =
                        $root.mcreviewproto.Document.fromObject(
                            object.supportingDocuments[i]
                        );
                }
            }
            if (object.rateAmendmentInfo != null) {
                if (typeof object.rateAmendmentInfo !== 'object')
                    throw TypeError(
                        '.mcreviewproto.RateInfo.rateAmendmentInfo: object expected'
                    );
                message.rateAmendmentInfo =
                    $root.mcreviewproto.RateInfo.RateAmendmentInfo.fromObject(
                        object.rateAmendmentInfo
                    );
            }
            return message;
        };

        /**
         * Creates a plain object from a RateInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof mcreviewproto.RateInfo
         * @static
         * @param {mcreviewproto.RateInfo} message RateInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RateInfo.toObject = function toObject(message, options) {
            if (!options) options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.actuaryContacts = [];
                object.rateDocuments = [];
                object.rateProgramIds = [];
                object.packagesWithSharedRateCerts = [];
                object.supportingDocuments = [];
            }
            if (message.id != null && message.hasOwnProperty('id')) {
                object.id = message.id;
                if (options.oneofs) object._id = 'id';
            }
            if (
                message.rateType != null &&
                message.hasOwnProperty('rateType')
            ) {
                object.rateType =
                    options.enums === String
                        ? $root.mcreviewproto.RateType[message.rateType] ===
                          undefined
                            ? message.rateType
                            : $root.mcreviewproto.RateType[message.rateType]
                        : message.rateType;
                if (options.oneofs) object._rateType = 'rateType';
            }
            if (
                message.rateDateStart != null &&
                message.hasOwnProperty('rateDateStart')
            ) {
                object.rateDateStart = $root.mcreviewproto.Date.toObject(
                    message.rateDateStart,
                    options
                );
                if (options.oneofs) object._rateDateStart = 'rateDateStart';
            }
            if (
                message.rateDateEnd != null &&
                message.hasOwnProperty('rateDateEnd')
            ) {
                object.rateDateEnd = $root.mcreviewproto.Date.toObject(
                    message.rateDateEnd,
                    options
                );
                if (options.oneofs) object._rateDateEnd = 'rateDateEnd';
            }
            if (
                message.rateDateCertified != null &&
                message.hasOwnProperty('rateDateCertified')
            ) {
                object.rateDateCertified = $root.mcreviewproto.Date.toObject(
                    message.rateDateCertified,
                    options
                );
                if (options.oneofs)
                    object._rateDateCertified = 'rateDateCertified';
            }
            if (message.actuaryContacts && message.actuaryContacts.length) {
                object.actuaryContacts = [];
                for (let j = 0; j < message.actuaryContacts.length; ++j)
                    object.actuaryContacts[j] =
                        $root.mcreviewproto.ActuaryContact.toObject(
                            message.actuaryContacts[j],
                            options
                        );
            }
            if (
                message.actuaryCommunicationPreference != null &&
                message.hasOwnProperty('actuaryCommunicationPreference')
            ) {
                object.actuaryCommunicationPreference =
                    options.enums === String
                        ? $root.mcreviewproto.ActuaryCommunicationType[
                              message.actuaryCommunicationPreference
                          ] === undefined
                            ? message.actuaryCommunicationPreference
                            : $root.mcreviewproto.ActuaryCommunicationType[
                                  message.actuaryCommunicationPreference
                              ]
                        : message.actuaryCommunicationPreference;
                if (options.oneofs)
                    object._actuaryCommunicationPreference =
                        'actuaryCommunicationPreference';
            }
            if (message.rateDocuments && message.rateDocuments.length) {
                object.rateDocuments = [];
                for (let j = 0; j < message.rateDocuments.length; ++j)
                    object.rateDocuments[j] =
                        $root.mcreviewproto.Document.toObject(
                            message.rateDocuments[j],
                            options
                        );
            }
            if (
                message.rateCapitationType != null &&
                message.hasOwnProperty('rateCapitationType')
            ) {
                object.rateCapitationType =
                    options.enums === String
                        ? $root.mcreviewproto.RateCapitationType[
                              message.rateCapitationType
                          ] === undefined
                            ? message.rateCapitationType
                            : $root.mcreviewproto.RateCapitationType[
                                  message.rateCapitationType
                              ]
                        : message.rateCapitationType;
                if (options.oneofs)
                    object._rateCapitationType = 'rateCapitationType';
            }
            if (message.rateProgramIds && message.rateProgramIds.length) {
                object.rateProgramIds = [];
                for (let j = 0; j < message.rateProgramIds.length; ++j)
                    object.rateProgramIds[j] = message.rateProgramIds[j];
            }
            if (
                message.rateCertificationName != null &&
                message.hasOwnProperty('rateCertificationName')
            ) {
                object.rateCertificationName = message.rateCertificationName;
                if (options.oneofs)
                    object._rateCertificationName = 'rateCertificationName';
            }
            if (
                message.packagesWithSharedRateCerts &&
                message.packagesWithSharedRateCerts.length
            ) {
                object.packagesWithSharedRateCerts = [];
                for (
                    let j = 0;
                    j < message.packagesWithSharedRateCerts.length;
                    ++j
                )
                    object.packagesWithSharedRateCerts[j] =
                        $root.mcreviewproto.SharedRateCertDisplay.toObject(
                            message.packagesWithSharedRateCerts[j],
                            options
                        );
            }
            if (
                message.supportingDocuments &&
                message.supportingDocuments.length
            ) {
                object.supportingDocuments = [];
                for (let j = 0; j < message.supportingDocuments.length; ++j)
                    object.supportingDocuments[j] =
                        $root.mcreviewproto.Document.toObject(
                            message.supportingDocuments[j],
                            options
                        );
            }
            if (
                message.rateAmendmentInfo != null &&
                message.hasOwnProperty('rateAmendmentInfo')
            ) {
                object.rateAmendmentInfo =
                    $root.mcreviewproto.RateInfo.RateAmendmentInfo.toObject(
                        message.rateAmendmentInfo,
                        options
                    );
                if (options.oneofs)
                    object._rateAmendmentInfo = 'rateAmendmentInfo';
            }
            return object;
        };

        /**
         * Converts this RateInfo to JSON.
         * @function toJSON
         * @memberof mcreviewproto.RateInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RateInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(
                this,
                $protobuf.util.toJSONOptions
            );
        };

        /**
         * Gets the default type url for RateInfo
         * @function getTypeUrl
         * @memberof mcreviewproto.RateInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        RateInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = 'type.googleapis.com';
            }
            return typeUrlPrefix + '/mcreviewproto.RateInfo';
        };

        RateInfo.RateAmendmentInfo = (function () {
            /**
             * Properties of a RateAmendmentInfo.
             * @memberof mcreviewproto.RateInfo
             * @interface IRateAmendmentInfo
             * @property {mcreviewproto.IDate|null} [effectiveDateStart] RateAmendmentInfo effectiveDateStart
             * @property {mcreviewproto.IDate|null} [effectiveDateEnd] RateAmendmentInfo effectiveDateEnd
             */

            /**
             * Constructs a new RateAmendmentInfo.
             * @memberof mcreviewproto.RateInfo
             * @classdesc Represents a RateAmendmentInfo.
             * @implements IRateAmendmentInfo
             * @constructor
             * @param {mcreviewproto.RateInfo.IRateAmendmentInfo=} [properties] Properties to set
             */
            function RateAmendmentInfo(properties) {
                if (properties)
                    for (
                        let keys = Object.keys(properties), i = 0;
                        i < keys.length;
                        ++i
                    )
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * RateAmendmentInfo effectiveDateStart.
             * @member {mcreviewproto.IDate|null|undefined} effectiveDateStart
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @instance
             */
            RateAmendmentInfo.prototype.effectiveDateStart = null;

            /**
             * RateAmendmentInfo effectiveDateEnd.
             * @member {mcreviewproto.IDate|null|undefined} effectiveDateEnd
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @instance
             */
            RateAmendmentInfo.prototype.effectiveDateEnd = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * RateAmendmentInfo _effectiveDateStart.
             * @member {"effectiveDateStart"|undefined} _effectiveDateStart
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @instance
             */
            Object.defineProperty(
                RateAmendmentInfo.prototype,
                '_effectiveDateStart',
                {
                    get: $util.oneOfGetter(
                        ($oneOfFields = ['effectiveDateStart'])
                    ),
                    set: $util.oneOfSetter($oneOfFields),
                }
            );

            /**
             * RateAmendmentInfo _effectiveDateEnd.
             * @member {"effectiveDateEnd"|undefined} _effectiveDateEnd
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @instance
             */
            Object.defineProperty(
                RateAmendmentInfo.prototype,
                '_effectiveDateEnd',
                {
                    get: $util.oneOfGetter(
                        ($oneOfFields = ['effectiveDateEnd'])
                    ),
                    set: $util.oneOfSetter($oneOfFields),
                }
            );

            /**
             * Creates a new RateAmendmentInfo instance using the specified properties.
             * @function create
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @static
             * @param {mcreviewproto.RateInfo.IRateAmendmentInfo=} [properties] Properties to set
             * @returns {mcreviewproto.RateInfo.RateAmendmentInfo} RateAmendmentInfo instance
             */
            RateAmendmentInfo.create = function create(properties) {
                return new RateAmendmentInfo(properties);
            };

            /**
             * Encodes the specified RateAmendmentInfo message. Does not implicitly {@link mcreviewproto.RateInfo.RateAmendmentInfo.verify|verify} messages.
             * @function encode
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @static
             * @param {mcreviewproto.RateInfo.IRateAmendmentInfo} message RateAmendmentInfo message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RateAmendmentInfo.encode = function encode(message, writer) {
                if (!writer) writer = $Writer.create();
                if (
                    message.effectiveDateStart != null &&
                    Object.hasOwnProperty.call(message, 'effectiveDateStart')
                )
                    $root.mcreviewproto.Date.encode(
                        message.effectiveDateStart,
                        writer.uint32(/* id 1, wireType 2 =*/ 10).fork()
                    ).ldelim();
                if (
                    message.effectiveDateEnd != null &&
                    Object.hasOwnProperty.call(message, 'effectiveDateEnd')
                )
                    $root.mcreviewproto.Date.encode(
                        message.effectiveDateEnd,
                        writer.uint32(/* id 2, wireType 2 =*/ 18).fork()
                    ).ldelim();
                return writer;
            };

            /**
             * Encodes the specified RateAmendmentInfo message, length delimited. Does not implicitly {@link mcreviewproto.RateInfo.RateAmendmentInfo.verify|verify} messages.
             * @function encodeDelimited
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @static
             * @param {mcreviewproto.RateInfo.IRateAmendmentInfo} message RateAmendmentInfo message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RateAmendmentInfo.encodeDelimited = function encodeDelimited(
                message,
                writer
            ) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a RateAmendmentInfo message from the specified reader or buffer.
             * @function decode
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {mcreviewproto.RateInfo.RateAmendmentInfo} RateAmendmentInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RateAmendmentInfo.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end =
                        length === undefined ? reader.len : reader.pos + length,
                    message =
                        new $root.mcreviewproto.RateInfo.RateAmendmentInfo();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1: {
                            message.effectiveDateStart =
                                $root.mcreviewproto.Date.decode(
                                    reader,
                                    reader.uint32()
                                );
                            break;
                        }
                        case 2: {
                            message.effectiveDateEnd =
                                $root.mcreviewproto.Date.decode(
                                    reader,
                                    reader.uint32()
                                );
                            break;
                        }
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return message;
            };

            /**
             * Decodes a RateAmendmentInfo message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {mcreviewproto.RateInfo.RateAmendmentInfo} RateAmendmentInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RateAmendmentInfo.decodeDelimited = function decodeDelimited(
                reader
            ) {
                if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a RateAmendmentInfo message.
             * @function verify
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            RateAmendmentInfo.verify = function verify(message) {
                if (typeof message !== 'object' || message === null)
                    return 'object expected';
                let properties = {};
                if (
                    message.effectiveDateStart != null &&
                    message.hasOwnProperty('effectiveDateStart')
                ) {
                    properties._effectiveDateStart = 1;
                    {
                        let error = $root.mcreviewproto.Date.verify(
                            message.effectiveDateStart
                        );
                        if (error) return 'effectiveDateStart.' + error;
                    }
                }
                if (
                    message.effectiveDateEnd != null &&
                    message.hasOwnProperty('effectiveDateEnd')
                ) {
                    properties._effectiveDateEnd = 1;
                    {
                        let error = $root.mcreviewproto.Date.verify(
                            message.effectiveDateEnd
                        );
                        if (error) return 'effectiveDateEnd.' + error;
                    }
                }
                return null;
            };

            /**
             * Creates a RateAmendmentInfo message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {mcreviewproto.RateInfo.RateAmendmentInfo} RateAmendmentInfo
             */
            RateAmendmentInfo.fromObject = function fromObject(object) {
                if (
                    object instanceof
                    $root.mcreviewproto.RateInfo.RateAmendmentInfo
                )
                    return object;
                let message =
                    new $root.mcreviewproto.RateInfo.RateAmendmentInfo();
                if (object.effectiveDateStart != null) {
                    if (typeof object.effectiveDateStart !== 'object')
                        throw TypeError(
                            '.mcreviewproto.RateInfo.RateAmendmentInfo.effectiveDateStart: object expected'
                        );
                    message.effectiveDateStart =
                        $root.mcreviewproto.Date.fromObject(
                            object.effectiveDateStart
                        );
                }
                if (object.effectiveDateEnd != null) {
                    if (typeof object.effectiveDateEnd !== 'object')
                        throw TypeError(
                            '.mcreviewproto.RateInfo.RateAmendmentInfo.effectiveDateEnd: object expected'
                        );
                    message.effectiveDateEnd =
                        $root.mcreviewproto.Date.fromObject(
                            object.effectiveDateEnd
                        );
                }
                return message;
            };

            /**
             * Creates a plain object from a RateAmendmentInfo message. Also converts values to other types if specified.
             * @function toObject
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @static
             * @param {mcreviewproto.RateInfo.RateAmendmentInfo} message RateAmendmentInfo
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            RateAmendmentInfo.toObject = function toObject(message, options) {
                if (!options) options = {};
                let object = {};
                if (
                    message.effectiveDateStart != null &&
                    message.hasOwnProperty('effectiveDateStart')
                ) {
                    object.effectiveDateStart =
                        $root.mcreviewproto.Date.toObject(
                            message.effectiveDateStart,
                            options
                        );
                    if (options.oneofs)
                        object._effectiveDateStart = 'effectiveDateStart';
                }
                if (
                    message.effectiveDateEnd != null &&
                    message.hasOwnProperty('effectiveDateEnd')
                ) {
                    object.effectiveDateEnd = $root.mcreviewproto.Date.toObject(
                        message.effectiveDateEnd,
                        options
                    );
                    if (options.oneofs)
                        object._effectiveDateEnd = 'effectiveDateEnd';
                }
                return object;
            };

            /**
             * Converts this RateAmendmentInfo to JSON.
             * @function toJSON
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            RateAmendmentInfo.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(
                    this,
                    $protobuf.util.toJSONOptions
                );
            };

            /**
             * Gets the default type url for RateAmendmentInfo
             * @function getTypeUrl
             * @memberof mcreviewproto.RateInfo.RateAmendmentInfo
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            RateAmendmentInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = 'type.googleapis.com';
                }
                return (
                    typeUrlPrefix + '/mcreviewproto.RateInfo.RateAmendmentInfo'
                );
            };

            return RateAmendmentInfo;
        })();

        return RateInfo;
    })();

    /**
     * RateType enum.
     * @name mcreviewproto.RateType
     * @enum {number}
     * @property {number} RATE_TYPE_UNSPECIFIED=0 RATE_TYPE_UNSPECIFIED value
     * @property {number} RATE_TYPE_NEW=1 RATE_TYPE_NEW value
     * @property {number} RATE_TYPE_AMENDMENT=2 RATE_TYPE_AMENDMENT value
     */
    mcreviewproto.RateType = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'RATE_TYPE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'RATE_TYPE_NEW')] = 1;
        values[(valuesById[2] = 'RATE_TYPE_AMENDMENT')] = 2;
        return values;
    })();

    /**
     * RateCapitationType enum.
     * @name mcreviewproto.RateCapitationType
     * @enum {number}
     * @property {number} RATE_CAPITATION_TYPE_UNSPECIFIED=0 RATE_CAPITATION_TYPE_UNSPECIFIED value
     * @property {number} RATE_CAPITATION_TYPE_RATE_CELL=1 RATE_CAPITATION_TYPE_RATE_CELL value
     * @property {number} RATE_CAPITATION_TYPE_RATE_RANGE=2 RATE_CAPITATION_TYPE_RATE_RANGE value
     */
    mcreviewproto.RateCapitationType = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'RATE_CAPITATION_TYPE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'RATE_CAPITATION_TYPE_RATE_CELL')] = 1;
        values[(valuesById[2] = 'RATE_CAPITATION_TYPE_RATE_RANGE')] = 2;
        return values;
    })();

    /**
     * ActuaryCommunicationType enum.
     * @name mcreviewproto.ActuaryCommunicationType
     * @enum {number}
     * @property {number} ACTUARY_COMMUNICATION_TYPE_UNSPECIFIED=0 ACTUARY_COMMUNICATION_TYPE_UNSPECIFIED value
     * @property {number} ACTUARY_COMMUNICATION_TYPE_OACT_TO_ACTUARY=1 ACTUARY_COMMUNICATION_TYPE_OACT_TO_ACTUARY value
     * @property {number} ACTUARY_COMMUNICATION_TYPE_OACT_TO_STATE=2 ACTUARY_COMMUNICATION_TYPE_OACT_TO_STATE value
     */
    mcreviewproto.ActuaryCommunicationType = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'ACTUARY_COMMUNICATION_TYPE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'ACTUARY_COMMUNICATION_TYPE_OACT_TO_ACTUARY')] =
            1;
        values[(valuesById[2] = 'ACTUARY_COMMUNICATION_TYPE_OACT_TO_STATE')] =
            2;
        return values;
    })();

    /**
     * ActuarialFirmType enum.
     * @name mcreviewproto.ActuarialFirmType
     * @enum {number}
     * @property {number} ACTUARIAL_FIRM_TYPE_UNSPECIFIED=0 ACTUARIAL_FIRM_TYPE_UNSPECIFIED value
     * @property {number} ACTUARIAL_FIRM_TYPE_MERCER=1 ACTUARIAL_FIRM_TYPE_MERCER value
     * @property {number} ACTUARIAL_FIRM_TYPE_MILLIMAN=2 ACTUARIAL_FIRM_TYPE_MILLIMAN value
     * @property {number} ACTUARIAL_FIRM_TYPE_OPTUMAS=3 ACTUARIAL_FIRM_TYPE_OPTUMAS value
     * @property {number} ACTUARIAL_FIRM_TYPE_GUIDEHOUSE=4 ACTUARIAL_FIRM_TYPE_GUIDEHOUSE value
     * @property {number} ACTUARIAL_FIRM_TYPE_DELOITTE=5 ACTUARIAL_FIRM_TYPE_DELOITTE value
     * @property {number} ACTUARIAL_FIRM_TYPE_STATE_IN_HOUSE=6 ACTUARIAL_FIRM_TYPE_STATE_IN_HOUSE value
     * @property {number} ACTUARIAL_FIRM_TYPE_OTHER=7 ACTUARIAL_FIRM_TYPE_OTHER value
     */
    mcreviewproto.ActuarialFirmType = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'ACTUARIAL_FIRM_TYPE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'ACTUARIAL_FIRM_TYPE_MERCER')] = 1;
        values[(valuesById[2] = 'ACTUARIAL_FIRM_TYPE_MILLIMAN')] = 2;
        values[(valuesById[3] = 'ACTUARIAL_FIRM_TYPE_OPTUMAS')] = 3;
        values[(valuesById[4] = 'ACTUARIAL_FIRM_TYPE_GUIDEHOUSE')] = 4;
        values[(valuesById[5] = 'ACTUARIAL_FIRM_TYPE_DELOITTE')] = 5;
        values[(valuesById[6] = 'ACTUARIAL_FIRM_TYPE_STATE_IN_HOUSE')] = 6;
        values[(valuesById[7] = 'ACTUARIAL_FIRM_TYPE_OTHER')] = 7;
        return values;
    })();

    /**
     * Generic sub types
     * @name mcreviewproto.DocumentCategory
     * @enum {number}
     * @property {number} DOCUMENT_CATEGORY_UNSPECIFIED=0 DOCUMENT_CATEGORY_UNSPECIFIED value
     * @property {number} DOCUMENT_CATEGORY_CONTRACT=1 DOCUMENT_CATEGORY_CONTRACT value
     * @property {number} DOCUMENT_CATEGORY_RATES=2 DOCUMENT_CATEGORY_RATES value
     * @property {number} DOCUMENT_CATEGORY_CONTRACT_RELATED=3 DOCUMENT_CATEGORY_CONTRACT_RELATED value
     * @property {number} DOCUMENT_CATEGORY_RATES_RELATED=4 DOCUMENT_CATEGORY_RATES_RELATED value
     */
    mcreviewproto.DocumentCategory = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'DOCUMENT_CATEGORY_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'DOCUMENT_CATEGORY_CONTRACT')] = 1;
        values[(valuesById[2] = 'DOCUMENT_CATEGORY_RATES')] = 2;
        values[(valuesById[3] = 'DOCUMENT_CATEGORY_CONTRACT_RELATED')] = 3;
        values[(valuesById[4] = 'DOCUMENT_CATEGORY_RATES_RELATED')] = 4;
        return values;
    })();

    mcreviewproto.ActuaryContact = (function () {
        /**
         * Properties of an ActuaryContact.
         * @memberof mcreviewproto
         * @interface IActuaryContact
         * @property {mcreviewproto.IContact|null} [contact] ActuaryContact contact
         * @property {mcreviewproto.ActuarialFirmType|null} [actuarialFirmType] ActuaryContact actuarialFirmType
         * @property {string|null} [actuarialFirmOther] ActuaryContact actuarialFirmOther
         */

        /**
         * Constructs a new ActuaryContact.
         * @memberof mcreviewproto
         * @classdesc Represents an ActuaryContact.
         * @implements IActuaryContact
         * @constructor
         * @param {mcreviewproto.IActuaryContact=} [properties] Properties to set
         */
        function ActuaryContact(properties) {
            if (properties)
                for (
                    let keys = Object.keys(properties), i = 0;
                    i < keys.length;
                    ++i
                )
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ActuaryContact contact.
         * @member {mcreviewproto.IContact|null|undefined} contact
         * @memberof mcreviewproto.ActuaryContact
         * @instance
         */
        ActuaryContact.prototype.contact = null;

        /**
         * ActuaryContact actuarialFirmType.
         * @member {mcreviewproto.ActuarialFirmType|null|undefined} actuarialFirmType
         * @memberof mcreviewproto.ActuaryContact
         * @instance
         */
        ActuaryContact.prototype.actuarialFirmType = null;

        /**
         * ActuaryContact actuarialFirmOther.
         * @member {string|null|undefined} actuarialFirmOther
         * @memberof mcreviewproto.ActuaryContact
         * @instance
         */
        ActuaryContact.prototype.actuarialFirmOther = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * ActuaryContact _contact.
         * @member {"contact"|undefined} _contact
         * @memberof mcreviewproto.ActuaryContact
         * @instance
         */
        Object.defineProperty(ActuaryContact.prototype, '_contact', {
            get: $util.oneOfGetter(($oneOfFields = ['contact'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * ActuaryContact _actuarialFirmType.
         * @member {"actuarialFirmType"|undefined} _actuarialFirmType
         * @memberof mcreviewproto.ActuaryContact
         * @instance
         */
        Object.defineProperty(ActuaryContact.prototype, '_actuarialFirmType', {
            get: $util.oneOfGetter(($oneOfFields = ['actuarialFirmType'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * ActuaryContact _actuarialFirmOther.
         * @member {"actuarialFirmOther"|undefined} _actuarialFirmOther
         * @memberof mcreviewproto.ActuaryContact
         * @instance
         */
        Object.defineProperty(ActuaryContact.prototype, '_actuarialFirmOther', {
            get: $util.oneOfGetter(($oneOfFields = ['actuarialFirmOther'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new ActuaryContact instance using the specified properties.
         * @function create
         * @memberof mcreviewproto.ActuaryContact
         * @static
         * @param {mcreviewproto.IActuaryContact=} [properties] Properties to set
         * @returns {mcreviewproto.ActuaryContact} ActuaryContact instance
         */
        ActuaryContact.create = function create(properties) {
            return new ActuaryContact(properties);
        };

        /**
         * Encodes the specified ActuaryContact message. Does not implicitly {@link mcreviewproto.ActuaryContact.verify|verify} messages.
         * @function encode
         * @memberof mcreviewproto.ActuaryContact
         * @static
         * @param {mcreviewproto.IActuaryContact} message ActuaryContact message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ActuaryContact.encode = function encode(message, writer) {
            if (!writer) writer = $Writer.create();
            if (
                message.contact != null &&
                Object.hasOwnProperty.call(message, 'contact')
            )
                $root.mcreviewproto.Contact.encode(
                    message.contact,
                    writer.uint32(/* id 1, wireType 2 =*/ 10).fork()
                ).ldelim();
            if (
                message.actuarialFirmType != null &&
                Object.hasOwnProperty.call(message, 'actuarialFirmType')
            )
                writer
                    .uint32(/* id 2, wireType 0 =*/ 16)
                    .int32(message.actuarialFirmType);
            if (
                message.actuarialFirmOther != null &&
                Object.hasOwnProperty.call(message, 'actuarialFirmOther')
            )
                writer
                    .uint32(/* id 3, wireType 2 =*/ 26)
                    .string(message.actuarialFirmOther);
            return writer;
        };

        /**
         * Encodes the specified ActuaryContact message, length delimited. Does not implicitly {@link mcreviewproto.ActuaryContact.verify|verify} messages.
         * @function encodeDelimited
         * @memberof mcreviewproto.ActuaryContact
         * @static
         * @param {mcreviewproto.IActuaryContact} message ActuaryContact message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ActuaryContact.encodeDelimited = function encodeDelimited(
            message,
            writer
        ) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an ActuaryContact message from the specified reader or buffer.
         * @function decode
         * @memberof mcreviewproto.ActuaryContact
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {mcreviewproto.ActuaryContact} ActuaryContact
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ActuaryContact.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length,
                message = new $root.mcreviewproto.ActuaryContact();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1: {
                        message.contact = $root.mcreviewproto.Contact.decode(
                            reader,
                            reader.uint32()
                        );
                        break;
                    }
                    case 2: {
                        message.actuarialFirmType = reader.int32();
                        break;
                    }
                    case 3: {
                        message.actuarialFirmOther = reader.string();
                        break;
                    }
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        };

        /**
         * Decodes an ActuaryContact message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof mcreviewproto.ActuaryContact
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {mcreviewproto.ActuaryContact} ActuaryContact
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ActuaryContact.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader)) reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an ActuaryContact message.
         * @function verify
         * @memberof mcreviewproto.ActuaryContact
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ActuaryContact.verify = function verify(message) {
            if (typeof message !== 'object' || message === null)
                return 'object expected';
            let properties = {};
            if (message.contact != null && message.hasOwnProperty('contact')) {
                properties._contact = 1;
                {
                    let error = $root.mcreviewproto.Contact.verify(
                        message.contact
                    );
                    if (error) return 'contact.' + error;
                }
            }
            if (
                message.actuarialFirmType != null &&
                message.hasOwnProperty('actuarialFirmType')
            ) {
                properties._actuarialFirmType = 1;
                switch (message.actuarialFirmType) {
                    default:
                        return 'actuarialFirmType: enum value expected';
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                        break;
                }
            }
            if (
                message.actuarialFirmOther != null &&
                message.hasOwnProperty('actuarialFirmOther')
            ) {
                properties._actuarialFirmOther = 1;
                if (!$util.isString(message.actuarialFirmOther))
                    return 'actuarialFirmOther: string expected';
            }
            return null;
        };

        /**
         * Creates an ActuaryContact message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof mcreviewproto.ActuaryContact
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {mcreviewproto.ActuaryContact} ActuaryContact
         */
        ActuaryContact.fromObject = function fromObject(object) {
            if (object instanceof $root.mcreviewproto.ActuaryContact)
                return object;
            let message = new $root.mcreviewproto.ActuaryContact();
            if (object.contact != null) {
                if (typeof object.contact !== 'object')
                    throw TypeError(
                        '.mcreviewproto.ActuaryContact.contact: object expected'
                    );
                message.contact = $root.mcreviewproto.Contact.fromObject(
                    object.contact
                );
            }
            switch (object.actuarialFirmType) {
                default:
                    if (typeof object.actuarialFirmType === 'number') {
                        message.actuarialFirmType = object.actuarialFirmType;
                        break;
                    }
                    break;
                case 'ACTUARIAL_FIRM_TYPE_UNSPECIFIED':
                case 0:
                    message.actuarialFirmType = 0;
                    break;
                case 'ACTUARIAL_FIRM_TYPE_MERCER':
                case 1:
                    message.actuarialFirmType = 1;
                    break;
                case 'ACTUARIAL_FIRM_TYPE_MILLIMAN':
                case 2:
                    message.actuarialFirmType = 2;
                    break;
                case 'ACTUARIAL_FIRM_TYPE_OPTUMAS':
                case 3:
                    message.actuarialFirmType = 3;
                    break;
                case 'ACTUARIAL_FIRM_TYPE_GUIDEHOUSE':
                case 4:
                    message.actuarialFirmType = 4;
                    break;
                case 'ACTUARIAL_FIRM_TYPE_DELOITTE':
                case 5:
                    message.actuarialFirmType = 5;
                    break;
                case 'ACTUARIAL_FIRM_TYPE_STATE_IN_HOUSE':
                case 6:
                    message.actuarialFirmType = 6;
                    break;
                case 'ACTUARIAL_FIRM_TYPE_OTHER':
                case 7:
                    message.actuarialFirmType = 7;
                    break;
            }
            if (object.actuarialFirmOther != null)
                message.actuarialFirmOther = String(object.actuarialFirmOther);
            return message;
        };

        /**
         * Creates a plain object from an ActuaryContact message. Also converts values to other types if specified.
         * @function toObject
         * @memberof mcreviewproto.ActuaryContact
         * @static
         * @param {mcreviewproto.ActuaryContact} message ActuaryContact
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ActuaryContact.toObject = function toObject(message, options) {
            if (!options) options = {};
            let object = {};
            if (message.contact != null && message.hasOwnProperty('contact')) {
                object.contact = $root.mcreviewproto.Contact.toObject(
                    message.contact,
                    options
                );
                if (options.oneofs) object._contact = 'contact';
            }
            if (
                message.actuarialFirmType != null &&
                message.hasOwnProperty('actuarialFirmType')
            ) {
                object.actuarialFirmType =
                    options.enums === String
                        ? $root.mcreviewproto.ActuarialFirmType[
                              message.actuarialFirmType
                          ] === undefined
                            ? message.actuarialFirmType
                            : $root.mcreviewproto.ActuarialFirmType[
                                  message.actuarialFirmType
                              ]
                        : message.actuarialFirmType;
                if (options.oneofs)
                    object._actuarialFirmType = 'actuarialFirmType';
            }
            if (
                message.actuarialFirmOther != null &&
                message.hasOwnProperty('actuarialFirmOther')
            ) {
                object.actuarialFirmOther = message.actuarialFirmOther;
                if (options.oneofs)
                    object._actuarialFirmOther = 'actuarialFirmOther';
            }
            return object;
        };

        /**
         * Converts this ActuaryContact to JSON.
         * @function toJSON
         * @memberof mcreviewproto.ActuaryContact
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ActuaryContact.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(
                this,
                $protobuf.util.toJSONOptions
            );
        };

        /**
         * Gets the default type url for ActuaryContact
         * @function getTypeUrl
         * @memberof mcreviewproto.ActuaryContact
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ActuaryContact.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = 'type.googleapis.com';
            }
            return typeUrlPrefix + '/mcreviewproto.ActuaryContact';
        };

        return ActuaryContact;
    })();

    mcreviewproto.Document = (function () {
        /**
         * Properties of a Document.
         * @memberof mcreviewproto
         * @interface IDocument
         * @property {string|null} [name] Document name
         * @property {string|null} [s3Url] Document s3Url
         * @property {Array.<mcreviewproto.DocumentCategory>|null} [documentCategories] Document documentCategories
         * @property {string|null} [sha256] Document sha256
         */

        /**
         * Constructs a new Document.
         * @memberof mcreviewproto
         * @classdesc Represents a Document.
         * @implements IDocument
         * @constructor
         * @param {mcreviewproto.IDocument=} [properties] Properties to set
         */
        function Document(properties) {
            this.documentCategories = [];
            if (properties)
                for (
                    let keys = Object.keys(properties), i = 0;
                    i < keys.length;
                    ++i
                )
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Document name.
         * @member {string|null|undefined} name
         * @memberof mcreviewproto.Document
         * @instance
         */
        Document.prototype.name = null;

        /**
         * Document s3Url.
         * @member {string|null|undefined} s3Url
         * @memberof mcreviewproto.Document
         * @instance
         */
        Document.prototype.s3Url = null;

        /**
         * Document documentCategories.
         * @member {Array.<mcreviewproto.DocumentCategory>} documentCategories
         * @memberof mcreviewproto.Document
         * @instance
         */
        Document.prototype.documentCategories = $util.emptyArray;

        /**
         * Document sha256.
         * @member {string|null|undefined} sha256
         * @memberof mcreviewproto.Document
         * @instance
         */
        Document.prototype.sha256 = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Document _name.
         * @member {"name"|undefined} _name
         * @memberof mcreviewproto.Document
         * @instance
         */
        Object.defineProperty(Document.prototype, '_name', {
            get: $util.oneOfGetter(($oneOfFields = ['name'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Document _s3Url.
         * @member {"s3Url"|undefined} _s3Url
         * @memberof mcreviewproto.Document
         * @instance
         */
        Object.defineProperty(Document.prototype, '_s3Url', {
            get: $util.oneOfGetter(($oneOfFields = ['s3Url'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Document _sha256.
         * @member {"sha256"|undefined} _sha256
         * @memberof mcreviewproto.Document
         * @instance
         */
        Object.defineProperty(Document.prototype, '_sha256', {
            get: $util.oneOfGetter(($oneOfFields = ['sha256'])),
            set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new Document instance using the specified properties.
         * @function create
         * @memberof mcreviewproto.Document
         * @static
         * @param {mcreviewproto.IDocument=} [properties] Properties to set
         * @returns {mcreviewproto.Document} Document instance
         */
        Document.create = function create(properties) {
            return new Document(properties);
        };

        /**
         * Encodes the specified Document message. Does not implicitly {@link mcreviewproto.Document.verify|verify} messages.
         * @function encode
         * @memberof mcreviewproto.Document
         * @static
         * @param {mcreviewproto.IDocument} message Document message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Document.encode = function encode(message, writer) {
            if (!writer) writer = $Writer.create();
            if (
                message.name != null &&
                Object.hasOwnProperty.call(message, 'name')
            )
                writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.name);
            if (
                message.s3Url != null &&
                Object.hasOwnProperty.call(message, 's3Url')
            )
                writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.s3Url);
            if (
                message.documentCategories != null &&
                message.documentCategories.length
            ) {
                writer.uint32(/* id 3, wireType 2 =*/ 26).fork();
                for (let i = 0; i < message.documentCategories.length; ++i)
                    writer.int32(message.documentCategories[i]);
                writer.ldelim();
            }
            if (
                message.sha256 != null &&
                Object.hasOwnProperty.call(message, 'sha256')
            )
                writer
                    .uint32(/* id 4, wireType 2 =*/ 34)
                    .string(message.sha256);
            return writer;
        };

        /**
         * Encodes the specified Document message, length delimited. Does not implicitly {@link mcreviewproto.Document.verify|verify} messages.
         * @function encodeDelimited
         * @memberof mcreviewproto.Document
         * @static
         * @param {mcreviewproto.IDocument} message Document message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Document.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Document message from the specified reader or buffer.
         * @function decode
         * @memberof mcreviewproto.Document
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {mcreviewproto.Document} Document
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Document.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length,
                message = new $root.mcreviewproto.Document();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1: {
                        message.name = reader.string();
                        break;
                    }
                    case 2: {
                        message.s3Url = reader.string();
                        break;
                    }
                    case 3: {
                        if (
                            !(
                                message.documentCategories &&
                                message.documentCategories.length
                            )
                        )
                            message.documentCategories = [];
                        if ((tag & 7) === 2) {
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.documentCategories.push(reader.int32());
                        } else message.documentCategories.push(reader.int32());
                        break;
                    }
                    case 4: {
                        message.sha256 = reader.string();
                        break;
                    }
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        };

        /**
         * Decodes a Document message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof mcreviewproto.Document
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {mcreviewproto.Document} Document
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Document.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader)) reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Document message.
         * @function verify
         * @memberof mcreviewproto.Document
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Document.verify = function verify(message) {
            if (typeof message !== 'object' || message === null)
                return 'object expected';
            let properties = {};
            if (message.name != null && message.hasOwnProperty('name')) {
                properties._name = 1;
                if (!$util.isString(message.name))
                    return 'name: string expected';
            }
            if (message.s3Url != null && message.hasOwnProperty('s3Url')) {
                properties._s3Url = 1;
                if (!$util.isString(message.s3Url))
                    return 's3Url: string expected';
            }
            if (
                message.documentCategories != null &&
                message.hasOwnProperty('documentCategories')
            ) {
                if (!Array.isArray(message.documentCategories))
                    return 'documentCategories: array expected';
                for (let i = 0; i < message.documentCategories.length; ++i)
                    switch (message.documentCategories[i]) {
                        default:
                            return 'documentCategories: enum value[] expected';
                        case 0:
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                            break;
                    }
            }
            if (message.sha256 != null && message.hasOwnProperty('sha256')) {
                properties._sha256 = 1;
                if (!$util.isString(message.sha256))
                    return 'sha256: string expected';
            }
            return null;
        };

        /**
         * Creates a Document message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof mcreviewproto.Document
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {mcreviewproto.Document} Document
         */
        Document.fromObject = function fromObject(object) {
            if (object instanceof $root.mcreviewproto.Document) return object;
            let message = new $root.mcreviewproto.Document();
            if (object.name != null) message.name = String(object.name);
            if (object.s3Url != null) message.s3Url = String(object.s3Url);
            if (object.documentCategories) {
                if (!Array.isArray(object.documentCategories))
                    throw TypeError(
                        '.mcreviewproto.Document.documentCategories: array expected'
                    );
                message.documentCategories = [];
                for (let i = 0; i < object.documentCategories.length; ++i)
                    switch (object.documentCategories[i]) {
                        default:
                            if (
                                typeof object.documentCategories[i] === 'number'
                            ) {
                                message.documentCategories[i] =
                                    object.documentCategories[i];
                                break;
                            }
                        case 'DOCUMENT_CATEGORY_UNSPECIFIED':
                        case 0:
                            message.documentCategories[i] = 0;
                            break;
                        case 'DOCUMENT_CATEGORY_CONTRACT':
                        case 1:
                            message.documentCategories[i] = 1;
                            break;
                        case 'DOCUMENT_CATEGORY_RATES':
                        case 2:
                            message.documentCategories[i] = 2;
                            break;
                        case 'DOCUMENT_CATEGORY_CONTRACT_RELATED':
                        case 3:
                            message.documentCategories[i] = 3;
                            break;
                        case 'DOCUMENT_CATEGORY_RATES_RELATED':
                        case 4:
                            message.documentCategories[i] = 4;
                            break;
                    }
            }
            if (object.sha256 != null) message.sha256 = String(object.sha256);
            return message;
        };

        /**
         * Creates a plain object from a Document message. Also converts values to other types if specified.
         * @function toObject
         * @memberof mcreviewproto.Document
         * @static
         * @param {mcreviewproto.Document} message Document
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Document.toObject = function toObject(message, options) {
            if (!options) options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.documentCategories = [];
            if (message.name != null && message.hasOwnProperty('name')) {
                object.name = message.name;
                if (options.oneofs) object._name = 'name';
            }
            if (message.s3Url != null && message.hasOwnProperty('s3Url')) {
                object.s3Url = message.s3Url;
                if (options.oneofs) object._s3Url = 's3Url';
            }
            if (
                message.documentCategories &&
                message.documentCategories.length
            ) {
                object.documentCategories = [];
                for (let j = 0; j < message.documentCategories.length; ++j)
                    object.documentCategories[j] =
                        options.enums === String
                            ? $root.mcreviewproto.DocumentCategory[
                                  message.documentCategories[j]
                              ] === undefined
                                ? message.documentCategories[j]
                                : $root.mcreviewproto.DocumentCategory[
                                      message.documentCategories[j]
                                  ]
                            : message.documentCategories[j];
            }
            if (message.sha256 != null && message.hasOwnProperty('sha256')) {
                object.sha256 = message.sha256;
                if (options.oneofs) object._sha256 = 'sha256';
            }
            return object;
        };

        /**
         * Converts this Document to JSON.
         * @function toJSON
         * @memberof mcreviewproto.Document
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Document.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(
                this,
                $protobuf.util.toJSONOptions
            );
        };

        /**
         * Gets the default type url for Document
         * @function getTypeUrl
         * @memberof mcreviewproto.Document
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Document.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = 'type.googleapis.com';
            }
            return typeUrlPrefix + '/mcreviewproto.Document';
        };

        return Document;
    })();

    /**
     * StateCode enum.
     * @name mcreviewproto.StateCode
     * @enum {number}
     * @property {number} STATE_CODE_UNSPECIFIED=0 STATE_CODE_UNSPECIFIED value
     * @property {number} STATE_CODE_AS=1 STATE_CODE_AS value
     * @property {number} STATE_CODE_AK=2 STATE_CODE_AK value
     * @property {number} STATE_CODE_AL=3 STATE_CODE_AL value
     * @property {number} STATE_CODE_AR=4 STATE_CODE_AR value
     * @property {number} STATE_CODE_AZ=5 STATE_CODE_AZ value
     * @property {number} STATE_CODE_CA=6 STATE_CODE_CA value
     * @property {number} STATE_CODE_CO=7 STATE_CODE_CO value
     * @property {number} STATE_CODE_CT=8 STATE_CODE_CT value
     * @property {number} STATE_CODE_DC=9 STATE_CODE_DC value
     * @property {number} STATE_CODE_DE=10 STATE_CODE_DE value
     * @property {number} STATE_CODE_FL=11 STATE_CODE_FL value
     * @property {number} STATE_CODE_GA=12 STATE_CODE_GA value
     * @property {number} STATE_CODE_HI=13 STATE_CODE_HI value
     * @property {number} STATE_CODE_IA=14 STATE_CODE_IA value
     * @property {number} STATE_CODE_ID=15 STATE_CODE_ID value
     * @property {number} STATE_CODE_IL=16 STATE_CODE_IL value
     * @property {number} STATE_CODE_IN=17 STATE_CODE_IN value
     * @property {number} STATE_CODE_KS=18 STATE_CODE_KS value
     * @property {number} STATE_CODE_LA=19 STATE_CODE_LA value
     * @property {number} STATE_CODE_MA=20 STATE_CODE_MA value
     * @property {number} STATE_CODE_MD=21 STATE_CODE_MD value
     * @property {number} STATE_CODE_ME=22 STATE_CODE_ME value
     * @property {number} STATE_CODE_MI=23 STATE_CODE_MI value
     * @property {number} STATE_CODE_MN=24 STATE_CODE_MN value
     * @property {number} STATE_CODE_MO=25 STATE_CODE_MO value
     * @property {number} STATE_CODE_MS=26 STATE_CODE_MS value
     * @property {number} STATE_CODE_MT=27 STATE_CODE_MT value
     * @property {number} STATE_CODE_NC=28 STATE_CODE_NC value
     * @property {number} STATE_CODE_ND=29 STATE_CODE_ND value
     * @property {number} STATE_CODE_NE=30 STATE_CODE_NE value
     * @property {number} STATE_CODE_NH=31 STATE_CODE_NH value
     * @property {number} STATE_CODE_NJ=32 STATE_CODE_NJ value
     * @property {number} STATE_CODE_NM=33 STATE_CODE_NM value
     * @property {number} STATE_CODE_NV=34 STATE_CODE_NV value
     * @property {number} STATE_CODE_NY=35 STATE_CODE_NY value
     * @property {number} STATE_CODE_OH=36 STATE_CODE_OH value
     * @property {number} STATE_CODE_OK=37 STATE_CODE_OK value
     * @property {number} STATE_CODE_OR=38 STATE_CODE_OR value
     * @property {number} STATE_CODE_PA=39 STATE_CODE_PA value
     * @property {number} STATE_CODE_PR=40 STATE_CODE_PR value
     * @property {number} STATE_CODE_RI=41 STATE_CODE_RI value
     * @property {number} STATE_CODE_SC=42 STATE_CODE_SC value
     * @property {number} STATE_CODE_SD=43 STATE_CODE_SD value
     * @property {number} STATE_CODE_TN=44 STATE_CODE_TN value
     * @property {number} STATE_CODE_TX=45 STATE_CODE_TX value
     * @property {number} STATE_CODE_UT=46 STATE_CODE_UT value
     * @property {number} STATE_CODE_VA=47 STATE_CODE_VA value
     * @property {number} STATE_CODE_VT=48 STATE_CODE_VT value
     * @property {number} STATE_CODE_WA=49 STATE_CODE_WA value
     * @property {number} STATE_CODE_WI=50 STATE_CODE_WI value
     * @property {number} STATE_CODE_WV=51 STATE_CODE_WV value
     * @property {number} STATE_CODE_WY=52 STATE_CODE_WY value
     * @property {number} STATE_CODE_KY=53 STATE_CODE_KY value
     */
    mcreviewproto.StateCode = (function () {
        const valuesById = {},
            values = Object.create(valuesById);
        values[(valuesById[0] = 'STATE_CODE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'STATE_CODE_AS')] = 1;
        values[(valuesById[2] = 'STATE_CODE_AK')] = 2;
        values[(valuesById[3] = 'STATE_CODE_AL')] = 3;
        values[(valuesById[4] = 'STATE_CODE_AR')] = 4;
        values[(valuesById[5] = 'STATE_CODE_AZ')] = 5;
        values[(valuesById[6] = 'STATE_CODE_CA')] = 6;
        values[(valuesById[7] = 'STATE_CODE_CO')] = 7;
        values[(valuesById[8] = 'STATE_CODE_CT')] = 8;
        values[(valuesById[9] = 'STATE_CODE_DC')] = 9;
        values[(valuesById[10] = 'STATE_CODE_DE')] = 10;
        values[(valuesById[11] = 'STATE_CODE_FL')] = 11;
        values[(valuesById[12] = 'STATE_CODE_GA')] = 12;
        values[(valuesById[13] = 'STATE_CODE_HI')] = 13;
        values[(valuesById[14] = 'STATE_CODE_IA')] = 14;
        values[(valuesById[15] = 'STATE_CODE_ID')] = 15;
        values[(valuesById[16] = 'STATE_CODE_IL')] = 16;
        values[(valuesById[17] = 'STATE_CODE_IN')] = 17;
        values[(valuesById[18] = 'STATE_CODE_KS')] = 18;
        values[(valuesById[19] = 'STATE_CODE_LA')] = 19;
        values[(valuesById[20] = 'STATE_CODE_MA')] = 20;
        values[(valuesById[21] = 'STATE_CODE_MD')] = 21;
        values[(valuesById[22] = 'STATE_CODE_ME')] = 22;
        values[(valuesById[23] = 'STATE_CODE_MI')] = 23;
        values[(valuesById[24] = 'STATE_CODE_MN')] = 24;
        values[(valuesById[25] = 'STATE_CODE_MO')] = 25;
        values[(valuesById[26] = 'STATE_CODE_MS')] = 26;
        values[(valuesById[27] = 'STATE_CODE_MT')] = 27;
        values[(valuesById[28] = 'STATE_CODE_NC')] = 28;
        values[(valuesById[29] = 'STATE_CODE_ND')] = 29;
        values[(valuesById[30] = 'STATE_CODE_NE')] = 30;
        values[(valuesById[31] = 'STATE_CODE_NH')] = 31;
        values[(valuesById[32] = 'STATE_CODE_NJ')] = 32;
        values[(valuesById[33] = 'STATE_CODE_NM')] = 33;
        values[(valuesById[34] = 'STATE_CODE_NV')] = 34;
        values[(valuesById[35] = 'STATE_CODE_NY')] = 35;
        values[(valuesById[36] = 'STATE_CODE_OH')] = 36;
        values[(valuesById[37] = 'STATE_CODE_OK')] = 37;
        values[(valuesById[38] = 'STATE_CODE_OR')] = 38;
        values[(valuesById[39] = 'STATE_CODE_PA')] = 39;
        values[(valuesById[40] = 'STATE_CODE_PR')] = 40;
        values[(valuesById[41] = 'STATE_CODE_RI')] = 41;
        values[(valuesById[42] = 'STATE_CODE_SC')] = 42;
        values[(valuesById[43] = 'STATE_CODE_SD')] = 43;
        values[(valuesById[44] = 'STATE_CODE_TN')] = 44;
        values[(valuesById[45] = 'STATE_CODE_TX')] = 45;
        values[(valuesById[46] = 'STATE_CODE_UT')] = 46;
        values[(valuesById[47] = 'STATE_CODE_VA')] = 47;
        values[(valuesById[48] = 'STATE_CODE_VT')] = 48;
        values[(valuesById[49] = 'STATE_CODE_WA')] = 49;
        values[(valuesById[50] = 'STATE_CODE_WI')] = 50;
        values[(valuesById[51] = 'STATE_CODE_WV')] = 51;
        values[(valuesById[52] = 'STATE_CODE_WY')] = 52;
        values[(valuesById[53] = 'STATE_CODE_KY')] = 53;
        return values;
    })();

    return mcreviewproto;
})());

export const google = ($root.google = (() => {
    /**
     * Namespace google.
     * @exports google
     * @namespace
     */
    const google = {};

    google.protobuf = (function () {
        /**
         * Namespace protobuf.
         * @memberof google
         * @namespace
         */
        const protobuf = {};

        protobuf.Timestamp = (function () {
            /**
             * Properties of a Timestamp.
             * @memberof google.protobuf
             * @interface ITimestamp
             * @property {number|Long|null} [seconds] Timestamp seconds
             * @property {number|null} [nanos] Timestamp nanos
             */

            /**
             * Constructs a new Timestamp.
             * @memberof google.protobuf
             * @classdesc Represents a Timestamp.
             * @implements ITimestamp
             * @constructor
             * @param {google.protobuf.ITimestamp=} [properties] Properties to set
             */
            function Timestamp(properties) {
                if (properties)
                    for (
                        let keys = Object.keys(properties), i = 0;
                        i < keys.length;
                        ++i
                    )
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Timestamp seconds.
             * @member {number|Long} seconds
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.seconds = $util.Long
                ? $util.Long.fromBits(0, 0, false)
                : 0;

            /**
             * Timestamp nanos.
             * @member {number} nanos
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.nanos = 0;

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @function create
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp=} [properties] Properties to set
             * @returns {google.protobuf.Timestamp} Timestamp instance
             */
            Timestamp.create = function create(properties) {
                return new Timestamp(properties);
            };

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encode = function encode(message, writer) {
                if (!writer) writer = $Writer.create();
                if (
                    message.seconds != null &&
                    Object.hasOwnProperty.call(message, 'seconds')
                )
                    writer
                        .uint32(/* id 1, wireType 0 =*/ 8)
                        .int64(message.seconds);
                if (
                    message.nanos != null &&
                    Object.hasOwnProperty.call(message, 'nanos')
                )
                    writer
                        .uint32(/* id 2, wireType 0 =*/ 16)
                        .int32(message.nanos);
                return writer;
            };

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encodeDelimited = function encodeDelimited(
                message,
                writer
            ) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @function decode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.protobuf.Timestamp} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end =
                        length === undefined ? reader.len : reader.pos + length,
                    message = new $root.google.protobuf.Timestamp();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1: {
                            message.seconds = reader.int64();
                            break;
                        }
                        case 2: {
                            message.nanos = reader.int32();
                            break;
                        }
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.protobuf.Timestamp} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Timestamp message.
             * @function verify
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Timestamp.verify = function verify(message) {
                if (typeof message !== 'object' || message === null)
                    return 'object expected';
                if (
                    message.seconds != null &&
                    message.hasOwnProperty('seconds')
                )
                    if (
                        !$util.isInteger(message.seconds) &&
                        !(
                            message.seconds &&
                            $util.isInteger(message.seconds.low) &&
                            $util.isInteger(message.seconds.high)
                        )
                    )
                        return 'seconds: integer|Long expected';
                if (message.nanos != null && message.hasOwnProperty('nanos'))
                    if (!$util.isInteger(message.nanos))
                        return 'nanos: integer expected';
                return null;
            };

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.protobuf.Timestamp} Timestamp
             */
            Timestamp.fromObject = function fromObject(object) {
                if (object instanceof $root.google.protobuf.Timestamp)
                    return object;
                let message = new $root.google.protobuf.Timestamp();
                if (object.seconds != null)
                    if ($util.Long)
                        (message.seconds = $util.Long.fromValue(
                            object.seconds
                        )).unsigned = false;
                    else if (typeof object.seconds === 'string')
                        message.seconds = parseInt(object.seconds, 10);
                    else if (typeof object.seconds === 'number')
                        message.seconds = object.seconds;
                    else if (typeof object.seconds === 'object')
                        message.seconds = new $util.LongBits(
                            object.seconds.low >>> 0,
                            object.seconds.high >>> 0
                        ).toNumber();
                if (object.nanos != null) message.nanos = object.nanos | 0;
                return message;
            };

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.Timestamp} message Timestamp
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Timestamp.toObject = function toObject(message, options) {
                if (!options) options = {};
                let object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        let long = new $util.Long(0, 0, false);
                        object.seconds =
                            options.longs === String
                                ? long.toString()
                                : options.longs === Number
                                  ? long.toNumber()
                                  : long;
                    } else object.seconds = options.longs === String ? '0' : 0;
                    object.nanos = 0;
                }
                if (
                    message.seconds != null &&
                    message.hasOwnProperty('seconds')
                )
                    if (typeof message.seconds === 'number')
                        object.seconds =
                            options.longs === String
                                ? String(message.seconds)
                                : message.seconds;
                    else
                        object.seconds =
                            options.longs === String
                                ? $util.Long.prototype.toString.call(
                                      message.seconds
                                  )
                                : options.longs === Number
                                  ? new $util.LongBits(
                                        message.seconds.low >>> 0,
                                        message.seconds.high >>> 0
                                    ).toNumber()
                                  : message.seconds;
                if (message.nanos != null && message.hasOwnProperty('nanos'))
                    object.nanos = message.nanos;
                return object;
            };

            /**
             * Converts this Timestamp to JSON.
             * @function toJSON
             * @memberof google.protobuf.Timestamp
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Timestamp.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(
                    this,
                    $protobuf.util.toJSONOptions
                );
            };

            /**
             * Gets the default type url for Timestamp
             * @function getTypeUrl
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Timestamp.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = 'type.googleapis.com';
                }
                return typeUrlPrefix + '/google.protobuf.Timestamp';
            };

            return Timestamp;
        })();

        return protobuf;
    })();

    return google;
})());

export { $root as default };
