export type Seed = string | number

function hashSeed(seed: Seed): number {
    const value = String(seed)
    let hash = 2_166_136_261

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index)
        hash = Math.imul(hash, 16_777_619)
    }

    return hash >>> 0
}

export class SeededRandom {
    #state: number

    constructor(seed: Seed) {
        this.#state = hashSeed(seed)
    }

    next(): number {
        this.#state = (this.#state + 0x6d2b79f5) >>> 0
        let value = this.#state
        value = Math.imul(value ^ (value >>> 15), value | 1)
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
        return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
    }

    integer(minimum: number, maximum: number): number {
        if (
            !Number.isSafeInteger(minimum) ||
            !Number.isSafeInteger(maximum) ||
            maximum < minimum
        ) {
            throw new RangeError(
                'SeededRandom.integer requires safe integers with maximum >= minimum'
            )
        }

        return minimum + Math.floor(this.next() * (maximum - minimum + 1))
    }

    pick<T>(values: ReadonlyArray<T>): T {
        if (values.length === 0) {
            throw new RangeError('SeededRandom.pick requires a non-empty array')
        }

        return values[this.integer(0, values.length - 1)]
    }
}
