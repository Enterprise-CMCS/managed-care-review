/* eslint-disable @typescript-eslint/no-explicit-any */
import { HealthPlanRevisionTable, PrismaClient } from '@prisma/client'
import {
    base64ToDomain,
    protoToBase64,
} from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
// import { DataExportType } from '../domain-models/DataExport'

const convertRevisions = (revisions: HealthPlanRevisionTable[]) => {
    return revisions.map((revision) => {
        return {
            ...revision,
            formDataProto: base64ToDomain(
                protoToBase64(revision.formDataProto)
            ),
        }
    })
}

export async function generateReports(
    client: PrismaClient
): Promise<any | undefined> {
    const result = await client.healthPlanPackageTable.findMany({
        include: {
            revisions: true,
        },
    })
    const z = result.map((pkg) => {
        return {
            ...pkg,
            revisions: convertRevisions(pkg.revisions),
        }
    })
    console.log('z: ', z)
    // const x = base64ToDomain(
    //     protoToBase64(result[0].revisions[0].formDataProto)
    // )
    // let y
    // if (x instanceof Error) {
    //     y = x
    //     console.log(y)
    // } else {
    //     console.log('x: ', x.documents[0].documentCategories)
    // }
    return result
}
