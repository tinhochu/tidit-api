import { Response } from 'express'

import logger from '../logger'

// Constants
export const RAPID_API_CONFIG = {
  host: 'realtor-search.p.rapidapi.com',
  baseUrl: 'https://realtor-search.p.rapidapi.com',
} as const

export const ERROR_MESSAGES = {
  SEARCH_QUERY_REQUIRED: 'Search query is required',
  PROPERTY_ID_REQUIRED: 'Property ID is required',
  RAPID_API_ERROR: 'Error fetching data from external service',
  INTERNAL_ERROR: 'Internal server error',
} as const

// Types
export interface RapidApiResponse<T> {
  data: T
}

// Utility functions
export const createRapidApiHeaders = () => ({
  'x-rapidapi-host': RAPID_API_CONFIG.host,
  'x-rapidapi-key': process.env.RAPID_API_KEY!,
})

export const handleRapidApiError = (response: Response, error: any, context: string) => {
  logger.error(`RapidAPI error in ${context}: ${error.message} (status: ${error.status})`)
  return response.status(500).json({
    error: true,
    message: ERROR_MESSAGES.RAPID_API_ERROR,
    code: 'RAPID_API_ERROR',
  })
}

export const handleInternalError = (response: Response, error: any, context: string) => {
  logger.error(`Internal error in ${context}: ${error.message}`)
  return response.status(500).json({
    error: true,
    message: ERROR_MESSAGES.INTERNAL_ERROR,
    code: 'INTERNAL_ERROR',
  })
}

export const makeRapidApiRequest = async <T>(url: string, context: string): Promise<T> => {
  const response = await fetch(url, {
    headers: createRapidApiHeaders(),
  })

  if (!response.ok) {
    const body = JSON.parse(await response.text())
    const error = new Error(`RapidAPI request failed:${body.message}`)
    ;(error as any).status = response.status
    throw error
  }

  return response.json()
}
