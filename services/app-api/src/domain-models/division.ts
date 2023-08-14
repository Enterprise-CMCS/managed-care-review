import type { DivisionType } from './DivisionType'

function isValidCmsDivison(division: string): division is DivisionType {
    return ['DMCO', 'DMCP', 'OACT'].includes(division)
}

export { isValidCmsDivison }
