import AWS from 'aws-sdk'

export function s3LocalUploader(s3Client: AWS.S3) {
    return async function (file: File): Promise<string> {
      const filename = `${Date.now()}-${file.name}`;
  
      return new Promise((resolve, reject) => {
        s3Client.putObject(
          {
            Bucket: 'local-uploads',
            Key: filename,
            Body: file,
          },
          (err, data) => {
            if (err) {
              reject(err);
            }
            console.log('data this worked', data)
            resolve(filename);
          }
        );
      });
    };
  }

// locally we do what
// export function s3LocalGetURL(s3Client: AWS.S3) {
//     return function (s3key) {
//       const params = { Key: s3key };
//       return s3Client.getSignedUrl("getObject", params);
//     };
//   }
  