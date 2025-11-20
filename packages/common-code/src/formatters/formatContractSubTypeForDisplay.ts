export const formatContractSubTypeForDisplay = (subType: string): string => {

  switch (subType) {
    case 'HEALTH_PLAN':
      return 'Health plan'
    case 'EQRO':
      return 'EQRO'
    default:
      throw new Error(`${subType} is not a recognized contract submission type.`)
  }
}