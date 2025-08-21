import dotenv from 'dotenv'
import { Client, Users } from 'node-appwrite'

dotenv.config()

const APPWRITE_ENDPOINT_URL = process.env.APPWRITE_ENDPOINT
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY

if (!APPWRITE_ENDPOINT_URL || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.log(process.env)
  throw new Error(
    'Missing required Appwrite environment variables: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY'
  )
}

// * Initialize Appwrite client
const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT_URL)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY)

const appwriteUsers = new Users(appwriteClient)

export { appwriteClient, appwriteUsers }
