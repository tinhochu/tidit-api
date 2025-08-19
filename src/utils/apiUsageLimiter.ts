import { getApiUsageCollection } from '../db/mongo'

const DAILY_LIMIT = 6500
const MONTHLY_LIMIT = 195000

function getDateStrings() {
  const now = new Date()
  const day = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const month = now.toISOString().slice(0, 7) // YYYY-MM
  return { day, month }
}

export async function isRapidApiLimitReached() {
  const apiUsage = getApiUsageCollection()
  const { day, month } = getDateStrings()

  // Get today's and this month's usage
  const [daily, monthly] = await Promise.all([
    apiUsage.findOne({ _id: `day:${day}` }),
    apiUsage.findOne({ _id: `month:${month}` }),
  ])

  const dailyCount = daily?.count || 0
  const monthlyCount = monthly?.count || 0

  return {
    dailyLimitReached: dailyCount >= DAILY_LIMIT,
    monthlyLimitReached: monthlyCount >= MONTHLY_LIMIT,
    dailyCount,
    monthlyCount,
  }
}

export async function incrementRapidApiUsage() {
  const apiUsage = getApiUsageCollection()
  const { day, month } = getDateStrings()

  // Increment daily
  await apiUsage.updateOne({ _id: `day:${day}` }, { $inc: { count: 1 } }, { upsert: true })
  // Increment monthly
  await apiUsage.updateOne({ _id: `month:${month}` }, { $inc: { count: 1 } }, { upsert: true })
}
