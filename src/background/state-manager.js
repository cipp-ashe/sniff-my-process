/**
 * State manager for background script
 */

/**
 * Creates a state manager
 * @param {Object} options - Configuration options
 * @param {Object} options.storage - Storage manager instance
 * @returns {Object} State manager interface
 */
export function createStateManager({ storage }) {
  // In-memory state
  let state = {
    tracking: {
      isActive: false,
      sessionId: null,
      startTime: null,
    },
    stats: {
      interactionCount: 0,
      networkRequestCount: 0,
    },
  };

  // Context-specific listeners
  const listeners = {
    popup: new Set(),
    content: new Set(),
    internal: new Set(),
  };

  /**
   * Notify listeners of state changes
   * @param {string} context - Context to notify ('all', 'popup', 'content', or 'internal')
   * @param {Object} payload - Payload to send to listeners
   */
  function notifyListeners(context, payload) {
    if (context === "all" || context === "internal") {
      listeners.internal.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error("Error in internal state listener:", error);
        }
      });
    }

    if (context === "all" || context === "popup") {
      chrome.runtime
        .sendMessage({
          target: "popup",
          command: "STATE_UPDATE",
          payload,
        })
        .catch(() => {
          // Popup might be closed, which is expected
        });
    }

    if (context === "all" || context === "content") {
      listeners.content.forEach((tabId) => {
        chrome.tabs
          .sendMessage(tabId, {
            target: "content",
            command: "STATE_UPDATE",
            payload,
          })
          .catch((err) => {
            // Tab might be closed or not have content script
            console.warn(`Failed to send to tab ${tabId}:`, err);
            // Remove invalid tab IDs
            listeners.content.delete(tabId);
          });
      });
    }
  }

  return {
    /**
     * Initialize the state manager
     * @returns {Promise<Object>} Promise that resolves with the initialized state
     */
    async initialize() {
      try {
        const savedState = await storage.load("appState");
        if (savedState) {
          state = { ...state, ...savedState };
          notifyListeners("internal", state);
        } else {
          // Save initial state to storage
          await storage.save("appState", state);
        }
        return state;
      } catch (error) {
        console.error("Error initializing state:", error);
        return state;
      }
    },

    /**
     * Get the current state
     * @returns {Object} Current state
     */
    getState() {
      return { ...state };
    },

    /**
     * Update the state
     * @param {Object} newState - New state to merge with current state
     * @param {string} context - Context to notify ('all', 'popup', 'content', or 'internal')
     * @returns {Object} Updated state
     */
    setState(newState, context = "all") {
      // Update state
      state = { ...state, ...newState };

      // Persist to storage
      storage.save("appState", state).catch((error) => {
        console.error("Error saving state to storage:", error);
      });

      // Notify appropriate listeners
      notifyListeners(context, state);

      return state;
    },

    /**
     * Update a specific part of the state
     * @param {string} path - Path to the property to update (e.g., 'tracking.isActive')
     * @param {*} value - New value
     * @param {string} context - Context to notify ('all', 'popup', 'content', or 'internal')
     * @returns {Object} Updated state
     */
    updateState(path, value, context = "all") {
      const newState = { ...state };

      // Handle dot notation paths
      const parts = path.split(".");
      let current = newState;

      // Navigate to the nested property
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]] = { ...current[parts[i]] };
      }

      // Set the value
      current[parts[parts.length - 1]] = value;

      return this.setState(newState, context);
    },

    /**
     * Register a content script tab
     * @param {number} tabId - ID of the tab to register
     */
    registerContentScript(tabId) {
      listeners.content.add(tabId);

      // Send initial state
      chrome.tabs
        .sendMessage(tabId, {
          target: "content",
          command: "STATE_UPDATE",
          payload: state,
        })
        .catch((err) => {
          console.warn(`Failed to send initial state to tab ${tabId}:`, err);
        });
    },

    /**
     * Register a popup
     */
    registerPopup() {
      // Send initial state
      chrome.runtime
        .sendMessage({
          target: "popup",
          command: "STATE_UPDATE",
          payload: state,
        })
        .catch((err) => {
          console.warn("Failed to send initial state to popup:", err);
        });
    },

    /**
     * Subscribe to internal state changes
     * @param {Function} listener - Listener function
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
      listeners.internal.add(listener);

      // Call immediately with current state
      listener(state);

      // Return unsubscribe function
      return () => listeners.internal.delete(listener);
    },
  };
}
