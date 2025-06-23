import ShockJs from "./lib/index.js";

import { config } from 'dotenv';
config();

// Initialize the ShockJs instance with the API key from environment variables
const apiKey = process.env.SHOCK_API_KEY;

const shock = new ShockJs(apiKey)

shock.backendVersion().then(
    version => {
        console.log(`Shock API Backend Version: ${version}`);
    }
).catch(
    err => {
        console.error(`Error fetching backend version: ${err.message}`);
    }
)

await new Promise(resolve => setTimeout(resolve, 1000));

const hubs = await shock.fetchHubs();
console.log("Hubs:", hubs);
const firstHub = hubs.hubs[0];
console.log("First Hub:", firstHub);

await new Promise(resolve => setTimeout(resolve, 1000));

shock.fetchHub(firstHub.id).then(
    hub => {
        console.log("Hub Details:", hub);
    }
).catch(
    err => {
        console.error(`Error fetching hub details: ${err.message}`);
    }
)

await new Promise(resolve => setTimeout(resolve, 1000));

const shockers = await shock.fetchShockers(firstHub);
console.log("Shockers in First Hub:", shockers);