console.log("Popup script loaded - v2");

// Initialize tracking state from storage
let isTracking = false;
let workflowDataStats = { interactions: 0, networkRequests: 0 };

// Function to update UI based on tracking state
function updateUI(tracking, stats, sessionId, lastActivity) {
  console.log(
    "Updating UI, tracking state:",
    tracking,
    "sessionId:",
    sessionId,
    "lastActivity:",
    lastActivity
  );
  document.getElementById("startTracking").disabled = tracking;
  document.getElementById("stopTracking").disabled = !tracking;
  document.getElementById("downloadData").disabled =
    !tracking && !document.getElementById("downloadData").disabled;

  let statusText = tracking
    ? `Tracking... (${stats.interactions} interactions, ${stats.networkRequests} requests)`
    : "Not tracking";

  // Add session ID if available
  if (tracking && sessionId) {
    statusText += `\nSession: ${sessionId}`;
  }

  // Add last activity timestamp if available
  if (tracking && lastActivity) {
    const activityTime = new Date(lastActivity).toLocaleTimeString();
    statusText += `\nLast activity: ${activityTime}`;
  }

  document.getElementById("status").textContent = statusText;

  // Add a visible alert for debugging
  if (tracking) {
    document.getElementById("status").style.color = "#4CAF50";
    document.getElementById("status").style.fontWeight = "bold";
  } else {
    document.getElementById("status").style.color = "#666";
    document.getElementById("status").style.fontWeight = "normal";
  }

  // Make status a multi-line element
  document.getElementById("status").style.whiteSpace = "pre-line";
}

// Function to get the last activity timestamp from workflowData
function getLastActivityTimestamp(workflowData) {
  if (!workflowData) return null;

  let lastTimestamp = null;

  // Check interactions
  if (workflowData.interactions && workflowData.interactions.length > 0) {
    const lastInteraction =
      workflowData.interactions[workflowData.interactions.length - 1];
    lastTimestamp = lastInteraction.timestamp;
  }

  // Check network requests
  if (workflowData.networkRequests && workflowData.networkRequests.length > 0) {
    const lastRequest =
      workflowData.networkRequests[workflowData.networkRequests.length - 1];
    const requestTimestamp = lastRequest.timestamp;

    // Update if this is more recent than the interaction timestamp
    if (
      !lastTimestamp ||
      new Date(requestTimestamp) > new Date(lastTimestamp)
    ) {
      lastTimestamp = requestTimestamp;
    }
  }

  return lastTimestamp;
}

// Load tracking state when popup opens
chrome.storage.local.get(["isTracking", "workflowData"], function (result) {
  console.log("Loaded tracking state from storage:", result);
  isTracking = result.isTracking || false;
  let sessionId = null;
  let lastActivity = null;

  // Calculate stats if workflowData exists
  if (result.workflowData) {
    workflowDataStats = {
      interactions: result.workflowData.interactions?.length || 0,
      networkRequests: result.workflowData.networkRequests?.length || 0,
    };
    sessionId = result.workflowData.sessionId;
    lastActivity = getLastActivityTimestamp(result.workflowData);
    console.log(
      "Loaded workflowData stats:",
      workflowDataStats,
      "sessionId:",
      sessionId,
      "lastActivity:",
      lastActivity
    );
  }

  // Update UI with tracking state, stats, and session ID
  updateUI(isTracking, workflowDataStats, sessionId, lastActivity);
});

document.getElementById("startTracking").addEventListener("click", async () => {
  console.log("Start tracking button clicked");
  isTracking = true;

  // Save state to storage
  chrome.storage.local.set({ isTracking: true }, function () {
    console.log("Saved tracking state to storage");
  });

  // Combine chrome.tabs.query calls for efficiency
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    console.log("Sending startTracking message to tab:", tabId);

    // First send the startTracking message
    chrome.tabs.sendMessage(tabId, { action: "startTracking" }, (response) => {
      // Log any error that might occur during message sending
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        alert("Error: " + chrome.runtime.lastError.message);
      } else {
        console.log("Message sent successfully", response);

        // Wait a bit for the content script to initialize the new session
        setTimeout(() => {
          chrome.storage.local.get(["workflowData"], function (result) {
            if (result.workflowData) {
              const sessionId = result.workflowData.sessionId;
              const lastActivity = getLastActivityTimestamp(
                result.workflowData
              );
              console.log(
                "Got new sessionId after starting tracking:",
                sessionId
              );
              updateUI(true, workflowDataStats, sessionId, lastActivity);
            } else {
              updateUI(true, workflowDataStats, null, null);
            }
          });
        }, 500);
      }
    });
  });
});

document.getElementById("stopTracking").addEventListener("click", () => {
  console.log("Stop tracking button clicked");
  isTracking = false;

  // Save state to storage
  chrome.storage.local.set({ isTracking: false }, function () {
    console.log("Saved tracking state to storage");
  });

  updateUI(false, workflowDataStats, null, null);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log("Sending stopTracking message to tab:", tabs[0].id);
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "stopTracking" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          alert("Error: " + chrome.runtime.lastError.message);
        } else {
          console.log("Message sent successfully", response);
        }
      }
    );
  });
});

