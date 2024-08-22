import { UnlockedHealthPlanFormDataType, LockedHealthPlanFormDataType, ProgramArgType } from '../healthPlanFormDataType';
type State = {
    code: string;
    name: string;
    programs: ProgramArgType[];
};
export declare function mockMNState(): State;
declare function newHealthPlanFormData(): UnlockedHealthPlanFormDataType;
declare function basicHealthPlanFormData(): UnlockedHealthPlanFormDataType;
declare function contractOnly(): UnlockedHealthPlanFormDataType;
declare function contractAmendedOnly(): UnlockedHealthPlanFormDataType;
declare function unlockedWithContacts(): UnlockedHealthPlanFormDataType;
declare function unlockedWithDocuments(): UnlockedHealthPlanFormDataType;
declare function unlockedWithFullRates(): UnlockedHealthPlanFormDataType;
declare function unlockedWithFullContracts(): UnlockedHealthPlanFormDataType;
declare function unlockedWithALittleBitOfEverything(): UnlockedHealthPlanFormDataType;
declare function basicLockedHealthPlanFormData(): LockedHealthPlanFormDataType;
export { newHealthPlanFormData, basicHealthPlanFormData, contractOnly, contractAmendedOnly, unlockedWithContacts, unlockedWithDocuments, unlockedWithFullRates, unlockedWithFullContracts, unlockedWithALittleBitOfEverything, basicLockedHealthPlanFormData, };
