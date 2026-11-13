import ebContractors from './ebContractors.json'

interface EBContractorType {
    id: string
    name: string
    isDeprecated: boolean
}

const typedEBContractors: EBContractorType[] = ebContractors

export { typedEBContractors }
export type { EBContractorType }
