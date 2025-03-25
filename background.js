// Service worker for handling background tasks
console.log("Background script loaded");

// Initialize tracking state
let isTracking = false;

// Load tracking state when background script starts
chrome.storage.local.get(["isTracking"], function (result) {
  console.log("Loaded tracking state from storage:", result);
  isTracking = result.isTracking || false;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Workflow Tracker installed");
  // Initialize storage with default values
  chrome.storage.local.set({ isTracking: false }, function () {
    console.log("Initialized tracking state in storage");
  });
});

// Keep track of tabs with content scripts loaded
const loadedTabs = new Set();

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message, "from:", sender);

  if (message.action === "contentScriptLoaded") {
    console.log("Content script loaded in tab:", sender.tab?.id, message.tabId);
    if (sender.tab?.id) {
      loadedTabs.add(sender.tab.id);
    }
    sendResponse({ status: "acknowledged" });
  }

  if (message.action === "checkContentScriptLoaded") {
    const tabId = message.tabId;
    const isLoaded = loadedTabs.has(tabId);
    console.log(
      "Checking if content script is loaded in tab:",
      tabId,
      "Result:",
      isLoaded
    );
    sendResponse({ isLoaded });
  }

  if (message.action === "logError") {
    console.error("Error from content script:", message.error);
  }

  // Handle tracking state changes
  if (message.action === "getTrackingState") {
    console.log("Sending tracking state:", isTracking);
    sendResponse({ isTracking: isTracking });
  }

  if (message.action === "setTrackingState") {
    isTracking = message.isTracking;
    console.log("Updated tracking state:", isTracking);

    // Save to storage
    chrome.storage.local.set({ isTracking: isTracking }, function () {
      console.log("Saved tracking state to storage");
    });

    // Broadcast to all tabs
    chrome.tabs.query({}, function (tabs) {
      for (let tab of tabs) {
        try {
          chrome.tabs
            .sendMessage(tab.id, {
              action: isTracking ? "startTracking" : "stopTracking",
              fromBackground: true,
            })
            .catch((err) => console.log("Error sending to tab", tab.id, err));
        } catch (e) {
          console.error("Error broadcasting to tab", tab.id, e);
        }
      }
    });

    sendResponse({ success: true });
  }

  // Return true to indicate we'll respond asynchronously
  return true;
});

// Add listener for content script connection issues
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    console.log("Tab updated:", tabId);

    // If tracking is active, tell the new tab to start tracking
    if (isTracking) {
      setTimeout(() => {
        try {
          chrome.tabs
            .sendMessage(tabId, {
              action: "startTracking",
              fromBackground: true,
            })
            .catch((err) =>
              console.log("Error sending to new tab", tabId, err)
            );
        } catch (e) {
          console.error("Error sending to new tab", tabId, e);
        }
      }, 1000); // Give the content script time to initialize
    }
  }
});
