import statePrograms from '../data/statePrograms.json';
export const findStatePrograms = (stateCode) => {
    const programs = statePrograms.states.find((state) => state.code === stateCode)?.programs;
    if (!programs) {
        return [];
    }
    return programs;
};
//# sourceMappingURL=findStatePrograms.js.map