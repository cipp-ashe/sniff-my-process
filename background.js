// Service worker for handling background tasks
console.log("Background script loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Workflow Tracker installed");
});

// Listen for errors
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  if (message.action === "logError") {
    console.error("Error from content script:", message.error);
  }

  // Return true to indicate we'll respond asynchronously
  return true;
});

// Add listener for content script connection issues
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    console.log("Tab updated, checking content script:", tabId);
    // We could ping the content script here if needed
  }
});
