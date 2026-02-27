import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;

if (!uri) {
  throw new Error("MONGODB_URI environment variable is not set");
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In dev, use a global so the connection survives hot reloads
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db("flight_scraper");
}

export default clientPromise;
