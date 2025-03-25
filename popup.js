console.log("Popup script loaded");

let isTracking = false;

document.getElementById("startTracking").addEventListener("click", async () => {
  console.log("Start tracking button clicked");
  isTracking = true;
  document.getElementById("startTracking").disabled = true;
  document.getElementById("stopTracking").disabled = false;
  document.getElementById("status").textContent = "Tracking...";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log("Sending startTracking message to tab:", tabs[0].id);
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "startTracking" },
      (response) => {
        // Log any error that might occur during message sending
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
        } else {
          console.log("Message sent successfully");
        }
      }
    );
  });
});

document.getElementById("stopTracking").addEventListener("click", () => {
  console.log("Stop tracking button clicked");
  isTracking = false;
  document.getElementById("startTracking").disabled = false;
  document.getElementById("stopTracking").disabled = true;
  document.getElementById("downloadData").disabled = false;
  document.getElementById("status").textContent = "Tracking stopped";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log("Sending stopTracking message to tab:", tabs[0].id);
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "stopTracking" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
        } else {
          console.log("Message sent successfully");
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
        } else {
          console.log("Message sent successfully");
        }
      }
    );
  });
});

// Check if the popup is connected to a tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length === 0) {
    console.error("No active tab found");
    document.getElementById("status").textContent = "Error: No active tab";
    document.getElementById("startTracking").disabled = true;
  } else {
    console.log("Connected to tab:", tabs[0].id);
    // Try to ping the content script to see if it's loaded
    chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "Content script may not be loaded:",
          chrome.runtime.lastError
        );
        document.getElementById("status").textContent =
          "Warning: Content script may not be loaded";
      } else {
        console.log("Content script is loaded and responding");
      }
    });
  }
});
