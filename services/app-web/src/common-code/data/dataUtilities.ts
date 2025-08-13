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
     
    const newObj: any = obj instanceof Array ? [] : {}
    Object.keys(obj).forEach((k) => {
         
        const v: any = (obj as any)[k]
        newObj[k as keyof T] =
            v === null
                ? undefined
                :  
                  v &&
                    typeof v === 'object' && !(v instanceof Date)
                  ? replaceNullsWithUndefineds(v)
                  : v
    })
    return newObj
}

export {removeNullAndUndefined, replaceNullsWithUndefineds }