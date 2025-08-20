import dotenv from 'dotenv'
import express from 'express'
import morgan from 'morgan'

import { connectMongo } from './db/mongo'
import logger from './logger'
import { apiKeyAuth } from './middleware/auth'
import propertiesRoutes from './routes/properties'

dotenv.config()

const app = express()

// Custom morgan token to get the IP address
morgan.token('ip', (req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  return Array.isArray(ip) ? ip[0] : ip
})
morgan.token('body', (req: any) => JSON.stringify(req.body || {}))

// Use Morgan middleware for request logging
app.use(morgan(':method :url :status :res[content-length] - :response-time ms - IP: :ip - Body: :body'))

// Create API router
const apiRouter = express.Router()

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

  // Mount all API routes under /api
  app.use('/api', apiRouter)

  // Protected routes - require API key
  apiRouter.use('/properties', apiKeyAuth, propertiesRoutes)

  // Start the server
  app.listen(process.env.PORT || 8000, () => logger.info(`🚀 Server running on Port: ${process.env.PORT}`))
})()
