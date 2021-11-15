import { Handler } from 'aws-lambda';
import {SendEmailRequest} from 'aws-sdk/clients/ses'
import {getSESEmailParams, sendEmail, submissionReceivedCMSEmail} from "../emailer";

export const main: Handler = async (event, context, callback) => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2))
  console.log("Received event:", JSON.stringify(event));
  //  add event payload
  const stageName =  process.env.stage
  const emailSource =  process.env.emailSource || 'UNKNOWN_SOURCE';

//  event.Records.forEach(async function (record: { eventName: string }) {
//     const params: SendEmailRequest | null = (function (eventName) {

//       switch (eventName) {
//         case "CMS_SUBMISSION_SUCCESS":
          const params: SendEmailRequest =  getSESEmailParams({
            toAddresses: ['hana@truss.works'],
            sourceEmail: emailSource,
            subjectData: `${stageName !== 'PROD' ? stageName + '- ' : ''} New Managed Care Submission: [submission ID]`,
            bodyData: `
            [submission ID] was received from [state].

            Submission type: [submission type]
            Submission description: [submission description]

            View the full submission

                      
          `,
          });
    //     case "STATE_SUBMISSION_SUCCESS":
    //       return getSESEmailParams({
    //         toAddresses: ['hana@truss.works'],
    //         sourceEmail: emailSource,
    //         subjectData: `${stageName !== 'PROD' ? stageName + '- ' : ''}[Submission ID] was sent to CMS`,
    //         bodyData: `
    //         [Submission ID] was successfully submitted.

    //         If you need to make any changes, please contact CMS.
            
    //         What comes next:
    //         1. Check for completeness: CMS will review all documentation submitted to ensure all required materials were received.
    //         2. CMS review: Your submission will be reviewed by CMS for adherence to federal regulations. If a rate certification is included, it will be reviewed for policy adherence and actuarial soundness.
    //         3. Questions: You may receive questions via email form CMS as they conduct their reviews.
    //         4. Decision: Once all questions have been addressed, CMS will contact you with their final recommendation.
                      
    //       `,
    //       });

    //     default:
    //       console.log(new Error('could not generate params'));
    //       return null;
    //   }
    // })(record.eventName);
    
    if (params) {
      try {
        const result = await sendEmail(params).promise();
        console.log(result);
        return {
          statusCode: 200,
          body: JSON.stringify({
            code: 'EMAIL_SUCCEEDED', 
          }),
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
          },
        };
      } catch (err) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            code: 'EMAIL_FAILED',
            message: 'Could not send email' + err,
          }),
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
          },
        };
      }
    }



}


