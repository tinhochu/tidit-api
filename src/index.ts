import dotenv from 'dotenv'
import express from 'express'

import { connectMongo } from './db/mongo'
import logger from './logger'

dotenv.config()

const app = express()

;(async () => {
  await connectMongo()

  app.use(express.json())

  // Start the server
  app.listen(process.env.PORT || 8000, () => logger.info(`🚀 Server running on Port: ${process.env.PORT}`))
})()
