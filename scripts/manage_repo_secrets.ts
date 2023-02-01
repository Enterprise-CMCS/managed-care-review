// this script requires a GitHub personal access token with 'read:public_key, repo' scope set as an env var called GITHUB_TOKEN

import { Octokit } from '@octokit/action'
import { RequestError } from "@octokit/request-error"
import sodium from 'libsodium-wrappers'
import yargs from 'yargs'

const owner = 'CMSgov'
const repo = 'managed-care-review'
const ownerAndRepo = `${owner}/${repo}`

/**
 * throws an error if secret name is not valid per https://docs.github.com/en/actions/security-guides/encrypted-secrets#naming-your-secrets
 * */
const validateSecretName = (name: string): Error | void => {
  const nameRegex = new RegExp("^(?![0-9]|GITHUB_)[a-zA-Z0-9_]*$")
  if (!name.match(nameRegex)) {
    return new Error(`The secret name "${name}" violates GitHub's constraints:
    - Names can only contain alphanumeric characters (not case-sensitive) or underscores
    - Names must not start with the GITHUB_ prefix
    - Names must not start with a number`)
  }
}

/**
* adapted from https://docs.github.com/en/rest/actions/secrets?apiVersion=2022-11-28#create-or-update-a-repository-secret
*/
const encryptSecret = async (key: string, value: string): Promise<string> => {
  return new Promise(resolve => {
    sodium.ready.then(async () => {
      // convert secret & base64 key to Uint8Array.
      const binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL)
      const binsec = sodium.from_string(value)

      // encrypt the secret using libsodium
      const encBytes = sodium.crypto_box_seal(binsec, binkey)

      // convert encrypted uint8array to base64
      const base64Key = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL)
      resolve(base64Key)
    })
  })
}

const setActionsRepoSecret = async (name: string, value: string): Promise<void> => {
  // get the Actions repo public key
  let publicKeyResponse
  try {
    publicKeyResponse = await client.actions.getRepoPublicKey({
      owner,
      repo
    })
  } catch (e: any) {
    console.error(`Error getting Actions public key for repo ${ownerAndRepo}: ${e.message}`)
    process.exit(1)
  }

  const key = publicKeyResponse.data.key
  const keyId = publicKeyResponse.data.key_id
  const base64Key = await encryptSecret(key, value)

  // set the Actions repo secret
  try {
    await client.rest.actions.createOrUpdateRepoSecret({
      owner,
      repo,
      secret_name: name,
      encrypted_value: base64Key,
      key_id: keyId
    });
    console.log(`Actions repo secret ${name} was created/updated successfully for ${ownerAndRepo}`)
  } catch (e: any) {
    console.error(`Error creating/updating Actions repo secret ${name} for ${ownerAndRepo}: ${e.message}`)
    process.exit(1)
  }
}

const setDependabotRepoSecret = async (name: string, value: string): Promise<void> => {
  // get the Dependabot repo public key
  let publicKeyResponse
  try {
    publicKeyResponse = await client.rest.dependabot.getRepoPublicKey({
      owner,
      repo
    })
  } catch (e: any) {
    console.error(`Error getting Dependabot public key for repo ${ownerAndRepo}: ${e.message}`)
    process.exit(1)
  }

  const key = publicKeyResponse.data.key
  const keyId = publicKeyResponse.data.key_id
  const base64Key = await encryptSecret(key, value)

  // set the Dependabot repo secret
  try {
    await client.rest.dependabot.createOrUpdateRepoSecret({
      owner,
      repo,
      secret_name: name,
      encrypted_value: base64Key,
      key_id: keyId
    });
    console.log(`Dependabot repo secret ${name} was created/updated successfully for ${ownerAndRepo}`)
  } catch (e: any) {
    console.error(`Error creating/updating Dependabot repo secret ${name} for ${ownerAndRepo}: ${e.message}`)
    process.exit(1)
  }
}

const setSecrets = async (name: string, value: string, dependabot: boolean): Promise<void> => {
  const validateError = validateSecretName(name)
  if (validateError instanceof Error) {
    console.error(`${validateError}`)
    process.exit(1)
  }

  await setActionsRepoSecret(name, value)
  if (dependabot) {
    await setDependabotRepoSecret(name, value)
  }
}

/**
 * Deletes a GitHub repo secret. Exits with a non-zero status in case of error. Exits with zero status if secret is not found (no action needed)
 * @async
 * @param name GitHub repo secret name
 * @returns void
 */
const deleteActionsRepoSecret = async (name: string): Promise<void> => {
  try {
    await client.rest.actions.deleteRepoSecret({
      owner,
      repo,
      secret_name: name,
    });
    console.log(`Actions repo secret ${name} was deleted successfully from ${ownerAndRepo}`)
  } catch (e: any) {
    const error = e as RequestError
    if (error.status == 404) {
      console.log(`No Actions repo secret named ${name} was found for ${ownerAndRepo}`)
      process.exit(0)
    }
    console.error(`Error deleting Actions repo secret ${name} from ${ownerAndRepo}: ${e.message}`)
    process.exit(1)
  }
}

function main() {
  yargs(process.argv.slice(2))
    .demandCommand(1, 1, "Script requires exactly one command")
    .command(
      'set',
      'Create or update a GitHub Actions repo secret, and optionally a Dependabot repo secret',
      (yargs) => {
        return yargs
          .options({
            name: { type: 'string', demandOption: true, describe: 'Secret name' },
            value: { type: 'string', demandOption: true, describe: 'Secret value' },
            dependabot: { type: 'boolean', demandOption: false, describe: 'Also set a Dependabot repo secret', default: false },
          })
          .example('$0 set --name MY_SECRET --value topSecretValue --dependabot', '')
      },
      async (args) => await setSecrets(args.name, args.value, args.dependabot)
    )
    .command(
      'delete',
      'Delete a GitHub Actions repo secret',
      (yargs) => {
        return yargs
          .options({
            name: { type: 'string', demandOption: true, describe: 'Secret name' },
          })
          .example('$0 delete --name MY_SECRET', '')
      },
      async (args) => await deleteActionsRepoSecret(args.name)
    )
    .help('h')
    .alias('h', 'help')
    .strict()
    .argv
}

// initialize GitHub client
let client: Octokit
try {
  client = new Octokit()
} catch (e: any) {
  console.error(`${e}`)
  process.exit(1)
}

// don't run the main script if the module is being required rather than run directly
// this allows us to export helper functions to be used in other scripts
if (require.main === module) {
  main()
}

export { deleteActionsRepoSecret }
