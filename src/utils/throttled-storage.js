/**
 * Creates a throttled storage manager to prevent excessive storage operations
 * @param {Object} storage - Storage manager instance
 * @param {number} delay - Throttle delay in milliseconds
 * @returns {Object} Throttled storage manager interface
 */
export function createThrottledStorage(storage, delay = 1000) {
  let pendingWrites = {};
  let timeouts = {};

  return {
    /**
     * Save data to storage with throttling
     * @param {string} key - Storage key
     * @param {*} data - Data to save
     * @returns {Promise} Promise that resolves when data is scheduled for saving
     */
    save(key, data) {
      return new Promise((resolve) => {
        // Cancel any pending write for this key
        if (timeouts[key]) {
          clearTimeout(timeouts[key]);
        }

        // Store the latest data
        pendingWrites[key] = data;

        // Schedule a write
        timeouts[key] = setTimeout(() => {
          const dataToWrite = pendingWrites[key];
          delete pendingWrites[key];
          delete timeouts[key];

          storage
            .save(key, dataToWrite)
            .then(resolve)
            .catch((error) => {
              console.error(`Error saving to storage: ${error}`);
              resolve(); // Resolve anyway to prevent hanging promises
            });
        }, delay);

        // Resolve immediately to not block execution
        resolve();
      });
    },

    /**
     * Load data from storage (pass-through)
     * @param {string} key - Storage key
     * @returns {Promise} Promise that resolves with the loaded data
     */
    load(key) {
      // Check if there's pending data for this key
      if (pendingWrites[key] !== undefined) {
        return Promise.resolve(pendingWrites[key]);
      }

      // Otherwise, load from storage
      return storage.load(key);
    },

    /**
     * Remove data from storage (pass-through)
     * @param {string} key - Storage key
     * @returns {Promise} Promise that resolves when data is removed
     */
    remove(key) {
      // Cancel any pending write for this key
      if (timeouts[key]) {
        clearTimeout(timeouts[key]);
        delete timeouts[key];
        delete pendingWrites[key];
      }

      return storage.remove(key);
    },

    /**
     * Flush all pending writes immediately
     * @returns {Promise} Promise that resolves when all pending writes are flushed
     */
    flush() {
      const promises = [];

      // Process all pending writes
      for (const key in pendingWrites) {
        if (timeouts[key]) {
          clearTimeout(timeouts[key]);
          delete timeouts[key];

          const dataToWrite = pendingWrites[key];
          delete pendingWrites[key];

          promises.push(storage.save(key, dataToWrite));
        }
      }

      return Promise.all(promises);
    },
  };
}
