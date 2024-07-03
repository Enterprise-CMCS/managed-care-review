import { Crypto } from '@peculiar/webcrypto'
import { TextEncoder, TextDecoder } from 'util'

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// eslint-disable-next-line @typescript-eslint/no-empty-function
Element.prototype.scrollIntoView = () => {}

// to make calculating the sha work in jest
Object.defineProperty(globalThis, 'crypto', {
    value: new Crypto(),
})

Object.assign(global, { TextDecoder, TextEncoder })
