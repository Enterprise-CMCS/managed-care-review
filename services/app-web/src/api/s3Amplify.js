// import { Storage } from "aws-amplify";

// export async function s3AmplifyUpload(file: File): Promise<string>{
//   const filename = `${Date.now()}-${file.name}`;

//   const stored = await Storage.vault.put(filename, file, {
//     contentType: file.type,
//   });

//   return stored.key;
// }

// // In Amplify you call get to get a url to the given resource
// export async function s3AmplifyGetURL(s3key: string): Promise<unknown | string> {
//   return Storage.vault.get(s3key);
// }

export const foo = 'bar'
