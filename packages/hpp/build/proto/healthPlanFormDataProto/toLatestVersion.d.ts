import { mcreviewproto } from '../../gen/healthPlanFormDataProto';
declare const CURRENT_PROTO_VERSION = 4;
declare const toLatestProtoVersion: (proto: mcreviewproto.HealthPlanFormData) => mcreviewproto.HealthPlanFormData;
export { toLatestProtoVersion, CURRENT_PROTO_VERSION };
