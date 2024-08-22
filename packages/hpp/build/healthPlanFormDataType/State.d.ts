type StateType = {
    code: string;
    name: string;
    programs: ProgramArgType[];
};
interface ProgramArgType {
    id: string;
    name: string;
    fullName: string;
    isRateProgram: boolean;
}
export type { StateType, ProgramArgType };
