import { Octokit } from 'octokit'

const github = new Octokit({ auth: "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" })

const run = async () => {
  const deployments = await github.rest.repos.listDeployments({
    owner: "CMSgov",
    repo: "managed-care-review",
    sha: "3c681d6a2f9ac10ed0ae8d5605b701678a516a5f",
    contextref: "refs/heads/bharvey-deployments",
    environment: "dev"
  });
  console.log(`Found ${deployments.data.length} deployments to dev for ${ref}/`)
  await Promise.all(
    deployments.data.map(async (deployment) => {
      console.log(`Setting deployment ${deployment.id} to inactive`)
      await github.rest.repos.createDeploymentStatus({
        owner: "CMSgov",
        repo: "managed-care-review",
        deployment_id: deployment.id,
        state: 'inactive'
      });
      console.log(`Deleting deployment ${deployment.id}`)
      return github.rest.repos.deleteDeployment({
        owner: "CMSgov",
        repo: "managed-care-review",
        deployment_id: deployment.id
      });
    })
  );
}

run()
