import { HealthPlanFormDataType } from '../../healthPlanFormDataType';
declare function domainToBase64(submission: HealthPlanFormDataType): string;
declare function protoToBase64(input: Uint8Array): string;
declare function base64ToDomain(input: string): HealthPlanFormDataType | Error;
export { domainToBase64, protoToBase64, base64ToDomain };
