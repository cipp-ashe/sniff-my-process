/**
 * Main popup script
 */
import { createMessageBroker } from "../utils/message-broker.js";
import { createUiUpdater } from "./ui-updater.js";
import { createTrackingController } from "./tracking-controller.js";

// Initialize core services
const messageBroker = createMessageBroker();
const uiUpdater = createUiUpdater();
const trackingController = createTrackingController({
  messageBroker,
  uiUpdater,
});

// Add event listeners
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM content loaded");

  // Initialize tracking controller
  trackingController.initialize().catch((error) => {
    console.error("Error initializing tracking controller:", error);
  });
  // Start tracking button
  const startButton = document.getElementById("startTracking");
  console.log("Start tracking button:", startButton);
  startButton.addEventListener("click", () => {
    console.log("Start tracking button clicked directly");
    try {
      trackingController.startTracking();
    } catch (error) {
      console.error("Error calling startTracking:", error);
    }
  });

  // Stop tracking button
  document.getElementById("stopTracking").addEventListener("click", () => {
    trackingController.stopTracking();
  });

  // Download data button
  document.getElementById("downloadData").addEventListener("click", () => {
    trackingController.downloadData();
  });

  // Add a clear data button
  const clearDataButton = document.createElement("button");
  clearDataButton.textContent = "Clear Tracking Data";
  clearDataButton.style.marginTop = "10px";
  clearDataButton.style.width = "100%";
  clearDataButton.style.padding = "5px";
  clearDataButton.id = "clearTrackingData";
  clearDataButton.onclick = () => {
    console.log("Clear data button clicked directly");
    try {
      trackingController.clearData();
    } catch (error) {
      console.error("Error calling clearData:", error);
    }
  };
  document.body.appendChild(clearDataButton);
  console.log("Clear data button added to DOM:", clearDataButton);

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
});

// Log that the popup script has loaded
console.log("Popup script loaded - v2");
