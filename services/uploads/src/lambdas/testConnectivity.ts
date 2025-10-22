import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import dns from 'dns'
import net from 'net'

export const main = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const hostname = 'clamav.mc-review-cdk.local'
    const port = 3310

    console.info('Testing connectivity to ClamAV...')
    const results: string[] = []

    // Test 1: DNS resolution
    try {
        const addresses = await new Promise<string[]>((resolve, reject) => {
            dns.resolve4(hostname, (err, addresses) => {
                if (err) reject(err)
                else resolve(addresses)
            })
        })
        const message = `DNS Resolution SUCCESS: ${hostname} -> ${addresses.join(', ')}`
        console.info(message)
        results.push(message)
    } catch (error) {
        const message = `DNS Resolution FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.info(message)
        results.push(message)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'DNS resolution failed', results }),
        }
    }

    // Test 2: TCP connection
    try {
        await new Promise<void>((resolve, reject) => {
            const client = new net.Socket()
            client.setTimeout(5000)

            client.connect(port, hostname, () => {
                const message = `TCP Connection SUCCESS: Connected to ${hostname}:${port}`
                console.info(message)
                results.push(message)
                client.destroy()
                resolve()
            })

            client.on('error', (err) => {
                const message = `TCP Connection FAILED: ${err.message}`
                console.info(message)
                results.push(message)
                reject(err)
            })

            client.on('timeout', () => {
                const message = `TCP Connection TIMEOUT: Could not connect to ${hostname}:${port}`
                console.info(message)
                results.push(message)
                client.destroy()
                reject(new Error('Connection timeout'))
            })
        })
    } catch (error) {
        const message = `TCP test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.info(message)
        results.push(message)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'TCP connection failed', results }),
        }
    }

    // Test 3: Try to ping the ClamAV service
    try {
        await new Promise<void>((resolve, reject) => {
            const client = new net.Socket()
            client.setTimeout(10000)

            client.connect(port, hostname, () => {
                // Send PING command to ClamAV
                client.write('PING\n')
            })

            client.on('data', (data) => {
                const response = data.toString().trim()
                const message = `ClamAV Response: ${response}`
                console.info(message)
                results.push(message)
                client.destroy()
                resolve()
            })

            client.on('error', (err) => {
                const message = `ClamAV PING FAILED: ${err.message}`
                console.info(message)
                results.push(message)
                reject(err)
            })

            client.on('timeout', () => {
                const message = `ClamAV PING TIMEOUT: No response from clamd`
                console.info(message)
                results.push(message)
                client.destroy()
                reject(new Error('ClamAV ping timeout'))
            })
        })
    } catch (error) {
        const message = `ClamAV ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.info(message)
        results.push(message)
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'All connectivity tests completed!',
            results,
            timestamp: new Date().toISOString(),
        }),
    }
}
