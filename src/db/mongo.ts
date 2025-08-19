import { MongoClient } from 'mongodb'

import logger from '../logger'

let client: MongoClient
let dbTidit: any

export async function connectMongo() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017'
  client = new MongoClient(uri)
  await client.connect()
  dbTidit = client.db(process.env.MONGO_DB || 'tidit')
  logger.info('🗄️  Connected to Tidit MongoDB')
}
