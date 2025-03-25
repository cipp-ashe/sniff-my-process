/**
 * Background communication module for content script
 */
import { COMMANDS, createCommand } from "../utils/commands.js";

/**
 * Creates a background communication manager
 * @param {Object} options - Configuration options
 * @param {Object} options.eventBus - Event bus instance
 * @param {Object} options.messageBroker - Message broker instance
 * @returns {Object} Background communication interface
 */
export function createBackgroundCommunication({ eventBus, messageBroker }) {
  // Track message listener removal function
  let removeListener = null;

  /**
   * Initialize communication with background script
   */
  function initialize() {
    console.log("Initializing background communication");

    // Notify background that content script is loaded
    messageBroker
      .sendToBackground(
        createCommand(COMMANDS.CONTENT_LOADED, {
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString(),
        })
      )
      .catch((error) => {
        console.error("Failed to notify background:", error);
      });

    // Set up message listener
    removeListener = messageBroker.addListener((message, sender) => {
      console.log("Content script received message:", message);

      // Handle commands from background or popup
      if (message.command) {
        switch (message.command) {
          case COMMANDS.START_TRACKING:
            eventBus.emit("trackingStateChanged", { isTracking: true });
            return { status: "tracking_started" };

          case COMMANDS.STOP_TRACKING:
            eventBus.emit("trackingStateChanged", { isTracking: false });
            return { status: "tracking_stopped" };

          case COMMANDS.DOWNLOAD_DATA:
            eventBus.emit("downloadData", message.payload);
            return { status: "download_initiated" };

          case COMMANDS.PING:
            return { status: "ok", message: "Content script is active" };

          case COMMANDS.STATE_UPDATE:
            eventBus.emit("stateUpdated", message.payload);
            return { status: "state_updated" };

          default:
            console.warn("Unknown command:", message.command);
            return { error: "Unknown command" };
        }
      }

      // Handle legacy message format (action property)
      if (message.action) {
        switch (message.action) {
          case "startTracking":
            eventBus.emit("trackingStateChanged", { isTracking: true });
            return { status: "tracking_started" };

          case "stopTracking":
            eventBus.emit("trackingStateChanged", { isTracking: false });
            return { status: "tracking_stopped" };

          case "downloadData":
            eventBus.emit("downloadData");
            return { status: "download_initiated" };

          case "ping":
            console.log("Received ping, sending response");
            return { status: "ok", message: "Content script is active" };

          default:
            console.warn("Unknown action:", message.action);
            return { error: "Unknown action" };
        }
      }

      return { error: "Invalid message format" };
    });
  }

  /**
   * Report an error to the background script
   * @param {Error} error - Error to report
   */
  function reportError(error) {
    return messageBroker
      .sendToBackground(
        createCommand(COMMANDS.LOG_ERROR, {
          error: error.toString(),
          stack: error.stack,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        })
      )
      .catch((err) => {
        console.error("Failed to report error to background:", err);
      });
  }

  /**
   * Get the current tracking state from the background script
   * @returns {Promise<boolean>} Promise that resolves with the tracking state
   */
  function getTrackingState() {
    return messageBroker
      .sendToBackground(createCommand(COMMANDS.GET_STATE))
      .then((response) => {
        if (response && response.state && response.state.tracking) {
          return response.state.tracking.isActive;
        }
        return false;
      })
      .catch((err) => {
        console.error("Failed to get tracking state:", err);
        return false;
      });
  }

  /**
   * Clean up resources
   */
  function cleanup() {
    if (removeListener) {
      removeListener();
      removeListener = null;
    }
  }

  return {
    initialize,
    reportError,
    getTrackingState,
    cleanup,
  };
}
