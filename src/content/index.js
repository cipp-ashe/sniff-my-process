/**
 * Main content script
 */
import { createEventBus } from "../utils/event-bus.js";
import { createMessageBroker } from "../utils/message-broker.js";
import { createClickTracker } from "../features/click-tracking.js";
import { createNetworkTracker } from "../features/network-tracking.js";
import { createNavigationTracker } from "../features/navigation-tracking.js";
import { createBackgroundCommunication } from "../features/background-communication.js";

// Initialize core services
const eventBus = createEventBus();
const messageBroker = createMessageBroker();

// Initialize feature modules
const clickTracker = createClickTracker({ eventBus, messageBroker });
const networkTracker = createNetworkTracker({ eventBus, messageBroker });
const navigationTracker = createNavigationTracker({ eventBus, messageBroker });
const backgroundComm = createBackgroundCommunication({
  eventBus,
  messageBroker,
});

// Initialize tracking state
let isTracking = false;

// Initialize communication with background
backgroundComm.initialize();

// Set up event handlers for background communication
eventBus.on("trackingStateChanged", ({ isTracking: newIsTracking }) => {
  console.log("Tracking state changed:", newIsTracking);

  // Update tracking state
  isTracking = newIsTracking;

  if (isTracking) {
    startTracking();
  } else {
    stopTracking();
  }
});

eventBus.on("downloadData", () => {
  console.log("Download data requested");
  // This is handled by the background script
});

// Check initial tracking state
backgroundComm.getTrackingState().then((initialIsTracking) => {
  console.log("Initial tracking state:", initialIsTracking);

  isTracking = initialIsTracking;

  if (isTracking) {
    startTracking();
  }
});

// Error handling
window.addEventListener("error", (event) => {
  backgroundComm.reportError(event.error || event.message);
});

/**
 * Start tracking
 */
function startTracking() {
  console.log("Starting tracking");

  try {
    // Set up tracking modules
    clickTracker.setupClickTracking();
    networkTracker.setupNetworkTracking();
    navigationTracker.setupNavigationTracking();

    console.log("Tracking started");
  } catch (error) {
    console.error("Error starting tracking:", error);
    backgroundComm.reportError(error);
  }
}

/**
 * Stop tracking
 */
function stopTracking() {
  console.log("Stopping tracking");

  try {
    // Clean up tracking modules
    clickTracker.removeEventListeners();
    networkTracker.restoreOriginalBehavior();
    navigationTracker.restoreOriginalBehavior();

    console.log("Tracking stopped");
  } catch (error) {
    console.error("Error stopping tracking:", error);
    backgroundComm.reportError(error);
  }
}

// Log that the content script has loaded
console.log("Content script loaded - v2");
