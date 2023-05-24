import * as fs from 'fs'

const jsonData = fs.readFileSync('./statePrograms.json', 'utf8')
const stateProgramsJson = JSON.parse(jsonData)

export const statePrograms = stateProgramsJson
