import { NextFunction, Request, Response } from 'express'

import logger from '../logger'

export interface AuthenticatedRequest extends Request {
  isAuthenticated?: boolean
}

export const apiKeyAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')

  if (!apiKey) {
    res.status(401).json({
      error: true,
      message: 'API key is required',
      code: 'MISSING_API_KEY',
    })
    return
  }

  const validApiKey = process.env.API_KEY

  if (!validApiKey) {
    logger.error('API_KEY environment variable not set')
    res.status(500).json({
      error: true,
      message: 'Server configuration error',
      code: 'SERVER_CONFIG_ERROR',
    })
    return
  }

  if (apiKey !== validApiKey) {
    res.status(403).json({
      error: true,
      message: 'Invalid API key',
      code: 'INVALID_API_KEY',
    })
    return
  }

  req.isAuthenticated = true
  next()
}

// Optional: Middleware to skip auth for certain endpoints (like health checks)
export const optionalApiKeyAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')

  if (!apiKey) {
    req.isAuthenticated = false
    next()
    return
  }

  const validApiKey = process.env.API_KEY

  if (apiKey === validApiKey) {
    req.isAuthenticated = true
  } else {
    req.isAuthenticated = false
  }

  next()
}
