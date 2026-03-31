# How to update state programs

## Background
State programs are an important set of data in MC-Review. Currently, all submissions must have a program. Programs are also used in submission and rate names in communication. Right now developers are manually managing updates to the state programs list.

For pilot rollout of MC-Review, state programs are stored in a JSON file `stateProgram.json`. The state programs json is referenced both client-side, to display the program dropdowns, and server-side in API requests that include program data.

Each program entry now includes two deprecation-related fields:

- `isDeprecated`: `true` when the program should no longer be available for new selection in the UI
- `deprecatedByProgramId`: optional UUID of the replacement program when one exists

These fields let us retire old program names without deleting them from the JSON file. That matters because submissions store program IDs, not copied program names. If a previously used program were removed outright, historical records could no longer resolve their program name correctly.

The source of truth for that file comes from a CSV maintained by product and design. It is titled "State programs, population, and nicknames" in Google Drive. When that team adds or updates programs and would like the changes reflected in MC-Review, the dev team needs update our stored JSON using `scripts/import-programs.ts`. Steps to update this list follows below.

## Steps

1. Download the latest version of csv from google docs when prompted by product/design.
2. Run the following command that is created in  `import-programs.ts`. This will overwrite existing state programs JSON with the new output. Your usage of the script will likely look something like this:  `cd scripts && pnpm run build && node import-programs.js state.csv > ../packages/submissions/src/statePrograms/statePrograms.json`
    - The script exits with error message if there's no id set in the spreadsheet.
    - You will have to pause and set missing ids at that time. For any newly created programs, manually populate the `id` field using a UUID generator
3. Double check the diff. It's important not to delete any programs that have already been used for a submission because although programs are not in the database, we still store references to the program ID in postgres as if they are stable. Also, we want to be sure we are only changing programs expected to change.
4. If the change is a program deprecation rather than a simple rename:
    - Keep the old program entry in the spreadsheet and generated JSON.
    - Set `isDeprecated` to `true` on the old program.
    - If there is a replacement program, set `deprecatedByProgramId` on the old program to the new program's UUID.
    - Add the replacement program as a new row with its own new UUID.
    - Do not reuse the deprecated program's UUID for the replacement.
    - Do not delete the old row just because the name changed. Historical submissions may still depend on that program ID.
5. For non-deprecated programs, set `isDeprecated` to `false` and leave `deprecatedByProgramId` blank.
6. Make a PR to update the statePrograms file in the codebase
