import { message, danger } from 'danger'

const modifiedMD = danger.git.modified_files
if (modifiedMD.length === 0) {
    message('No files changed in this PR')
}
message('Changed Files in this PR: \n - ' + modifiedMD)
