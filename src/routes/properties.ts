import { Response, Router } from 'express'

import logger from '../logger'
import { AuthenticatedRequest } from '../middleware/auth'

// Constants
const RAPID_API_CONFIG = {
  host: 'realtor-search.p.rapidapi.com',
  baseUrl: 'https://realtor-search.p.rapidapi.com',
} as const

const ERROR_MESSAGES = {
  SEARCH_QUERY_REQUIRED: 'Search query is required',
  PROPERTY_ID_REQUIRED: 'Property ID is required',
  RAPID_API_ERROR: 'Error fetching data from external service',
  INTERNAL_ERROR: 'Internal server error',
} as const

// Types
interface RapidApiResponse<T> {
  data: T
}

interface PropertySearchResponse {
  success: boolean
  data: any
  query: string
  timestamp: string
}

interface PropertyDetailResponse {
  success: boolean
  data: any
}

// Utility functions
const createRapidApiHeaders = () => ({
  'x-rapidapi-host': RAPID_API_CONFIG.host,
  'x-rapidapi-key': process.env.RAPID_API_KEY!,
})

const handleRapidApiError = (response: Response, error: any, context: string) => {
  logger.error(`RapidAPI error in ${context}: ${error.message} (status: ${error.status})`)
  return response.status(500).json({
    error: true,
    message: ERROR_MESSAGES.RAPID_API_ERROR,
    code: 'RAPID_API_ERROR',
  })
}

const handleInternalError = (response: Response, error: any, context: string) => {
  logger.error(`Internal error in ${context}: ${error.message}`)
  return response.status(500).json({
    error: true,
    message: ERROR_MESSAGES.INTERNAL_ERROR,
    code: 'INTERNAL_ERROR',
  })
}

const makeRapidApiRequest = async <T>(url: string, context: string): Promise<T> => {
  const response = await fetch(url, {
    headers: createRapidApiHeaders(),
  })

  if (!response.ok) {
    const error = new Error(`RapidAPI request failed with status ${response.status}`)
    ;(error as any).status = response.status
    throw error
  }

  return response.json()
}

const router = Router()

// GET /properties/auto-complete - Search properties
router.get(
  '/auto-complete',
  async (
    req: AuthenticatedRequest,
    res: Response<PropertySearchResponse | { error: boolean; message: string; code?: string }>
  ) => {
    try {
      const query = req.query.q as string

      if (!query?.trim()) {
        return res.status(400).json({
          error: true,
          message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED,
          code: 'MISSING_QUERY',
        })
      }

      const trimmedQuery = query.trim()
      const url = `${RAPID_API_CONFIG.baseUrl}/properties/auto-complete?input=${encodeURIComponent(trimmedQuery)}`

      const response = await makeRapidApiRequest<RapidApiResponse<any>>(url, 'auto-complete')

      logger.info(`Property search completed successfully for query: ${trimmedQuery}`)

      res.json({
        success: true,
        data: response.data,
        query: trimmedQuery,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      if ((error as any).status) {
        return handleRapidApiError(res, error, 'auto-complete')
      }
      return handleInternalError(res, error, 'auto-complete')
    }
  }
)

// GET /properties/:id - Get property details
router.get(
  '/:id',
  async (
    req: AuthenticatedRequest,
    res: Response<PropertyDetailResponse | { error: boolean; message: string; code?: string }>
  ) => {
    try {
      const { id } = req.params

      if (!id?.trim()) {
        return res.status(400).json({
          error: true,
          message: ERROR_MESSAGES.PROPERTY_ID_REQUIRED,
          code: 'MISSING_PROPERTY_ID',
        })
      }

      const trimmedId = id.trim()
      const url = `${RAPID_API_CONFIG.baseUrl}/properties/detail?propertyId=${trimmedId}`

      const response = await makeRapidApiRequest<RapidApiResponse<any>>(url, 'property-detail')

      logger.info(`Property detail retrieved successfully for ID: ${trimmedId}`)

      res.json({
        success: true,
        data: response.data,
      })
    } catch (error) {
      if ((error as any).status) {
        return handleRapidApiError(res, error, 'property-detail')
      }
      return handleInternalError(res, error, 'property-detail')
    }
  }
)

export default router
