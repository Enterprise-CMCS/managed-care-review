import { SES, AWSError, Request } from 'aws-sdk';
const ses = new SES({ region: "us-east-1" });

type EmailData = {
  bodyData: string,
  sourceEmail: string ,
  subjectData: string ,
  toAddresses: SES.AddressList,
  bccAddresses?:SES.AddressList, 
  ccAddresses?: SES.AddressList,
  replyToAddresses?: SES.AddressList,
  subjectCharset?: string,
  bodyCharset?: string,


}
function getSESEmailParams(email: EmailData): SES.SendEmailRequest {

 const {bccAddresses, ccAddresses, toAddresses,  bodyData, bodyCharset, subjectData, subjectCharset, sourceEmail, replyToAddresses} = email;

  const emailParams: SES.SendEmailRequest  = {
    Destination: {
      BccAddresses: bccAddresses || [],
      CcAddresses: ccAddresses || [],
      ToAddresses: toAddresses
    },
    Message: {
      Body: {
        Text: {
          Data: bodyData,
          Charset: bodyCharset || 'UTF-8'
        }
      },
      Subject: {
        Data: subjectData,
        Charset: subjectCharset || 'UTF-8'
      }
    },
    Source: sourceEmail,
    ReplyToAddresses: replyToAddresses
  }

  return emailParams;
}

function sendEmail(params:  SES.SendEmailRequest): Request<SES.SendEmailResponse, AWSError>{
 return ses.sendEmail(params, function (err, data) {
    if (err) {
      console.error(err);
      return err
    } else {
      console.log(data);
      return data
    }
  });
}


export {getSESEmailParams, sendEmail}
export type {EmailData}
