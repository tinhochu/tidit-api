import { Response, Router } from 'express'

import logger from '../logger'
import { AuthenticatedRequest } from '../middleware/auth'
import {
  ERROR_MESSAGES,
  RAPID_API_CONFIG,
  RapidApiResponse,
  handleInternalError,
  handleRapidApiError,
  makeRapidApiRequest,
} from '../utils/rapid-api'

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
      const url = `${RAPID_API_CONFIG.baseUrl}/locations/v2/auto-complete?input=${encodeURIComponent(trimmedQuery)}`

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

      if (!id?.trim())
        return res.status(400).json({
          error: true,
          message: ERROR_MESSAGES.PROPERTY_ID_REQUIRED,
          code: 'MISSING_PROPERTY_ID',
        })

      const trimmedId = id.trim()

      const url = `${RAPID_API_CONFIG.baseUrl}/properties/v3/detail?property_id=${trimmedId}`

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
