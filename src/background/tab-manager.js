/**
 * Tab manager for background script
 */
import { COMMANDS, createCommand } from "../utils/commands.js";

/**
 * Creates a tab manager
 * @param {Object} options - Configuration options
 * @param {Object} options.stateManager - State manager instance
 * @returns {Object} Tab manager interface
 */
export function createTabManager({ stateManager }) {
  // Track active tabs
  const activeTabs = new Set();

  /**
   * Handle tab updated event
   * @param {number} tabId - ID of the updated tab
   * @param {Object} changeInfo - Information about the change
   * @param {Object} tab - Tab information
   */
  function handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === "complete") {
      console.log("Tab updated:", tabId, tab.url);

      // Add to active tabs
      activeTabs.add(tabId);

      // If tracking is active, notify the tab
      const state = stateManager.getState();
      if (state.tracking.isActive) {
        // Give content script time to initialize
        setTimeout(() => {
          chrome.tabs
            .sendMessage(tabId, {
              target: "content",
              command: COMMANDS.STATE_UPDATE,
              payload: state,
            })
            .catch((err) => {
              // Content script might not be loaded yet, which is expected
              console.log(`Failed to send to new tab ${tabId}:`, err);
            });
        }, 1000);
      }
    }
  }

  /**
   * Handle tab removed event
   * @param {number} tabId - ID of the removed tab
   * @param {Object} removeInfo - Information about the removal
   */
  function handleTabRemoved(tabId, removeInfo) {
    console.log("Tab removed:", tabId);

    // Remove from active tabs
    activeTabs.delete(tabId);
  }

  /**
   * Broadcast a message to all tabs
   * @param {Object} message - Message to broadcast
   * @returns {Promise<Array>} Promise that resolves with the results
   */
  async function broadcastToAllTabs(message) {
    try {
      const tabs = await chrome.tabs.query({});

      const promises = tabs.map((tab) => {
        return chrome.tabs.sendMessage(tab.id, message).catch((err) => {
          console.warn(`Failed to send to tab ${tab.id}:`, err);
          return null;
        });
      });

      return Promise.allSettled(promises);
    } catch (error) {
      console.error("Error broadcasting to tabs:", error);
      return [];
    }
  }

  return {
    /**
     * Initialize the tab manager
     */
    initialize() {
      // Add tab event listeners
      chrome.tabs.onUpdated.addListener(handleTabUpdated);
      chrome.tabs.onRemoved.addListener(handleTabRemoved);

      console.log("Tab manager initialized");
    },

    /**
     * Get all active tabs
     * @returns {Array<number>} Array of active tab IDs
     */
    getActiveTabs() {
      return Array.from(activeTabs);
    },

    /**
     * Check if a tab is active
     * @param {number} tabId - ID of the tab to check
     * @returns {boolean} Whether the tab is active
     */
    isTabActive(tabId) {
      return activeTabs.has(tabId);
    },

    /**
     * Broadcast a message to all tabs
     * @param {Object} message - Message to broadcast
     * @returns {Promise<Array>} Promise that resolves with the results
     */
    broadcastToAllTabs,

    /**
     * Broadcast a command to all tabs
     * @param {string} command - Command to broadcast
     * @param {Object} payload - Command payload
     * @returns {Promise<Array>} Promise that resolves with the results
     */
    broadcastCommand(command, payload = {}) {
      return broadcastToAllTabs({
        target: "content",
        command,
        payload,
      });
    },
  };
}
