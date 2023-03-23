import { DivisionType } from './DivisionType'

function isValidCmsDivison(division: DivisionType): division is DivisionType {
    return ['DMCO', 'DMCP', 'OACT'].includes(division)
}

export { isValidCmsDivison }
