import AWS from 'aws-sdk'

const getParameter = async (name: string): Promise<string | Error> => {
    const SSM = new AWS.SSM({ region: 'us-east-1' })

    const params = {
        Name: name,
    }

    try {
        const response: AWS.SSM.GetParameterResult = await SSM.getParameter(
            params
        ).promise()
        const value = response?.Parameter?.Value

        if (value === undefined) {
            const errorMessage = `Failed to return parameter ${name}. Value was undefined.`
            console.error(errorMessage)
            return new Error(errorMessage)
        }

        return value
    } catch (err) {
        console.error(
            `Failed to fetch parameter ${name}. Error: ${err.message}`
        )
        return err
    }
}

export { getParameter }
