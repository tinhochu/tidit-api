import { ObjectId } from 'mongodb'

import { getZillowAgentsCollection } from '../db/mongo'
import logger from '../logger'
import { incrementRapidApiUsage, isRapidApiLimitReached } from '../utils/apiUsageLimiter'

// function to retrieve just the username from the profile link
function getUsernameFromProfileLink(profileLink: string) {
  const username = profileLink.split('/')[4]
  return username
}

export async function fetchZillowAgent(agentId: string, agentProfileLink: string) {
  try {
    // Check API usage limits before making the RapidAPI call
    const usage = await isRapidApiLimitReached()
    if (usage.dailyLimitReached || usage.monthlyLimitReached) {
      logger.warn(
        `RapidAPI limit reached: daily=${usage.dailyCount}/6500, monthly=${usage.monthlyCount}/195000. Skipping fetch for agent ${agentId}`
      )
      return
    }

    // Get the username from the profile link
    const username = getUsernameFromProfileLink(agentProfileLink)

    const response = await fetch(`https://zillow-com1.p.rapidapi.com/agentDetails?username=${username}`, {
      headers: {
        'X-Rapidapi-Key': process.env.RAPID_API_KEY!,
        'X-Rapidapi-Host': 'zillow-com1.p.rapidapi.com',
        Host: 'zillow-com1.p.rapidapi.com',
      },
    })

    if (response.status !== 200) {
      logger.error(`Error fetching Zillow Agent: ${response.status}: ${response.statusText}`)
      return
    }

    // Increment usage after a successful call
    await incrementRapidApiUsage()

    const data = await response.json()

    // Now, from the data, we need to get the key "professionalInformation"
    const professionalInformation = data.professionalInformation

    // Find all license info items
    const licenseInfos = professionalInformation.filter(
      (item: any) => item.term === 'Real Estate Licenses' || item.term === 'Other Licenses'
    )

    const licenseNumbers: string[] = []

    for (const licenseInfo of licenseInfos) {
      let rawLicense = ''
      if (Array.isArray(licenseInfo.lines) && licenseInfo.lines.length > 0) {
        rawLicense = licenseInfo.lines.join(' | ')
      } else if (licenseInfo.description) {
        if (licenseInfo.description.trim().toLowerCase() === 'not provided') {
          continue // Skip this entry
        }
        rawLicense = licenseInfo.description
      }
      // Extract the first sequence of alphanumeric characters as the license number
      const match = rawLicense.match(/[A-Za-z0-9]+/)
      if (match) {
        licenseNumbers.push(match[0])
      }
    }

    if (licenseNumbers.length === 0) return

    // Now, we need to update the agent in the database
    const agents = getZillowAgentsCollection()

    // Update the agent with the license numbers
    const result = await agents.updateOne({ _id: new ObjectId(agentId) }, { $set: { licenseNumbers } })
    logger.info(`Updated agent ${agentId} with license numbers: ${licenseNumbers.join(', ')}`)
  } catch (error) {
    logger.error(`Error fetching Zillow Agent: ${error}`)
  }
}
