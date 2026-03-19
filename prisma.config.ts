import 'dotenv/config'
import { env, defineConfig } from 'prisma/config'
import type { PrismaConfig } from 'prisma'

const config: PrismaConfig = {
    schema: './services/app-api/prisma/schema.prisma',
    migrations: {
        path: './services/app-api/prisma/migrations',
    },
}

// Only add datasource URL if DATABASE_URL is available (needed for migrations, not generation)
const databaseUrl = process.env.DATABASE_URL
if (databaseUrl) {
    config.datasource = {
        url: env('DATABASE_URL'),
    }
}

export default defineConfig(config)
