import { Redis } from 'ioredis'
import * as dotenv from 'dotenv'
dotenv.config()

const redis = new Redis(process.env.REDIS_URL!)
redis.ping().then(res => {
    console.log('Redis:', res)
    redis.disconnect()
})