import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  datasource: {
    // The CLI uses this file for migrations, so it gets the direct port (5432)
    url: process.env.DATABASE_URL!,
  },
})