import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'

import logger from '../logger'

export async function scrapeOGImage(url: string) {
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
    await page.goto(url)

    // Observe the page
    logger.info(`Observing the page: ${url}`)
    const observations = await page.observe({
      instruction: 'find the .hero-container .carousel-photo',
    })

    if (observations.length === 0) return null

    // Extract og:image
    logger.info(`Extracting og:image from the page: ${url}`)
    const ogImageObject = await page.extract({
      instruction: 'Extract the image source from the .hero-container .carousel-photo',
      schema: z.object({
        src: z.string().url(),
      }),
    })

    await stagehand.close()

    return ogImageObject.src
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
