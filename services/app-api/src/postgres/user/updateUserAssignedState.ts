import { convertPrismaErrorToStoreError, StoreError } from '../storeError'
import { PrismaClient } from '@prisma/client'
import { CMSUserType, StateCodeType } from '../../domain-models'

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
                    states: {
                        set: statesWithCode,
                    },
                },
                include: {
                    states: true,
                },
            }),
        ])

        const updateResult = combinedResults[1]

        if (updateResult.role !== 'CMS_USER') {
            return {
                code: 'UNEXPECTED_EXCEPTION',
                message: 'Updated user was not a CMS User!',
            }
        }

        return {
            id: updateResult.id,
            role: 'CMS_USER',
            email: updateResult.email,
            givenName: updateResult.givenName,
            familyName: updateResult.familyName,
            stateAssignments: updateResult.states,
        }
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
