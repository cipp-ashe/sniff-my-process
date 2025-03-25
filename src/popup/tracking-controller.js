/**
 * Tracking controller for popup
 */
import { COMMANDS, createCommand } from "../utils/commands.js";

/**
 * Creates a tracking controller
 * @param {Object} options - Configuration options
 * @param {Object} options.messageBroker - Message broker instance
 * @param {Object} options.uiUpdater - UI updater instance
 * @returns {Object} Tracking controller interface
 */
export function createTrackingController({ messageBroker, uiUpdater }) {
  /**
   * Get the current tab
   * @returns {Promise<Object>} Promise that resolves with the current tab
   */
  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error("No active tab found");
    }
    return tabs[0];
  }

  /**
   * Start tracking
   * @returns {Promise<Object>} Promise that resolves with the current tab
   */
  async function startTracking() {
    try {
      console.log("Start tracking button clicked");
      console.log("Button element:", document.getElementById("startTracking"));

      // Get the current tab
      const tab = await getCurrentTab();
      console.log("Current tab:", tab);

      // Send command to background script
      console.log("Sending START_TRACKING command");
      const response = await messageBroker.sendToBackground(
        createCommand(COMMANDS.START_TRACKING)
      );
      console.log("START_TRACKING response:", response);

      // Update UI
      console.log("Updating UI state to tracking=true");
      uiUpdater.setTrackingState(true);

      // Wait a bit for the content script to initialize the new session
      setTimeout(async () => {
        try {
          const workflowData = await chrome.storage.local.get(["workflowData"]);
          if (workflowData.workflowData) {
            uiUpdater.setTrackingState(true, workflowData.workflowData);
          }
        } catch (error) {
          console.error("Error getting workflow data:", error);
        }
      }, 500);

      return tab;
    } catch (error) {
      console.error("Error starting tracking:", error);
      throw error;
    }
  }

  /**
   * Stop tracking
   * @returns {Promise<Object>} Promise that resolves with the current tab
   */
  async function stopTracking() {
    try {
      console.log("Stop tracking button clicked");

      // Get the current tab
      const tab = await getCurrentTab();

      // Send command to background script
      await messageBroker.sendToBackground(
        createCommand(COMMANDS.STOP_TRACKING)
      );

      // Update UI
      uiUpdater.setTrackingState(false);

      return tab;
    } catch (error) {
      console.error("Error stopping tracking:", error);
      throw error;
    }
  }

  /**
   * Download data
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {Promise<Object>} Promise that resolves with the current tab
   */
  async function downloadData(format = "json") {
    try {
      console.log("Download data button clicked");

      // Get the current tab
      const tab = await getCurrentTab();

      // Get current stats before downloading
      const workflowData = await chrome.storage.local.get(["workflowData"]);
      if (workflowData.workflowData) {
        uiUpdater.setTrackingState(true, workflowData.workflowData);
      }

      // Send command to background script
      await messageBroker.sendToBackground(
        createCommand(COMMANDS.DOWNLOAD_DATA, { format })
      );

      return tab;
    } catch (error) {
      console.error("Error downloading data:", error);
      throw error;
    }
  }

  /**
   * Clear tracking data
   * @returns {Promise<void>} Promise that resolves when data is cleared
   */
  async function clearData() {
    try {
      console.log("Clear data button clicked");
      console.log(
        "Clear data button element:",
        document.querySelector("button[onclick*='clearData']")
      );

      // Generate a new session ID
      const newSessionId =
        Date.now().toString(36) + Math.random().toString(36).substring(2);
      console.log("Generated new session ID:", newSessionId);

      const timestamp = new Date().toISOString();
      console.log("Generated timestamp:", timestamp);

      // Create empty workflow data
      const workflowData = {
        interactions: [],
        networkRequests: [],
        timestamp,
        sessionId: newSessionId,
      };
      console.log("Created empty workflow data:", workflowData);

      // Save to storage
      console.log("Saving to chrome.storage.local");
      await chrome.storage.local.set({ workflowData });
      console.log("Saved to chrome.storage.local");

      // Update UI
      console.log("Getting tracking state");
      const isTracking = await getTrackingState();
      console.log("Current tracking state:", isTracking);

      console.log("Updating UI");
      uiUpdater.setTrackingState(isTracking, workflowData);
      console.log("UI updated");

      console.log("Showing alert");
      alert("Tracking data cleared!");
      console.log("Alert shown");
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  }

  /**
   * Get the current tracking state
   * @returns {Promise<boolean>} Promise that resolves with the tracking state
   */
  async function getTrackingState() {
    try {
      const response = await messageBroker.sendToBackground(
        createCommand(COMMANDS.GET_STATE)
      );

      if (response && response.state && response.state.tracking) {
        return response.state.tracking.isActive;
      }

      return false;
    } catch (error) {
      console.error("Error getting tracking state:", error);
      return false;
    }
  }

  /**
   * Check if the content script is loaded
   * @returns {Promise<boolean>} Promise that resolves with whether the content script is loaded
   */
  async function checkContentScriptLoaded() {
    try {
      // Get the current tab
      const tab = await getCurrentTab();

      // First check with background script
      const bgResponse = await messageBroker.sendToBackground(
        createCommand("CHECK_CONTENT_SCRIPT_LOADED", { tabId: tab.id })
      );

      if (bgResponse && bgResponse.isLoaded) {
        return true;
      }

      // Try direct ping as fallback
      await messageBroker.sendToTab(tab.id, createCommand(COMMANDS.PING));
      return true;
    } catch (error) {
      console.warn("Content script check failed:", error);
      return false;
    }
  }

  /**
   * Initialize the tracking controller
   * @returns {Promise<void>} Promise that resolves when initialized
   */
  async function initialize() {
    try {
      // Get initial tracking state and workflow data
      const [trackingState, workflowData] = await Promise.all([
        getTrackingState(),
        chrome.storage.local.get(["workflowData"]),
      ]);

      // Update UI
      uiUpdater.setTrackingState(trackingState, workflowData.workflowData);

      // Check if content script is loaded
      const isContentScriptLoaded = await checkContentScriptLoaded();
      if (!isContentScriptLoaded) {
        console.warn("Content script not loaded");

        // Add a more visible error message
        const errorMsg = document.createElement("div");
        errorMsg.textContent =
          "Content script not loaded. Try reloading the page.";
        errorMsg.style.color = "red";
        errorMsg.style.fontWeight = "bold";
        errorMsg.style.marginTop = "10px";
        document.body.appendChild(errorMsg);

        // Add a reload button
        const reloadButton = document.createElement("button");
        reloadButton.textContent = "Reload Page";
        reloadButton.style.marginTop = "10px";
        reloadButton.style.width = "100%";
        reloadButton.style.padding = "5px";
        reloadButton.style.backgroundColor = "#f44336";
        reloadButton.style.color = "white";
        reloadButton.style.border = "none";
        reloadButton.style.borderRadius = "4px";
        reloadButton.onclick = async function () {
          const tab = await getCurrentTab();
          chrome.tabs.reload(tab.id);
          window.close(); // Close the popup
        };
        document.body.appendChild(reloadButton);
      }
    } catch (error) {
      console.error("Error initializing tracking controller:", error);
    }
  }

  return {
    initialize,
    startTracking,
    stopTracking,
    downloadData,
    clearData,
    getTrackingState,
    checkContentScriptLoaded,
  };
}
