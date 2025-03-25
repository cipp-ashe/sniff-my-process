// DIAGNOSTIC VERSION - v2
console.log("DIAGNOSTIC: Content script loaded and initialized - v2");

// Generate a unique session ID
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Initialize tracking state and workflowData from storage
let workflowData = {
  interactions: [],
  networkRequests: [],
  timestamp: null,
  sessionId: generateSessionId(), // Add a session ID to group related interactions
};

let isTracking = false;
let clickEventListener = null;
let inputEventListener = null;

// Function to load data from storage
function loadFromStorage() {
  console.log("Loading data from storage");
  chrome.storage.local.get(["isTracking", "workflowData"], (result) => {
    isTracking = result.isTracking || false;

    if (result.workflowData) {
      workflowData = result.workflowData;
      console.log("Restored workflowData from storage:", workflowData);
    }

    if (isTracking) {
      console.log("Tracking was active, re-attaching event listeners");
      addEventListeners();
    }
  });
}

// Load persisted data when content script initializes
loadFromStorage();

// Add visibility change listener to rehydrate when switching tabs
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    console.log("Tab became visible, rehydrating data from storage");
    loadFromStorage();
  }
});

// Also rehydrate on DOMContentLoaded to ensure data is fresh
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded event, rehydrating data from storage");
  loadFromStorage();
});

// Add a global event listener for all clicks on the document
document.addEventListener(
  "click",
  function (e) {
    console.log("DIAGNOSTIC: Global click event detected on:", e.target);
  },
  true
);

// Add a global event listener for all mousemove events
document.addEventListener(
  "mousemove",
  function (e) {
    // Only log every 1000ms to avoid flooding the console
    if (
      !window._lastMouseMoveLog ||
      Date.now() - window._lastMouseMoveLog > 1000
    ) {
      console.log("DIAGNOSTIC: Mousemove detected at:", e.clientX, e.clientY);
      window._lastMouseMoveLog = Date.now();
    }
  },
  true
);

// DIAGNOSTIC: Log network requests in console
// Note: The actual fetch interception is handled by the tracking code below

// Intercept XMLHttpRequest
const diagnosticOriginalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url) {
  console.log("DIAGNOSTIC: XHR intercepted:", method, url);
  return diagnosticOriginalXHROpen.apply(this, arguments);
};

// Immediately notify the background script that we're loaded
try {
  chrome.runtime.sendMessage({
    action: "contentScriptLoaded",
    tabId: window.location.href,
  });
} catch (e) {
  console.error("Failed to notify background script:", e);
}

// Utility function to get unique selector
function getSelector(element) {
  // Add safety check for null or undefined elements
  if (!element) {
    console.error("getSelector called with null/undefined element");
    return "unknown";
  }

  if (element.id) {
    return `#${element.id}`;
  }

  if (element.className) {
    return `.${element.className.split(" ").join(".")}`;
  }

  // Safety check for elements without a parent node
  if (!element.parentNode) {
    return element.tagName || "UNKNOWN";
  }

  let path = [];
  while (element.parentNode) {
    let siblings = element.parentNode.children;
    let index = Array.from(siblings).indexOf(element) + 1;
    path.unshift(`${element.tagName}:nth-child(${index})`);
    element = element.parentNode;
  }

  return path.join(" > ");
}

// Track clicks
function trackClick(e) {
  console.log("Click event captured!", e.target);
  const interaction = {
    type: "click",
    timestamp: new Date().toISOString(),
    selector: getSelector(e.target),
    text: e.target.textContent?.trim(),
    tagName: e.target.tagName.toLowerCase(),
  };

  console.log("Adding click interaction to workflowData:", interaction);
  workflowData.interactions.push(interaction);
  // Persist data to storage
  chrome.storage.local.set({ workflowData });
}

// Track input changes
function trackInput(e) {
  console.log("Input event captured!", e.target);
  const interaction = {
    type: "input",
    timestamp: new Date().toISOString(),
    selector: getSelector(e.target),
    value: e.target.value ? "[REDACTED]" : "", // Don't store actual input values
    inputType: e.target.type,
  };

  console.log("Adding input interaction to workflowData:", interaction);
  workflowData.interactions.push(interaction);
  // Persist data to storage
  chrome.storage.local.set({ workflowData });
}

// Track network requests using Fetch API
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const request = args[0];
  const startTime = new Date().toISOString();
  const url = typeof request === "string" ? request : request.url;
  console.log("Fetch request intercepted:", url);

  if (!isTracking) {
    console.log("Fetch detected but tracking is off");
    return originalFetch.apply(this, args);
  }

  try {
    const response = await originalFetch.apply(this, args);
    const networkRequest = {
      type: "fetch",
      url: url,
      method: typeof request === "string" ? "GET" : request.method || "GET",
      timestamp: startTime,
      status: response.status,
      statusText: response.statusText,
    };
    console.log("Adding fetch request to workflowData:", networkRequest);
    workflowData.networkRequests.push(networkRequest);
    // Persist data to storage
    chrome.storage.local.set({ workflowData });
    return response;
  } catch (error) {
    const networkRequest = {
      type: "fetch",
      url: typeof request === "string" ? request : request.url,
      method: typeof request === "string" ? "GET" : request.method || "GET",
      timestamp: startTime,
      error: error.message,
    };

    workflowData.networkRequests.push(networkRequest);
    // Persist data to storage
    chrome.storage.local.set({ workflowData });
    throw error;
  }
};