document.getElementById("downloadData").addEventListener("click", () => {
  console.log("Download data button clicked");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Get current stats before downloading
    chrome.storage.local.get(["workflowData"], function (result) {
      if (result.workflowData) {
        workflowDataStats = {
          interactions: result.workflowData.interactions?.length || 0,
          networkRequests: result.workflowData.networkRequests?.length || 0,
        };
        const lastActivity = getLastActivityTimestamp(result.workflowData);
        console.log(
          "Updated workflowData stats before download:",
          workflowDataStats,
          "lastActivity:",
          lastActivity
        );

        // Update UI with latest stats
        updateUI(
          isTracking,
          workflowDataStats,
          result.workflowData.sessionId,
          lastActivity
        );
      }
    });

    console.log("Sending downloadData message to tab:", tabs[0].id);
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "downloadData" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          alert("Error: " + chrome.runtime.lastError.message);
        } else {
          console.log("Message sent successfully", response);
        }
      }
    );
  });
});

// Add a clear data button
const clearDataButton = document.createElement("button");
clearDataButton.textContent = "Clear Tracking Data";
clearDataButton.style.marginTop = "10px";
clearDataButton.style.width = "100%";
clearDataButton.style.padding = "5px";
clearDataButton.onclick = function () {
  // Generate a new session ID for the cleared data
  const newSessionId =
    Date.now().toString(36) + Math.random().toString(36).substr(2);

  const timestamp = new Date().toISOString();

  chrome.storage.local.set(
    {
      workflowData: {
        interactions: [],
        networkRequests: [],
        timestamp: timestamp,
        sessionId: newSessionId,
      },
    },
    function () {
      alert("Tracking data cleared!");
      workflowDataStats = { interactions: 0, networkRequests: 0 };
      updateUI(
        isTracking,
        workflowDataStats,
        isTracking ? newSessionId : null,
        isTracking ? timestamp : null
      );
    }
  );
};
// Add a debug button to show console logs directly in the popup
const debugDiv = document.createElement("div");
debugDiv.style.marginTop = "10px";
debugDiv.style.padding = "5px";
debugDiv.style.border = "1px solid #ccc";
debugDiv.style.backgroundColor = "#f5f5f5";
debugDiv.style.maxHeight = "100px";
debugDiv.style.overflow = "auto";
debugDiv.style.fontSize = "10px";
debugDiv.style.display = "none";
document.body.appendChild(debugDiv);

function addDebugMessage(message) {
  const line = document.createElement("div");
  line.textContent = new Date().toLocaleTimeString() + ": " + message;
  debugDiv.appendChild(line);
  debugDiv.scrollTop = debugDiv.scrollHeight;
}

// Override console.log for the popup
const originalConsoleLog = console.log;
console.log = function () {
  originalConsoleLog.apply(console, arguments);
  addDebugMessage(Array.from(arguments).join(" "));
};

const originalConsoleError = console.error;
console.error = function () {
  originalConsoleError.apply(console, arguments);
  const errorMsg = document.createElement("div");
  errorMsg.textContent =
    new Date().toLocaleTimeString() +
    " ERROR: " +
    Array.from(arguments).join(" ");
  errorMsg.style.color = "red";
  debugDiv.appendChild(errorMsg);
  debugDiv.scrollTop = debugDiv.scrollHeight;
};

// Add debug toggle button
const debugButton = document.createElement("button");
debugButton.textContent = "Show Debug";
debugButton.style.marginTop = "10px";
debugButton.style.width = "100%";
debugButton.style.padding = "5px";
debugButton.style.backgroundColor = "#f0f0f0";
debugButton.style.border = "1px solid #ccc";
debugButton.style.borderRadius = "4px";
debugButton.onclick = function () {
  if (debugDiv.style.display === "none") {
    debugDiv.style.display = "block";
    debugButton.textContent = "Hide Debug";
  } else {
    debugDiv.style.display = "none";
    debugButton.textContent = "Show Debug";
  }
};
document.body.appendChild(debugButton);

document.body.appendChild(clearDataButton);
// Check if the popup is connected to a tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length === 0) {
    console.error("No active tab found");
    document.getElementById("status").textContent = "Error: No active tab";
    document.getElementById("startTracking").disabled = true;
  } else {
    console.log("Connected to tab:", tabs[0].id);

    // First check with the background script if it knows the content script is loaded
    chrome.runtime.sendMessage(
      {
        action: "checkContentScriptLoaded",
        tabId: tabs[0].id,
      },
      (response) => {
        if (response && response.isLoaded) {
          console.log("Background confirms content script is loaded");
          // Content script is loaded according to background, we're good to go
        } else {
          console.log(
            "Background doesn't know if content script is loaded, trying direct ping"
          );
          // Try to ping the content script directly as a fallback
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "ping" },
            (response) => {
              if (chrome.runtime.lastError) {
                console.warn(
                  "Content script may not be loaded:",
                  chrome.runtime.lastError
                );
                document.getElementById("status").textContent =
                  "Warning: Content script may not be loaded";

                // Add a more visible error message
                const errorMsg = document.createElement("div");
                errorMsg.textContent =
                  "Content script not loaded. Try reloading the page.";
                errorMsg.style.color = "red";
                errorMsg.style.fontWeight = "bold";
                errorMsg.style.marginTop = "10px";
                document.body.insertBefore(errorMsg, debugButton);

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
                reloadButton.onclick = function () {
                  chrome.tabs.reload(tabs[0].id);
                  window.close(); // Close the popup
                };
                document.body.insertBefore(reloadButton, debugButton);
              } else {
                console.log("Content script is loaded and responding");
              }
            }
          );
        }
      }
    );
  }
});
