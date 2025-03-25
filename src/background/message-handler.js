/**
 * Message handler for background script
 */
import { COMMANDS, createCommand } from "../utils/commands.js";

/**
 * Creates a message handler
 * @param {Object} options - Configuration options
 * @param {Object} options.stateManager - State manager instance
 * @param {Object} options.dataManager - Data manager instance
 * @returns {Object} Message handler interface
 */
export function createMessageHandler({ stateManager, dataManager }) {
  /**
   * Handle messages from content scripts and popups
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   * @param {Function} sendResponse - Function to send a response
   * @returns {boolean} Whether to keep the message channel open
   */
  function handleMessage(message, sender, sendResponse) {
    console.log(
      "Background received message:",
      JSON.stringify(message),
      "from:",
      JSON.stringify(sender)
    );

    try {
      // Handle command-based messages
      if (message.command) {
        return handleCommandMessage(message, sender, sendResponse);
      }

      // Handle legacy action-based messages
      if (message.action) {
        return handleActionMessage(message, sender, sendResponse);
      }

      // Invalid message format
      sendResponse({ error: "Invalid message format" });
      return false;
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ error: error.message });
      return false;
    }
  }

  /**
   * Handle command-based messages
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   * @param {Function} sendResponse - Function to send a response
   * @returns {boolean} Whether to keep the message channel open
   */
  function handleCommandMessage(message, sender, sendResponse) {
    switch (message.command) {
      case COMMANDS.CONTENT_LOADED:
        if (sender.tab?.id) {
          stateManager.registerContentScript(sender.tab.id);
        }
        sendResponse({ status: "registered" });
        return false;

      case COMMANDS.REGISTER_CONTENT_SCRIPT:
        if (sender.tab?.id) {
          stateManager.registerContentScript(sender.tab.id);
        }
        sendResponse({ status: "registered" });
        return false;

      case COMMANDS.REGISTER_POPUP:
        stateManager.registerPopup();
        sendResponse({ status: "registered" });
        return false;

      case COMMANDS.GET_STATE:
        sendResponse({ state: stateManager.getState() });
        return false;

      case COMMANDS.SET_STATE:
        stateManager.setState(message.payload);
        sendResponse({ status: "state_updated" });
        return false;

      case COMMANDS.UPDATE_STATE:
        const { path, value } = message.payload;
        stateManager.updateState(path, value);
        sendResponse({ status: "state_updated" });
        return false;

      case COMMANDS.START_TRACKING:
        handleStartTracking(sendResponse);
        return true; // Keep the message channel open

      case COMMANDS.STOP_TRACKING:
        handleStopTracking(sendResponse);
        return false;

      case COMMANDS.ADD_INTERACTION:
        handleAddInteraction(message.payload, sendResponse);
        return true; // Keep the message channel open

      case COMMANDS.ADD_NETWORK_REQUEST:
        handleAddNetworkRequest(message.payload, sendResponse);
        return true; // Keep the message channel open

      case COMMANDS.LOG_ERROR:
        console.error("Error from content script:", message.payload.error);
        sendResponse({ status: "logged" });
        return false;

      case COMMANDS.PING:
        sendResponse({ status: "ok", message: "Background script is active" });
        return false;

      case COMMANDS.DOWNLOAD_DATA:
        handleDownloadData(message.payload?.format, sendResponse);
        return true; // Keep the message channel open

      default:
        console.warn("Unknown command:", message.command);
        sendResponse({ error: "Unknown command" });
        return false;
    }
  }

  /**
   * Handle legacy action-based messages
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   * @param {Function} sendResponse - Function to send a response
   * @returns {boolean} Whether to keep the message channel open
   */
  function handleActionMessage(message, sender, sendResponse) {
    switch (message.action) {
      case "contentScriptLoaded":
        if (sender.tab?.id) {
          stateManager.registerContentScript(sender.tab.id);
        }
        sendResponse({ status: "acknowledged" });
        return false;

      case "checkContentScriptLoaded":
        // This is a legacy method, we'll just return true if the tab is registered
        sendResponse({ isLoaded: true });
        return false;

      case "getTrackingState":
        const state = stateManager.getState();
        sendResponse({ isTracking: state.tracking.isActive });
        return false;

      case "setTrackingState":
        if (message.isTracking) {
          handleStartTracking(sendResponse);
        } else {
          handleStopTracking(sendResponse);
        }
        return true; // Keep the message channel open

      case "logError":
        console.error("Error from content script:", message.error);
        sendResponse({ status: "logged" });
        return false;

      case "ping":
        sendResponse({ status: "ok", message: "Background script is active" });
        return false;

      default:
        console.warn("Unknown action:", message.action);
        sendResponse({ error: "Unknown action" });
        return false;
    }
  }

  /**
   * Handle start tracking command
   * @param {Function} sendResponse - Function to send a response
   */
  async function handleStartTracking(sendResponse) {
    console.log("handleStartTracking called");
    try {
      // Generate a new session ID
      const sessionId =
        Date.now().toString(36) + Math.random().toString(36).substring(2);
      console.log("Generated session ID:", sessionId);

      // Update state
      console.log("Updating state with tracking active");
      stateManager.updateState("tracking", {
        isActive: true,
        sessionId,
        startTime: new Date().toISOString(),
      });
      console.log("State updated");

      // Clear existing interactions
      console.log("Clearing existing interactions");
      await dataManager.clearInteractions();
      console.log("Interactions cleared");

      console.log("Sending response with status tracking_started");
      sendResponse({ status: "tracking_started", sessionId });
      console.log("Response sent");
    } catch (error) {
      console.error("Error starting tracking:", error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle stop tracking command
   * @param {Function} sendResponse - Function to send a response
   */
  function handleStopTracking(sendResponse) {
    try {
      // Update state
      stateManager.updateState("tracking.isActive", false);

      sendResponse({ status: "tracking_stopped" });
    } catch (error) {
      console.error("Error stopping tracking:", error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle add interaction command
   * @param {Object} interaction - Interaction data
   * @param {Function} sendResponse - Function to send a response
   */
  async function handleAddInteraction(interaction, sendResponse) {
    try {
      // Add the interaction
      await dataManager.addInteraction(interaction);

      // Update stats
      const stats = dataManager.getStats();
      stateManager.updateState("stats", {
        interactionCount: stats.interactionCount,
        networkRequestCount: stats.networkRequestCount,
      });

      sendResponse({ status: "interaction_added" });
    } catch (error) {
      console.error("Error adding interaction:", error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle add network request command
   * @param {Object} request - Network request data
   * @param {Function} sendResponse - Function to send a response
   */
  async function handleAddNetworkRequest(request, sendResponse) {
    try {
      // Add the network request
      await dataManager.addNetworkRequest(request);

      // Update stats
      const stats = dataManager.getStats();
      stateManager.updateState("stats", {
        interactionCount: stats.interactionCount,
        networkRequestCount: stats.networkRequestCount,
      });

      sendResponse({ status: "network_request_added" });
    } catch (error) {
      console.error("Error adding network request:", error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle download data command
   * @param {string} format - Export format ('json' or 'csv')
   * @param {Function} sendResponse - Function to send a response
   */
  function handleDownloadData(format = "json", sendResponse) {
    try {
      // Get the data
      let data;
      let mimeType;
      let filename;

      if (format === "csv") {
        data = dataManager.exportAsCsv();
        mimeType = "text/csv";
        filename = `workflow-data-${new Date().toISOString()}.csv`;
      } else {
        data = dataManager.exportAsJson();
        mimeType = "application/json";
        filename = `workflow-data-${new Date().toISOString()}.json`;
      }

      // Create a download URL
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);

      // Trigger the download
      chrome.downloads.download({
        url,
        filename,
        saveAs: true,
      });

      sendResponse({ status: "download_initiated" });
    } catch (error) {
      console.error("Error downloading data:", error);
      sendResponse({ error: error.message });
    }
  }

  return {
    /**
     * Initialize the message handler
     */
    initialize() {
      // Add message listener
      chrome.runtime.onMessage.addListener(handleMessage);

      console.log("Message handler initialized");
    },
  };
}
