/**
 * Recursively remove all keys set to undefined and null from object
 */

function removeNullAndUndefined<T extends object> (data: T){
    for (const key in data) {
        if (data[key] === undefined || data[key] === null ) {
          delete data[key];
        }
        if ( typeof data[key] === 'object'){
          removeNullAndUndefined(data[key] as object)
        }
    }
    return data
}

/**
 * Recursively replace all null with undefined.
 * Adapted from https://github.com/apollographql/apollo-client/issues/2412
 */
type UnknownObjectWithNestedData<T> = T extends null
    ? undefined
    : T extends Date
      ? T
      : {
            [K in keyof T]: T[K] extends (infer U)[]
                ?   UnknownObjectWithNestedData<U>[]
                :   UnknownObjectWithNestedData<T[K]>
        }

function replaceNullsWithUndefineds<T extends object>(
    obj: T
):  UnknownObjectWithNestedData<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newObj: any = obj instanceof Array ? [] : {}
    Object.keys(obj).forEach((k) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v: any = (obj as any)[k]
        newObj[k as keyof T] =
            v === null
                ? undefined
                : // eslint-disable-next-line no-proto
                  v &&
                    typeof v === 'object' && !(v instanceof Date)
                  ? replaceNullsWithUndefineds(v)
                  : v
    })
    return newObj
}

export {removeNullAndUndefined, replaceNullsWithUndefineds }