import { Router } from 'express'

import logger from '../logger'
import { appwriteUsers } from '../utils/appwrite'

const router = Router()

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const user = await appwriteUsers.get(userId)

    logger.info(`Got user preferences for user ${userId} ${JSON.stringify(user.prefs)}`)

    res.json({ data: { userId: user.$id, ...user.prefs }, success: true, timestamp: new Date().toISOString() })
  } catch (error) {
    logger.error(`Error getting user preferences for user ${error}`)
    res.status(500).json({ error: true, message: 'Error getting user preferences' })
  }
})

router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const body = req.body

    if (!userId) return res.status(400).json({ error: true, message: 'User ID is required' })

    const updatedPrefs = await appwriteUsers.updatePrefs(userId, body.prefs)

    logger.info(`Updated user preferences for user ${userId} ${JSON.stringify(updatedPrefs)}`)

    res.json({ data: { userId, ...updatedPrefs }, success: true, timestamp: new Date().toISOString() })
  } catch (error) {
    logger.error(`Error updating user preferences for user ${error}`)
    res.status(500).json({ error: true, message: 'Error updating user preferences' })
  }
})

router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    if (!userId) return res.status(400).json({ error: true, message: 'User ID is required' })

    // Delete the user account from Appwrite
    await appwriteUsers.delete(userId)

    logger.info(`Deleted user account ${userId}`)

    res.json({ success: true, message: 'Account deleted successfully', timestamp: new Date().toISOString() })
  } catch (error) {
    logger.error(`Error deleting user account ${error}`)
    res.status(500).json({ error: true, message: 'Error deleting user account' })
  }
})

export default router
