import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from '../storeError'
import { StateCodeType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { PrismaClient } from '@prisma/client'
import { CMSUserType } from '../../domain-models'
import { domainUserFromPrismaUser } from './prismaDomainUser'

export async function updateUserAssignedState(
    client: PrismaClient,
    userID: string,
    stateCodes: StateCodeType[]
): Promise<CMSUserType | StoreError> {
    try {
        const statesWithCode = stateCodes.map((s) => {
            return { stateCode: s }
        })

        // In a transaction we check to make sure that the user exists and is a CMS user, then
        // perform the update
        const combinedResults = await client.$transaction([
            client.user.findFirstOrThrow({
                where: {
                    id: userID,
                    role: 'CMS_USER',
                },
            }),
            client.user.update({
                where: {
                    id: userID,
                },
                data: {
                    stateAssignments: {
                        set: statesWithCode,
                    },
                },
                include: {
                    stateAssignments: {
                        orderBy: {
                            stateCode: 'asc',
                        },
                    },
                },
            }),
        ])

        const updateResult = combinedResults[1]

        const domainUser = domainUserFromPrismaUser(updateResult)

        if (isStoreError(domainUser)) {
            return domainUser
        }

        if (domainUser.role !== 'CMS_USER') {
            return {
                code: 'UNEXPECTED_EXCEPTION',
                message: 'Updated user was not a CMS User!',
            }
        }

        return domainUser
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
