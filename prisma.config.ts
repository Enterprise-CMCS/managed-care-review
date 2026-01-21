import 'dotenv/config'
import { env, defineConfig } from 'prisma/config'
import type { PrismaConfig } from 'prisma'

export default defineConfig({
    schema: './packages/database/prisma/schema.prisma',
    datasource: {
        url: env('DATABASE_URL'),
    },
    migrations: {
        path: './packages/database/prisma/migrations',
    },
}) satisfies PrismaConfig
