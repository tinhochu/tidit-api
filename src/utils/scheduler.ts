import { getZillowAgentsCollection, getZillowJobsCollection } from '../db/mongo'
import logger from '../logger'
import { scrapeZillowAgentsPage } from '../services/scraper'
import { fetchZillowAgent } from '../services/zillow-api'

const SCHEDULER_INTERVAL_MS = 10000
const MAX_NEXT_PAGE = 20

type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

interface Job {
  _id: any
  status: JobStatus
  zip: string
  nextPage: number
  attempt: number
  updatedAt?: Date
}

interface ScrapeResult {
  agents: any[]
  hasNext: boolean
  error?: string
}

async function findRunningJob(jobs: ReturnType<typeof getZillowJobsCollection>) {
  return jobs.findOne({ status: 'running' })
}

async function findPendingJob(jobs: ReturnType<typeof getZillowJobsCollection>) {
  return jobs.findOne({ status: 'pending' })
}

async function setJobStatus(
  jobs: ReturnType<typeof getZillowJobsCollection>,
  jobId: any,
  status: JobStatus,
  nextPage?: number,
  attempt?: number
) {
  const update: any = { status, updatedAt: new Date() }
  if (typeof nextPage === 'number') update.nextPage = nextPage
  if (typeof attempt === 'number') update.attempt = attempt
  await jobs.updateOne({ _id: jobId }, { $set: update })
}

function getNextStatusAndPage(result: ScrapeResult, job: Job): { status: JobStatus; nextPage: number } {
  if (result.hasNext) {
    return { status: 'pending', nextPage: job.nextPage + 1 }
  } else if (!result.hasNext && job.nextPage < MAX_NEXT_PAGE) {
    return { status: 'pending', nextPage: job.nextPage } // Optionally increment nextPage if desired
  }
  return { status: 'completed', nextPage: job.nextPage }
}

export function runScheduler() {
  setInterval(async () => {
    const jobs = getZillowJobsCollection()

    let job: Job | null = null
    try {
      // Skip if a job is already running
      if (await findRunningJob(jobs)) return

      // Get a pending job
      job = await findPendingJob(jobs)

      if (!job) return

      // If 'attempt' key does not exist, initialize it to 1
      if (typeof job.attempt === 'undefined') {
        await setJobStatus(jobs, job._id, job.status, job.nextPage, 1)
        job.attempt = 1
        logger.info(`Job: ${job._id} - Initialized attempt to 1`)
      }

      logger.info(`Starting job: ${job._id}: ${job.zip} - Page: ${job.nextPage} - Attempt: ${job.attempt}`)
      await setJobStatus(jobs, job._id, 'running', job.nextPage, job.attempt)

      const result: ScrapeResult = await scrapeZillowAgentsPage(job.zip, job.nextPage)

      // If there is an error, set the job to failed
      if (result.error) {
        await setJobStatus(jobs, job._id, 'failed', job.nextPage, job.attempt)
        logger.error(`Job: ${job._id} - Failed to scrape: ${result.error}`)
        return
      }

      // If no agents found but hasNext, add back to pending
      if (result.agents.length === 0 && result.hasNext) {
        await setJobStatus(jobs, job._id, 'pending', job.nextPage, job.attempt + 1)
        logger.info(`Job: ${job._id} - No agents found, adding back to pending (attempt ${job.attempt + 1})`)
        return
      }

      // If attempts < 4, keep retrying; else, complete
      if (job.attempt < 4) {
        const { status, nextPage } = getNextStatusAndPage(result, job)
        if (status === 'completed') {
          // Only complete if attempts >= 4
          await setJobStatus(jobs, job._id, 'pending', nextPage, job.attempt + 1)
          logger.info(`Job: ${job._id} - Retry (attempt ${job.attempt + 1})`)
        } else {
          // Reset attempt if nextPage increased, otherwise increment
          const resetAttempt = nextPage > job.nextPage ? 1 : job.attempt + 1
          await setJobStatus(jobs, job._id, status, nextPage, resetAttempt)

          logger.info(`Job: ${job._id} - Add Back to Pending with nextPage: ${nextPage} (attempt ${resetAttempt})`)
        }
      } else {
        await setJobStatus(jobs, job._id, 'completed', job.nextPage, job.attempt)
        logger.info(`Job: ${job._id} - Completed after 4 attempts`)
      }
    } catch (e) {
      logger.error('Scheduler error:', e)
      // If job is defined, mark as failed
      if (job && job._id) {
        await setJobStatus(jobs, job._id, 'failed', job?.nextPage, job?.attempt)
      }
    }
  }, SCHEDULER_INTERVAL_MS)

  // If the FETCH_ZILLOW_AGENT_ENABLED environment variable is set to true
  if (process.env.FETCH_ZILLOW_AGENT_ENABLED === 'true') {
    logger.info('🔄 Starting fetchZillowAgent')
    // Set another Interval to Fetch Agents from the DB and run the fetchZillowAgent function
    setInterval(async () => {
      // Get the agents collection
      const agents = getZillowAgentsCollection()

      // get a random agent from the DB
      const [agent] = await agents
        .aggregate([
          { $match: { licenseNumbers: { $exists: false }, hasZillowProfile: { $ne: true } } },
          { $sample: { size: 1 } },
        ])
        .toArray()

      if (!agent) {
        logger.info('No agent found to fetch from Zillow')
        return
      }

      // if the agent has a licenseNumber, skip
      if (!agent.profileLink) {
        logger.info('No profile link found for agent, skipping')
        return
      }

      await fetchZillowAgent(agent._id, agent.profileLink)
    }, SCHEDULER_INTERVAL_MS)
  }
}
