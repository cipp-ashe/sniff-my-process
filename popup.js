console.log("Popup script loaded");

// Initialize tracking state from storage
let isTracking = false;

// Function to update UI based on tracking state
function updateUI(tracking) {
  console.log("Updating UI, tracking state:", tracking);
  document.getElementById("startTracking").disabled = tracking;
  document.getElementById("stopTracking").disabled = !tracking;
  document.getElementById("downloadData").disabled =
    !tracking && !document.getElementById("downloadData").disabled;
  document.getElementById("status").textContent = tracking
    ? "Tracking..."
    : "Not tracking";

  // Add a visible alert for debugging
  if (tracking) {
    document.getElementById("status").style.color = "#4CAF50";
    document.getElementById("status").style.fontWeight = "bold";
  } else {
    document.getElementById("status").style.color = "#666";
    document.getElementById("status").style.fontWeight = "normal";
  }
}

// Load tracking state when popup opens
chrome.storage.local.get(["isTracking"], function (result) {
  console.log("Loaded tracking state from storage:", result);
  isTracking = result.isTracking || false;
  updateUI(isTracking);
});

document.getElementById("startTracking").addEventListener("click", async () => {
  console.log("Start tracking button clicked");
  isTracking = true;

  // Save state to storage
  chrome.storage.local.set({ isTracking: true }, function () {
    console.log("Saved tracking state to storage");
  });

  updateUI(true);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log("Sending startTracking message to tab:", tabs[0].id);
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "startTracking" },
      (response) => {
        // Log any error that might occur during message sending
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

document.getElementById("stopTracking").addEventListener("click", () => {
  console.log("Stop tracking button clicked");
  isTracking = false;

  // Save state to storage
  chrome.storage.local.set({ isTracking: false }, function () {
    console.log("Saved tracking state to storage");
  });

  updateUI(false);

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