// Track XHR requests
const XHR = XMLHttpRequest.prototype;
const originalOpen = XHR.open;
const originalSend = XHR.send;

XHR.open = function (method, url) {
  if (isTracking && url) {
    console.log("XHR open intercepted:", method, url);
    this._trackingData = {
      method,
      url,
      startTime: new Date().toISOString(),
    };
  }
  diagnosticOriginalXHROpen.apply(this, arguments);
};

XHR.send = function () {
  if (isTracking && this._trackingData) {
    this.addEventListener("load", function () {
      console.log("XHR load event:", this._trackingData.url);
      const networkRequest = {
        type: "xhr",
        ...this._trackingData,
        status: this.status,
        statusText: this.statusText,
      };
      workflowData.networkRequests.push(networkRequest);
      // Persist data to storage
      chrome.storage.local.set({ workflowData });
    });

    this.addEventListener("error", function () {
      console.log("XHR error event:", this._trackingData.url);
      const networkRequest = {
        type: "xhr",
        ...this._trackingData,
        error: "Request failed",
      };
      workflowData.networkRequests.push(networkRequest);
      // Persist data to storage
      chrome.storage.local.set({ workflowData });
    });
  }
  originalSend.apply(this, arguments);
};

// Report errors to background script
function reportError(error) {
  console.error("Content script error:", error);
  try {
    chrome.runtime.sendMessage({
      action: "logError",
      error: error.toString(),
    });
  } catch (e) {
    console.error("Failed to report error:", e);
  }
}

// Shared function to add event listeners
function addEventListeners() {
  // Don't add listeners if they're already active
  if (clickEventListener) {
    console.log("Event listeners already active");
    return;
  }

  console.log("Adding event listeners with capture=true");

  // Set up click event listener
  clickEventListener = function (e) {
    console.log("Raw click event detected:", e.target);
    trackClick(e);
  };

  // Set up input event listener
  inputEventListener = trackInput;

  // Add listeners to both document and documentElement for maximum coverage
  document.addEventListener("click", clickEventListener, true);
  document.documentElement.addEventListener("click", clickEventListener, true);
  document.addEventListener("input", inputEventListener, true);
  document.documentElement.addEventListener("input", inputEventListener, true);
  console.log("Event listeners added for click and input");
}

// DIAGNOSTIC: Log when we reach this point in the script
console.log("DIAGNOSTIC: Content script fully initialized");

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  try {
    switch (request.action) {
      case "ping":
        console.log("Received ping, sending response");
        sendResponse({ status: "ok", message: "Content script is active" });
        break;
      case "startTracking":
        console.log("Starting tracking...");
        isTracking = true;
        workflowData = {
          interactions: [],
          networkRequests: [],
          timestamp: new Date().toISOString(),
          sessionId: generateSessionId(), // Generate a new session ID when starting tracking
        };

        // Save tracking state to storage
        chrome.storage.local.set({ isTracking, workflowData });

        console.log(
          "Tracking started, workflowData initialized:",
          workflowData
        );

        addEventListeners();
        sendResponse({ status: "tracking_started" });
        break;

      case "stopTracking":
        console.log("Stopping tracking...");
        isTracking = false;
        // We need to remove the same function reference we added
        console.log("Attempting to remove event listeners");
        try {
          // Since we're now using an anonymous function wrapper for click events,
          // we need to be careful about how we remove it
          if (clickEventListener) {
            document.removeEventListener("click", clickEventListener, true);
            console.log("Click event listener removed");
          }

          // Also remove from documentElement
          if (clickEventListener) {
            document.documentElement.removeEventListener(
              "click",
              clickEventListener,
              true
            );
          }
        } catch (e) {
          console.error("Error removing click listener:", e);
        }

        // Clear references
        clickEventListener = null;
        inputEventListener = null;
        document.removeEventListener("input", inputEventListener, true);
        console.log("Tracking stopped, event listeners removed");
        sendResponse({ status: "tracking_stopped" });
        break;

      case "downloadData":
        console.log("Downloading data...");
        // Always pull fresh data from storage before generating the file
        chrome.storage.local.get(["workflowData"], (result) => {
          const data = result.workflowData || {
            interactions: [],
            networkRequests: [],
            timestamp: new Date().toISOString(),
            sessionId: generateSessionId(),
          };

          console.log("Retrieved fresh data from storage:", data);

          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `workflow-${new Date().toISOString()}.json`;
          a.click();
          URL.revokeObjectURL(url);

          console.log("Data downloaded");
          sendResponse({ status: "data_downloaded" });
        });
        // Return true to indicate we'll respond asynchronously
        return true;
      // Note: We don't need a break here since we're returning

      default:
        console.log("Unknown action:", request.action);
        break;
    }
  } catch (error) {
    console.error("Error handling message:", error);
    reportError(error);
    sendResponse({ status: "error", message: error.toString() });
  }

  // Return true to indicate we'll respond asynchronously (keeps the message channel open)
  return true;
});
