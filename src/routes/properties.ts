import { Router } from 'express'

import { AuthenticatedRequest } from '../middleware/auth'

const rapidApiUrl = 'realtor-search.p.rapidapi.com'

const router = Router()

// GET /properties/search - Search properties
router.get('/auto-complete', async (req: AuthenticatedRequest, res: any) => {
  try {
    const query = req.query.q as string

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Search query is required',
      })
    }

    // Make the Request to RapidAPI
    const rapidApiResponse = await fetch(
      `https://${rapidApiUrl}/properties/auto-complete?input=${encodeURIComponent(query.trim())}`,
      {
        headers: {
          'x-rapidapi-host': rapidApiUrl,
          'x-rapidapi-key': process.env.RAPID_API_KEY!,
        },
      }
    )

    if (!rapidApiResponse.ok)
      return res.status(500).json({
        error: true,
        message: 'Error fetching properties',
      })

    const { data } = await rapidApiResponse.json()

    res.json({
      success: true,
      data: { ...data },
      query: query.trim(),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Internal server error',
    })
  }
})

router.get('/:id', async (req: AuthenticatedRequest, res: any) => {
  const { id } = req.params

  if (!id) return res.status(400).json({ error: true, message: 'Property ID is required' })

  const rapidApiResponse = await fetch(`https://${rapidApiUrl}/properties/detail?propertyId=${id}`, {
    headers: {
      'x-rapidapi-host': rapidApiUrl,
      'x-rapidapi-key': process.env.RAPID_API_KEY!,
    },
  })

  if (!rapidApiResponse.ok) return res.status(500).json({ error: true, message: 'Error fetching property' })

  const { data } = await rapidApiResponse.json()

  res.json({
    success: true,
    data: { ...data },
  })
})

export default router
