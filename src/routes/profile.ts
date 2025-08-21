import { Router } from 'express'

import { appwriteUsers } from '../utils/appwrite'

const router = Router()

router.put('/:userId', async (req, res) => {
  const { userId } = req.params
  const body = req.body

  if (!userId) return res.status(400).json({ error: true, message: 'User ID is required' })

  const user = await appwriteUsers.get(userId)

  const updatedPrefs = await appwriteUsers.updatePrefs(user.$id, { ...user.prefs, ...body.prefs })

  res.json({ data: { userId, ...updatedPrefs } })
})

export default router
