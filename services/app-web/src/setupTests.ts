import crypto from 'node:crypto';
import { TextEncoder, TextDecoder } from 'util'
import { Crypto } from "@peculiar/webcrypto"
import {cleanup} from '@testing-library/react';

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// eslint-disable-next-line @typescript-eslint/no-empty-function
Element.prototype.scrollIntoView = () => {}

// // to make calculating the sha work in jest
Object.defineProperty(globalThis, 'crypto', {
    value: new Crypto(),
});

Object.assign(global, { TextDecoder, TextEncoder })

// This is a fix for userEvents and fireEvents not resolving promises and causing issues with apollo mocks.
// Found this fix in https://github.com/testing-library/react-testing-library/issues/1197#issuecomment-2076120296
vi.useFakeTimers({
    shouldAdvanceTime: true
})

afterEach(cleanup)
