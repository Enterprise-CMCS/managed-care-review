import { mcreviewproto } from '../../gen/healthPlanFormDataProto';
import { UnlockedHealthPlanFormDataType, LockedHealthPlanFormDataType, HealthPlanFormDataType } from '../../healthPlanFormDataType';
/**
 * Recursively replaces all nulls with undefineds.
 * Because the generated proto code allows null | undefined for everything, we simplify our lives
 * by converting all the nulls to undefineds. The type below makes the type checker happy.
 * Adapted from https://github.com/apollographql/apollo-client/issues/2412
 */
type RecursivelyReplaceNullWithUndefined<T> = T extends null ? undefined : T extends Date ? T : {
    [K in keyof T]: T[K] extends (infer U)[] ? RecursivelyReplaceNullWithUndefined<U>[] : RecursivelyReplaceNullWithUndefined<T[K]>;
};
export declare function replaceNullsWithUndefineds<T extends object>(obj: T): RecursivelyReplaceNullWithUndefined<T>;
declare function decodeOrError(buff: Uint8Array): mcreviewproto.HealthPlanFormData | Error;
type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
};
type PartialHealthPlanFormData = RecursivePartial<UnlockedHealthPlanFormDataType> & RecursivePartial<LockedHealthPlanFormDataType>;
declare function parsePartialHPFD(status: string | undefined | null, maybeUnlockedFormData: PartialHealthPlanFormData): HealthPlanFormDataType | Error;
declare const toDomain: (buff: Uint8Array) => UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType | Error;
export { toDomain, decodeOrError, parsePartialHPFD };
export type { PartialHealthPlanFormData };
