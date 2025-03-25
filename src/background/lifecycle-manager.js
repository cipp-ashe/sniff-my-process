/**
 * Lifecycle manager for background script
 */

/**
 * Creates a lifecycle manager
 * @param {Object} options - Configuration options
 * @param {Object} options.stateManager - State manager instance
 * @param {Object} options.storage - Storage manager instance
 * @returns {Object} Lifecycle manager interface
 */
export function createLifecycleManager({ stateManager, storage }) {
  /**
   * Handle extension installed event
   * @param {Object} details - Installation details
   */
  function handleInstalled(details) {
    console.log("Extension installed/updated:", details.reason);

    if (details.reason === "install") {
      // Initialize default state
      stateManager.setState({
        tracking: {
          isActive: false,
          sessionId: null,
          startTime: null,
        },
        stats: {
          interactionCount: 0,
          networkRequestCount: 0,
        },
      });
    }
  }

  /**
   * Handle browser startup event
   */
  function handleStartup() {
    console.log("Browser started");

    // Load state from storage
    storage.load("appState").then((savedState) => {
      if (savedState) {
        // If tracking was active, it should be stopped on browser restart
        if (savedState.tracking && savedState.tracking.isActive) {
          savedState.tracking.isActive = false;
        }

        stateManager.setState(savedState);
      }
    });
  }

  return {
    /**
     * Initialize the lifecycle manager
     */
    initialize() {
      // Listen for extension install/update
      chrome.runtime.onInstalled.addListener(handleInstalled);

      // Listen for browser startup
      chrome.runtime.onStartup.addListener(handleStartup);

      console.log("Lifecycle manager initialized");
    },
  };
}
