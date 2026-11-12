# How to add static assets (PDFs, documents) to the web app

## Background
Sometimes product or design gives us a file that the app needs to link to, such as a user manual or a slide deck on the Resources and training page. These files are not user uploads. They do not go through `FileUpload`, the uploads buckets, or virus scanning. Instead, we commit them to the repo and deploy them with the frontend.

Follow this guide when a ticket asks you to add or replace a file that the app links to directly.

## General Guidance

### How static assets reach S3
We do not upload these files to S3 by hand. Vite copies everything in `services/app-web/public/` into the build output (`services/app-web/build`) as is. On each deploy, the `MainAppDeployment` `BucketDeployment` in `services/infra-cdk/lib/stacks/frontend-app.ts` syncs that build folder to the main app S3 bucket and invalidates the CloudFront cache (`/*`). A file at `public/resources/example.pdf` is served at `/resources/example.pdf` in every environment, including local dev.

### Where to put files
- Put documents in `services/app-web/public/resources/`.
- `MC-Review-overview-Slide-deck.pdf` sits at the root of `public/` because it was added before this convention existed. Move it the next time someone changes that link.

### Naming
- Use URL-safe names: no spaces, and separate words with hyphens. Example: `MC-Review-State-User-Manual-October-2026.pdf`. Do not use the original file name if it has spaces or special characters.
- Put a date or version in the name when the file will be replaced over time. A new name also gives a new URL, so browsers cannot serve a stale copy from cache. It also shows the change clearly in the diff.
- Delete the old file when you replace it, unless something else still links to it.

### Things to keep in mind
- **Files are public.** Anyone who has the URL can open them, logged in or not. Never put anything sensitive or internal in `public/`.
- **Files are permanent in git history.** Each binary stays in the repo history and in every deploy, even after you delete it. A few megabytes per file is fine. Ask the team before adding large files (for example, video). Those may belong somewhere else, such as YouTube or medicaid.gov.
- **Get approval first.** Product or stakeholders approve these documents. Use the exact file attached to the ticket.

## Steps
1. Download the file from the ticket.
2. Rename it to follow the naming conventions above, and add it to `services/app-web/public/resources/`.
3. Link to it with a root-relative path, and open it in a new tab:
    ```tsx
    <a
        href="/resources/MC-Review-State-User-Manual-October-2026.pdf"
        target="_blank"
        rel="noreferrer"
        aria-label="State user manual (opens in new window)"
    >
        State user manual
    </a>
    ```
4. Update tests that assert the link's `href`. For the Resources and training page, that is `services/app-web/src/pages/App/AppRoutes.test.tsx`.
5. Run the app locally (`./dev local --web`) and click the link. The file should open in a new tab.
6. After the PR deploys to a review app, check the link again there. This confirms the file reached the S3 bucket.

## Related Documentation
- [File upload](./file-upload.md): how user-uploaded documents are stored in S3. That flow is different from this one.
- [CDK deployment guide](./cdk-deployment-guide.md): the frontend stack that deploys the build to S3 and CloudFront.
- [How CI/CD works](./how-cicd-works.md)
