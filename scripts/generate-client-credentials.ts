#!/usr/bin/env ts-node

import { v4 as uuidv4 } from 'uuid'

const clientId = `client-${uuidv4()}`
const clientSecret = uuidv4()

console.log('Generated client credentials:')
console.log('Client ID:     ', clientId)
console.log('Client Secret: ', clientSecret) 