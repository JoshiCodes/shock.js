/**
 * shockjs - A simple Node.js package
 */

'use strict';
import { get } from 'https';
import DeviceHub from './DeviceHub.js';
import * as https from "node:https";

class ShockJS {
    constructor(apiKey, options = {
        baseUrl: 'https://api.openshock.app/'
    }) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('A valid API key is required.');
        }
        this.apiKey = apiKey;
        this.baseUrl = options.baseUrl || 'https://api.openshock.app/';
    }

    /**
     * Fetches the backend version of the Shock API.
     * @returns {Promise<string>} - The backend version as a string.
     */
    backendVersion() {
        return this.fetchData('/1', false)
            .then(obj => {
                if (obj && obj.data) {
                    const data = obj.data;
                    if(data && data.version)
                        return data.version;
                } else {
                    throw new Error('Invalid response from the API.');
                }
            })
            .catch(err => {
                throw new Error(`Failed to fetch backend version! ${err.message}`);
            });
    }

    /**
     * Fetches a list of hubs associated with the API key.
     * @returns {Promise<{hubs: DeviceHub}>}
     */
    fetchHubs() {
        return this.fetchData("/1/devices", true)
            .then(obj => {
                // rest api returns { "message":"", "data": [ { "id", "name", "createdOn" ] }
                if (obj && obj.data) {
                    const data = obj.data;
                    if (Array.isArray(data)) {
                        const hubs = data.map(hub => new DeviceHub(
                            this,
                            {
                                id: hub.id,
                                name: hub.name,
                                createdOn: hub.createdOn
                            }
                        ));
                        return { hubs };
                    } else {
                        throw new Error('Invalid data format received from the API.');
                    }
                } else {
                    throw new Error('Invalid response from the API.');
                }
            })
            .catch(err => {
                throw new Error(`Failed to fetch hubs! ${err.message}`);
            });
    }

    /**
     * Fetches details of a specific hub by its ID.
     * @param hubId {string}
     * @returns {Promise<{DeviceHub}>}
     */
    fetchHub(hubId) {
        if (!hubId || typeof hubId !== 'string') {
            throw new Error('A valid hub ID is required.');
        }
        return this.fetchData(`/1/devices/${hubId}`, true)
            .then(obj => {
                if (obj && obj.data) {
                    const data = obj.data;
                    if (data && data.id) {
                        return new DeviceHub(
                            this,
                            {
                                id: data.id,
                                name: data.name,
                                createdOn: data.createdOn
                            }
                        )
                    } else {
                        throw new Error('Invalid hub data received from the API.');
                    }
                } else {
                    throw new Error('Invalid response from the API.');
                }
            })
            .catch(err => {
                throw new Error(`Failed to fetch hub! ${err.message}`);
            });
    }

    /**
     * Posts data to the API.
     * @param endpoint {string} - The API endpoint (e.g., '/v1/data').
     * @param data {Object} - The data to post.
     * @param useAuth {boolean} - Whether to use authentication (default: true).
     */
    postData(endpoint, data, useAuth = true) {
        const urlObj = new URL(`${this.baseUrl.replace(/\/$/, '')}${endpoint}`);
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Node.js ShockJS)',
            'Content-Length': Buffer.byteLength(JSON.stringify(data))
        };
        if (useAuth)
            headers['OpenShockToken'] = this.apiKey;
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            headers,
            protocol: urlObj.protocol,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            method: 'POST'
        }
        // send a POST request with JSON data
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return reject({
                            message: `HTTP status ${res.statusCode}`,
                            body: data
                        });                    }
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (err) {
                        reject(new Error('Failed to parse JSON response.'));
                    }
                });
            });

            req.on('error', reject);
            req.write(JSON.stringify(data));
            req.end();
        });
    }

    /**
     * Helper function to fetch data from the API.
     * @param {string} endpoint - The API endpoint (e.g., '/v1/data').
     * @param useAuth
     * @returns {Promise<Object>} - Parsed JSON response.
     */
    fetchData(endpoint, useAuth = true) {
        const urlObj = new URL(`${this.baseUrl.replace(/\/$/, '')}${endpoint}`);
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Node.js ShockJS)'
        };
        if (useAuth)
            headers['OpenShockToken'] = this.apiKey;
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            headers,
            protocol: urlObj.protocol,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80)
        };

        return new Promise((resolve, reject) => {
            get(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return reject(new Error(`HTTP status ${res.statusCode}`));
                    }
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (err) {
                        reject(new Error('Failed to parse JSON response.'));
                    }
                });
            }).on('error', reject);
        });
    }

    /**
     * Fetches shockers for a specific hub.
     * @param {DeviceHub} hub - The hub object containing the ID.
     * @returns {Promise<void>} - A promise that resolves when the shockers are fetched.
     */
    fetchShockers(hub) {
        if (!hub || !hub.id) {
            throw new Error('A valid hub object with an ID is required.');
        }
        const id = hub.id;
        // fetch /1/shockers/own
        // api returns { "data": [ "id": "hubId", "name": "hubName", "createdOn", "shockers: [ { "id", "rfId", "model", "name", "isPaused", "createdOn" } ] ] }
        return this.fetchData(`/1/shockers/own`, true)
            .then(obj => {
                if (obj && obj.data) {
                    const data = obj.data;
                    if (data && Array.isArray(data)) {
                        // go through each hub and find the matching hub
                        const hubData = data.find(h => h.id === id);
                        if (hubData && hubData.shockers) {
                            return hubData.shockers.map(shocker => ({
                                id: shocker.id,
                                rfId: shocker.rfId,
                                model: shocker.model,
                                name: shocker.name,
                                isPaused: shocker.isPaused,
                                createdOn: shocker.createdOn
                            }));
                        } else {
                            throw new Error('No shockers found for the specified hub.');
                        }
                    }
                } else {
                    throw new Error('Invalid response from the API.');
                }
            })
            .catch(err => {
                throw new Error(`Failed to fetch shockers! ${err.message}`);
            });
    }

    /**
     * Sends shock data to the API.
     * @param hub {DeviceHub} - The hub object containing the ID.
     * @param shockId {string} - The ID of the shocker.
     * @param type {"Shock" | "Vibrate" | "Sound" | "Stop"} - The type of shock to send.
     * @param intensity {number} - The intensity of the shock (default: 1).
     * @param duration {number} - The duration of the shock in milliseconds (default: 1000) - must be between 300 and 65535 ms.
     * @param customName {string|null} - Optional custom name for the shocker.
     */
    sendShockData(shockId, type, intensity = 1, duration = 1000, customName = "shock.js") {
        if(duration < 300 || duration > 65535) {
            throw new Error('Duration must be between 300 and 65535 seconds.');
        }
        const data = {
            "shocks": [
                {
                    "id": shockId,
                    "type": type,
                    "intensity": intensity,
                    "duration": duration,
                    "exclusive": true
                }
            ],
            "customName": customName || null
        }
        console.log(`Sending shock ${JSON.stringify(data)}`);
        return this.postData(`/2/shockers/control`, data, true)
            .then(response => {
                if (response && response.message) {
                    return response.message;
                } else {
                    throw new Error('Invalid response from the API.');
                }
            })
            .catch(err => {
                // get response error message
                if (err.body) {
                    try {
                        const errorResponse = JSON.parse(err.body);
                        if (errorResponse && errorResponse.message) {
                            err.message = errorResponse.message;
                        }
                    } catch (parseError) {
                        // Ignore JSON parse errors
                    }
                }
                throw new Error(`Failed to send shock data! ${err.message}`);
            });
    }

}

export default ShockJS;