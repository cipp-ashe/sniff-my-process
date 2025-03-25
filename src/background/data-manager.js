/**
 * Data manager for background script
 */

/**
 * Creates a data manager
 * @param {Object} options - Configuration options
 * @param {Object} options.storage - Storage manager instance
 * @returns {Object} Data manager interface
 */
export function createDataManager({ storage }) {
  // In-memory data
  let workflowData = {
    interactions: [],
    networkRequests: [],
    timestamp: new Date().toISOString(),
    sessionId: generateSessionId(),
  };

  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  return {
    /**
     * Initialize the data manager
     * @returns {Promise<Object>} Promise that resolves with the initialized data
     */
    async initialize() {
      try {
        const savedData = await storage.load("workflowData");
        if (savedData) {
          workflowData = savedData;
        } else {
          // Save initial data to storage
          await storage.save("workflowData", workflowData);
        }
        return workflowData;
      } catch (error) {
        console.error("Error initializing data:", error);
        return workflowData;
      }
    },

    /**
     * Get the current workflow data
     * @returns {Object} Current workflow data
     */
    getWorkflowData() {
      return { ...workflowData };
    },

    /**
     * Add an interaction to the workflow data
     * @param {Object} interaction - Interaction data
     * @returns {Promise<Object>} Promise that resolves with the updated workflow data
     */
    async addInteraction(interaction) {
      // Add the interaction to the in-memory data
      workflowData.interactions.push(interaction);

      // Update the timestamp
      workflowData.timestamp = new Date().toISOString();

      // Save to storage
      try {
        await storage.save("workflowData", workflowData);
        return { ...workflowData };
      } catch (error) {
        console.error("Error saving interaction:", error);
        return { ...workflowData };
      }
    },

    /**
     * Add a network request to the workflow data
     * @param {Object} request - Network request data
     * @returns {Promise<Object>} Promise that resolves with the updated workflow data
     */
    async addNetworkRequest(request) {
      // Add the request to the in-memory data
      workflowData.networkRequests.push(request);

      // Update the timestamp
      workflowData.timestamp = new Date().toISOString();

      // Save to storage
      try {
        await storage.save("workflowData", workflowData);
        return { ...workflowData };
      } catch (error) {
        console.error("Error saving network request:", error);
        return { ...workflowData };
      }
    },

    /**
     * Clear all interactions and network requests
     * @returns {Promise<Object>} Promise that resolves with the updated workflow data
     */
    async clearInteractions() {
      // Generate a new session ID
      const sessionId = generateSessionId();

      // Reset the data
      workflowData = {
        interactions: [],
        networkRequests: [],
        timestamp: new Date().toISOString(),
        sessionId,
      };

      // Save to storage
      try {
        await storage.save("workflowData", workflowData);
        return { ...workflowData };
      } catch (error) {
        console.error("Error clearing interactions:", error);
        return { ...workflowData };
      }
    },

    /**
     * Get workflow data statistics
     * @returns {Object} Workflow data statistics
     */
    getStats() {
      return {
        interactionCount: workflowData.interactions.length,
        networkRequestCount: workflowData.networkRequests.length,
        sessionId: workflowData.sessionId,
        timestamp: workflowData.timestamp,
      };
    },

    /**
     * Export workflow data as JSON
     * @returns {string} JSON string
     */
    exportAsJson() {
      return JSON.stringify(workflowData, null, 2);
    },

    /**
     * Export workflow data as CSV
     * @returns {string} CSV string
     */
    exportAsCsv() {
      // Combine interactions and network requests
      const allEvents = [
        ...workflowData.interactions.map((interaction) => ({
          ...interaction,
          category: "interaction",
        })),
        ...workflowData.networkRequests.map((request) => ({
          ...request,
          category: "network",
        })),
      ];

      // Sort by timestamp
      allEvents.sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
      });

      // Get all possible headers
      const headers = new Set();
      allEvents.forEach((event) => {
        Object.keys(event).forEach((key) => {
          headers.add(key);
        });
      });

      // Convert to array and ensure category and timestamp are first
      const headerArray = Array.from(headers);
      headerArray.sort((a, b) => {
        if (a === "category") return -1;
        if (b === "category") return 1;
        if (a === "timestamp") return -1;
        if (b === "timestamp") return 1;
        return a.localeCompare(b);
      });

      // Create CSV header row
      let csv = headerArray.join(",") + "\n";

      // Add data rows
      allEvents.forEach((event) => {
        const row = headerArray
          .map((header) => {
            const value = event[header];
            if (value === undefined || value === null) {
              return "";
            }
            if (typeof value === "object") {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            if (typeof value === "string") {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",");
        csv += row + "\n";
      });

      return csv;
    },
  };
}
