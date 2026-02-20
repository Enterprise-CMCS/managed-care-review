import 'dotenv/config'
import { env, defineConfig } from 'prisma/config'
import type { PrismaConfig } from 'prisma'

export default defineConfig({
    schema: './services/app-api/prisma/schema.prisma',
    datasource: {
        url: env('DATABASE_URL'),
    },
    migrations: {
        path: './services/app-api/prisma/migrations',
    },
}) satisfies PrismaConfig
