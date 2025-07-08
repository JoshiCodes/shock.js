// lib/DeviceHub.js
var DeviceHub = class {
  constructor(shockJs, hubData) {
    this.shockJs = shockJs;
    this.id = hubData.id;
    this.name = hubData.name;
    this.createdOn = hubData.createdOn;
  }
  fetchShockers() {
    return this.shockJs.fetchShockers(this);
  }
};
var DeviceHub_default = DeviceHub;

// lib/index.js
var ShockJS = class {
  constructor(apiKey, options = {
    baseUrl: "https://api.openshock.app/"
  }) {
    if (!apiKey || typeof apiKey !== "string") {
      throw new Error("A valid API key is required.");
    }
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || "https://api.openshock.app/";
  }
  /**
   * Fetches the backend version of the Shock API.
   * @returns {Promise<string>} - The backend version as a string.
   */
  backendVersion() {
    return this.fetchData("/1", false).then((obj) => {
      if (obj && obj.data) {
        const data = obj.data;
        if (data && data.version)
          return data.version;
      } else {
        throw new Error("Invalid response from the API.");
      }
    }).catch((err) => {
      throw new Error(`Failed to fetch backend version! ${err.message}`);
    });
  }
  /**
   * Fetches a list of hubs associated with the API key.
   * @returns {Promise<{hubs: DeviceHub}>}
   */
  fetchHubs() {
    return this.fetchData("/1/devices", true).then((obj) => {
      if (obj && obj.data) {
        const data = obj.data;
        if (Array.isArray(data)) {
          const hubs = data.map((hub) => new DeviceHub_default(
            this,
            {
              id: hub.id,
              name: hub.name,
              createdOn: hub.createdOn
            }
          ));
          return { hubs };
        } else {
          throw new Error("Invalid data format received from the API.");
        }
      } else {
        throw new Error("Invalid response from the API.");
      }
    }).catch((err) => {
      throw new Error(`Failed to fetch hubs! ${err.message}`);
    });
  }
  /**
   * Fetches details of a specific hub by its ID.
   * @param hubId {string}
   * @returns {Promise<{DeviceHub}>}
   */
  fetchHub(hubId) {
    if (!hubId || typeof hubId !== "string") {
      throw new Error("A valid hub ID is required.");
    }
    return this.fetchData(`/1/devices/${hubId}`, true).then((obj) => {
      if (obj && obj.data) {
        const data = obj.data;
        if (data && data.id) {
          return new DeviceHub_default(
            this,
            {
              id: data.id,
              name: data.name,
              createdOn: data.createdOn
            }
          );
        } else {
          throw new Error("Invalid hub data received from the API.");
        }
      } else {
        throw new Error("Invalid response from the API.");
      }
    }).catch((err) => {
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
    const url = `${this.baseUrl.replace(/\/$/, "")}${endpoint}`;
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (ShockJS)"
    };
    if (useAuth)
      headers["OpenShockToken"] = this.apiKey;
    return fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data)
    }).then(async (res) => {
      const text = await res.text();
      if (!res.ok) {
        return Promise.reject({
          message: `HTTP status ${res.status}`,
          body: text
        });
      }
      try {
        return JSON.parse(text);
      } catch (err) {
        throw new Error("Failed to parse JSON response.");
      }
    });
  }
  /**
   * Helper function to fetch data from the API.
   * @param {string} endpoint - The API endpoint (e.g., '/v1/data').
   * @param useAuth
   * @returns {Promise<Object>} - Parsed JSON response.
   */
  fetchData(endpoint, useAuth = true) {
    const url = `${this.baseUrl.replace(/\/$/, "")}${endpoint}`;
    const headers = {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (ShockJS)"
    };
    if (useAuth)
      headers["OpenShockToken"] = this.apiKey;
    return fetch(url, { headers }).then(async (res) => {
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }
      try {
        return JSON.parse(text);
      } catch (err) {
        throw new Error("Failed to parse JSON response.");
      }
    });
  }
  /**
   * Fetches shockers for a specific hub.
   * @param {DeviceHub} hub - The hub object containing the ID.
   * @returns {Promise<void>} - A promise that resolves when the shockers are fetched.
   */
  fetchShockers(hub) {
    if (!hub || !hub.id) {
      throw new Error("A valid hub object with an ID is required.");
    }
    const id = hub.id;
    return this.fetchData(`/1/shockers/own`, true).then((obj) => {
      if (obj && obj.data) {
        const data = obj.data;
        if (data && Array.isArray(data)) {
          const hubData = data.find((h) => h.id === id);
          if (hubData && hubData.shockers) {
            return hubData.shockers.map((shocker) => ({
              id: shocker.id,
              rfId: shocker.rfId,
              model: shocker.model,
              name: shocker.name,
              isPaused: shocker.isPaused,
              createdOn: shocker.createdOn
            }));
          } else {
            throw new Error("No shockers found for the specified hub.");
          }
        }
      } else {
        throw new Error("Invalid response from the API.");
      }
    }).catch((err) => {
      throw new Error(`Failed to fetch shockers! ${err.message}`);
    });
  }
  /**
   * Sends shock data to the API.
   * @param shockId {string} - The ID of the shocker.
   * @param type {"Shock" | "Vibrate" | "Sound" | "Stop"} - The type of shock to send.
   * @param intensity {number} - The intensity of the shock (default: 1).
   * @param duration {number} - The duration of the shock in milliseconds (default: 1000) - must be between 300 and 65535 ms.
   * @param customName {string|null} - Optional custom name for the shocker.
   * @param exclusive {boolean} - Whether the shock is exclusive (default: true).
   */
  sendShockData(shockId, type, intensity = 1, duration = 1e3, customName = "shock.js", exclusive = true) {
    if (duration < 300 || duration > 65535) {
      throw new Error("Duration must be between 300 and 65535 seconds.");
    }
    if (!shockId || typeof shockId !== "string") {
      throw new Error("A valid shocker ID is required.");
    }
    if (!type || !["Shock", "Vibrate", "Sound", "Stop"].includes(type)) {
      throw new Error("A valid shock type is required (Shock, Vibrate, Sound, Stop).");
    }
    const data = {
      "shocks": [
        {
          "id": shockId,
          "type": type,
          "intensity": intensity,
          "duration": duration,
          "exclusive": exclusive
        }
      ],
      "customName": customName || null
    };
    console.log(`Sending shock ${JSON.stringify(data)}`);
    return this.postData(`/2/shockers/control`, data, true).then((response) => {
      if (response && response.message) {
        return response.message;
      } else {
        throw new Error("Invalid response from the API.");
      }
    }).catch((err) => {
      if (err.body) {
        try {
          const errorResponse = JSON.parse(err.body);
          if (errorResponse && errorResponse.message) {
            err.message = errorResponse.message;
          }
        } catch (parseError) {
        }
      }
      throw new Error(`Failed to send shock data! ${err.message}`);
    });
  }
  stopShock(shockId, customName = "shock.js") {
    return this.sendShockData(shockId, "Stop", 1, 1e3, customName);
  }
};
var index_default = ShockJS;
export {
  index_default as default
};
