import dotenv from 'dotenv'
import express from 'express'

import { connectMongo } from './db/mongo'
import logger from './logger'
import { apiKeyAuth } from './middleware/auth'
import propertiesRoutes from './routes/properties'

dotenv.config()

const app = express()

;(async () => {
  await connectMongo()

  app.use(express.json())

  // Health check endpoint (unprotected)
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    })
  })

  // Protected routes - require API key
  app.use('/properties', apiKeyAuth, propertiesRoutes)

  // Start the server
  app.listen(process.env.PORT || 8000, () => logger.info(`🚀 Server running on Port: ${process.env.PORT}`))
})()
