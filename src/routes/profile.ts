import { Router } from 'express'

import logger from '../logger'
import { appwriteUsers } from '../utils/appwrite'

const router = Router()

router.put('/:userId', async (req, res) => {
  const { userId } = req.params
  const body = req.body

  if (!userId) return res.status(400).json({ error: true, message: 'User ID is required' })

  const updatedPrefs = await appwriteUsers.updatePrefs(userId, body.prefs)

  logger.info(`Updated user preferences for user ${userId} ${JSON.stringify(updatedPrefs)}`)

  res.json({ data: { userId, ...updatedPrefs } })
})

export default router
