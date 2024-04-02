import type { GenericDocument } from '../gen/gqlServer'

// Format apollo server GenericDocument lists into prisma document lists
const formatDocsForPrisma = (docs: GenericDocument[]) => {
    return docs.map((d, idx) => {
        delete d['dateAdded']
        return {
            position: idx,
            ...d,
        }
    })
}

export { formatDocsForPrisma }
