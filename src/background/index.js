/**
 * Main background script
 */
import { createStorageManager } from "../utils/storage.js";
import { createThrottledStorage } from "../utils/throttled-storage.js";
import { createStateManager } from "./state-manager.js";
import { createDataManager } from "./data-manager.js";
import { createMessageHandler } from "./message-handler.js";
import { createTabManager } from "./tab-manager.js";
import { createLifecycleManager } from "./lifecycle-manager.js";

// Initialize core services
const storage = createStorageManager();
const throttledStorage = createThrottledStorage(storage);

// Initialize managers
const stateManager = createStateManager({ storage: throttledStorage });
const dataManager = createDataManager({ storage: throttledStorage });
const messageHandler = createMessageHandler({ stateManager, dataManager });
const tabManager = createTabManager({ stateManager });
const lifecycleManager = createLifecycleManager({
  stateManager,
  storage: throttledStorage,
});

// Initialize all managers
async function initialize() {
  try {
    console.log("Initializing background script");

    // Initialize state and data
    await stateManager.initialize();
    await dataManager.initialize();

    // Initialize managers
    messageHandler.initialize();
    tabManager.initialize();
    lifecycleManager.initialize();

    console.log("Background script initialized");
  } catch (error) {
    console.error("Error initializing background script:", error);
  }
}

// Start initialization
initialize();

// Log that the background script has loaded
console.log("Background script loaded");
