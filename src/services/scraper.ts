import { Stagehand } from '@browserbasehq/stagehand'
import { MongoClient } from 'mongodb'
import { z } from 'zod'

import logger from '../logger'

export interface Agent {
  name: string | null
  profileLink: string | null
}

let client: MongoClient | null = null

export async function getMongoCollection() {
  if (!client) {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017'
    client = new MongoClient(uri)
    await client.connect()
  }

  const dbName = process.env.MONGO_DB || 'zillow'
  const db = client.db(dbName)
  return db.collection<Agent>('agents')
}

export async function saveToMongo(agentData: Agent[]) {
  // If no agent data, return
  if (agentData.length === 0) return

  // Get the collection
  const collection = await getMongoCollection()

  // Optionally, add a unique index on profileLink to prevent duplicates
  await collection.createIndex({ profileLink: 1 }, { unique: true, name: 'profileLink_unique_idx' })

  // Insert many, ignore duplicates
  try {
    await collection.insertMany(agentData.filter((a) => a.profileLink))
  } catch (e: any) {
    if (!e.message.includes('E11000')) throw e // Ignore duplicate key errors
  }
}

export async function scrapeZillowAgentsPage(zip: string, pageNum = 1) {
  // Initialize Stagehand
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY || '',
    projectId: process.env.BROWSERBASE_PROJECT_ID || '',
    modelName: 'gpt-4o',
    modelClientOptions: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      proxies: [
        {
          type: 'browserbase',
          geolocation: {
            city: 'NEW_YORK',
            state: 'NY',
            country: 'US',
          },
        },
      ],
    },
  })
  try {
    // Initialize Stagehand
    await stagehand.init()
    const page = stagehand.page

    // Construct the URL for the current page
    const url = `https://www.zillow.com/professionals/real-estate-agent-reviews/${zip}/?page=${pageNum}`
    await page.goto(url)

    // Observe the page
    logger.info(`Observing the page: ${url}`)
    const observations = await page.observe({
      instruction: 'Find the Agents on the page',
    })

    if (observations.length === 0) {
      logger.info(`No agents found on the page: ${url}`)
      await stagehand.close()
      return {
        hasNext: false,
        agents: [],
      }
    }

    // Extract agents
    logger.info(`Extracting agents from the page: ${url}`)
    const agents = await page.extract({
      instruction: 'Extract All agents and their details including name, and the profile link',
      schema: z.object({
        list_of_agents: z.array(
          z.object({
            name: z.string(),
            profileLink: z.string().url(),
          })
        ),
      }),
    })

    // Save agents
    if (agents && agents.list_of_agents && agents.list_of_agents.length > 0) {
      await saveToMongo(agents.list_of_agents.map((a: any) => ({ name: a.name, profileLink: a.profileLink })))
    }

    // Check for Next page button
    const nextExists = await page.evaluate(() => {
      const nextBtn = document.querySelector("li button[title='Next page']") as HTMLButtonElement | null
      return nextBtn && !nextBtn.disabled
    })

    await stagehand.close()

    return {
      hasNext: !!nextExists,
      agents: agents?.list_of_agents || [],
    }
  } catch (e) {
    logger.error(`Error scraping the page: ${e}`)
    await stagehand.close()
    return {
      hasNext: false,
      agents: [],
      error: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}
