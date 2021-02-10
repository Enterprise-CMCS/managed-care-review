import { Result, ok, err } from "neverthrow";
import { User, isUser } from "../../app-web/src/common-code/domain-models";

export async function userFromLocalAuthProvider(
    authProvider: string
): Promise<Result<User, Error>> {
    // TODO: do another check to ensure that LOCAL_LOGIN has not been set in an AWS environment
    try {
        const localUser = JSON.parse(authProvider);
        if (isUser(localUser)) {
            return ok(localUser);
        }
        return err(
            new Error(
                "The local user sent in cognito-authorization-provider was not a User"
            )
        );
    } catch (e) {
        return err(e);
    }
}
