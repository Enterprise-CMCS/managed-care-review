// NotFoundError is an Error subclass that indicates that we failed to find the request record in the db
class NotFoundError extends Error {
    constructor(message: string) {
        super(message)

        Object.setPrototypeOf(this, NotFoundError.prototype)
    }
}

// UserInputPostgresError is an Error subclass that indicates that the user passed in invalid arguements
// maps to UserInputError in apollo server
class UserInputPostgresError extends Error {
    constructor(message: string) {
        super(message)

        Object.setPrototypeOf(this, NotFoundError.prototype)
    }
}

export { NotFoundError, UserInputPostgresError }
