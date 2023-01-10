// this script requires a GitHub personal access token with 'read:public_key, repo' scope set as an env var called GITHUB_TOKEN

import { Octokit } from '@octokit/action'
import { RequestError } from "@octokit/request-error"
import sodium from 'libsodium-wrappers'
import yargs from 'yargs'

const octokit = new Octokit()
const owner = 'CMSgov'
const repo = 'managed-care-review'
const ownerAndRepo = `${owner}/${repo}`

// adapted from https://docs.github.com/en/rest/actions/secrets?apiVersion=2022-11-28#create-or-update-a-repository-secret
const setSecret = async (name: string, value: string): Promise<void> => {
  // get GitHub repository public key
  let publicKeyResponse
  try {
    publicKeyResponse = await octokit.actions.getRepoPublicKey({
      owner,
      repo
    })
  } catch(e: any) {
    console.error(`Error getting public key for repo ${ownerAndRepo}: ${e.message}`)
    process.exit(1)
  }
  const key = publicKeyResponse.data.key
  const keyId = publicKeyResponse.data.key_id

  sodium.ready.then(async () => {
    // convert secret & base64 key to Uint8Array.
    const binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL)
    const binsec = sodium.from_string(value)

    // encrypt the secret using libsodium
    const encBytes = sodium.crypto_box_seal(binsec, binkey)

    // convert encrypted uint8array to base64
    const base64Key = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL)

    // set the secret
    try {
      await octokit.rest.actions.createOrUpdateRepoSecret({
        owner: 'CMSgov',
        repo: 'managed-care-review',
        secret_name: name,
        encrypted_value: base64Key,
        key_id: keyId
      });
      console.log(`GitHub secret ${name} was created/updated successfully for ${ownerAndRepo}`)
    } catch(e: any) {
      console.error(`Error creating/updating repo secret ${name} for ${ownerAndRepo}: ${e.message}`)
      process.exit(1)
    }
  })
}

const deleteSecret = async (name: string): Promise<void> => {
  try {
    await octokit.rest.actions.deleteRepoSecret({
      owner: 'CMSgov',
      repo: 'managed-care-review',
      secret_name: name,
    });
    console.log(`GitHub repo secret ${name} was deleted successfully from ${ownerAndRepo}`)
  } catch(e: any) {
    const error = e as RequestError
    if (error.status == 404) {
      console.log(`No repo secret named ${name} was found for ${ownerAndRepo}`)
      process.exit(0)
    }
    console.error(`Error deleting repo secret ${name} from ${ownerAndRepo}: ${e.message}`)
    process.exit(1)
  }
}

function main() {
  yargs(process.argv.slice(2))
    .demandCommand(1, 1, "Script requires exactly one command")
    .command(
      'set',
      'Create or update a GitHub repo secret',
      (yargs) => {
        return yargs
          .options({
            name: {type: 'string', demandOption: true, describe: 'Secret name' },
            value: {type: 'string', demandOption: true, describe: 'Secret value' },
          })
          .example('$0 set --name MY_SECRET --value topSecretValue', '')
      },
      async (args) => await setSecret(args.name, args.value)
      )
    .command(
      'delete',
      'Delete a GitHub repo secret',
      (yargs) => {
        return yargs
          .options({
            name: {type: 'string', demandOption: true, describe: 'Secret name' },
          })
          .example('$0 delete --name MY_SECRET', '')
      },
      async (args) => await deleteSecret(args.name)
    )
    .help('h')
    .alias('h', 'help')
    .strict()
    .argv
}

// don't run the main script if the module is being required rather than run directly
// this allows us to export helper functions to be used in other scripts
if (require.main === module) {
  main()
}

export { deleteSecret }
