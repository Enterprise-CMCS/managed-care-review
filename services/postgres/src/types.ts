export interface SecretDict {
    engine: string
    host: string
    username: string
    password: string
    dbname?: string
    port?: number
    ssl?: boolean | string
}

export interface RotationEvent {
    SecretId: string
    ClientRequestToken: string
    Step: 'createSecret' | 'setSecret' | 'testSecret' | 'finishSecret'
}
