import { connectGalaxy, connectMongo, getGalaxyAgentsCollection, getZillowAgentsCollection } from '../db/mongo'
import logger from '../logger'

export async function runCrossmatch() {
  try {
    logger.info('🔄 Starting crossmatch')
    setInterval(async () => {
      // Get the zillow agents collection
      const zillowAgents = getZillowAgentsCollection()
      const galaxyAgents = getGalaxyAgentsCollection()

      // From the Zillow Agents, get the agents that have a licenseNumber
      const [zillowAgent] = await zillowAgents
        .aggregate([
          { $match: { licenseNumbers: { $exists: true }, hasZillowProfile: { $ne: true } } },
          { $sample: { size: 1 } },
        ])
        .toArray()

      // If no zillow agent with a licenseNumber, return
      if (!zillowAgent) {
        logger.info('No zillow agent with a licenseNumber found, skipping crossmatch')
        return
      }

      // Get the galaxy agent with the same licenseNumber
      const galaxyAgent = await galaxyAgents.findOne({
        licenseNumber: { $in: zillowAgent.licenseNumbers },
      })

      // If the galaxy agent does not exist, return
      if (!galaxyAgent) {
        // Lets tag  the zillow Agent as "no match"
        await zillowAgents.updateOne({ _id: zillowAgent._id }, { $set: { status: 'no_match' } })
        return
      }

      // If the galaxy agent exists, crossmatch it with the zillow agent
      if (galaxyAgent) {
        // Update the galaxy agent to indicate it has a Zillow profile
        await galaxyAgents.updateOne({ _id: galaxyAgent._id }, { $set: { hasZillowProfile: true } })

        // Update the zillow agent to indicate it has a Zillow profile
        await zillowAgents.updateOne({ _id: zillowAgent._id }, { $set: { hasZillowProfile: true } })

        logger.info(`✅ Crossmatched ${zillowAgent.name} with ${galaxyAgent.licenseHolderName}`)
      }
    }, 5000)
  } catch (error) {
    logger.error('Error running crossmatch:', error)
  }
}
