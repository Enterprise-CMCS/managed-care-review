import AWS from 'aws-sdk'
import { recordJSException } from '../otelHelpers/tracingHelper'

const params: AWS.SSM.GetParameterRequest = {
    Name: '/configuration/MS/stateanalysts/email'
}


const getParameter =  async (name: string): Promise<AWS.SSM.GetParameterResult | Error> => {
    const SSM = new AWS.SSM({region: 'us-east-1'})

    const params = {
        Name: name
    }
    
    return await SSM.getParameter(params).promise()
    .then ( (value) => {
        return value
    })
    .catch(err => {
        recordJSException(err)
        return err
    })
}

