import { PrismaClient } from '@prisma/client'
import { DataExportType } from '../domain-models/DataExport'

export async function dataExport(
    client: PrismaClient
): Promise<DataExportType | undefined> {
    const result = await client.state.findFirst()
    if (result === undefined) {
        return undefined
    }
    console.log('JJ Result: ', result)
    return {
        name: result?.stateCode,
    }
}
