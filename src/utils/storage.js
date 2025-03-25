/**
 * Creates a storage manager for interacting with Chrome's storage API
 * @returns {Object} Storage manager interface
 */
export function createStorageManager() {
  return {
    /**
     * Save data to storage
     * @param {string} key - Storage key
     * @param {*} data - Data to save
     * @returns {Promise} Promise that resolves when data is saved
     */
    save(key, data) {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set({ [key]: data }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    },

    /**
     * Load data from storage
     * @param {string} key - Storage key
     * @returns {Promise} Promise that resolves with the loaded data
     */
    load(key) {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result[key]);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    },

    /**
     * Remove data from storage
     * @param {string} key - Storage key
     * @returns {Promise} Promise that resolves when data is removed
     */
    remove(key) {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    },
  };
}
