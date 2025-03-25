/**
 * Navigation tracking module
 */
import { COMMANDS, createCommand } from "../utils/commands.js";

/**
 * Creates a navigation tracker
 * @param {Object} options - Configuration options
 * @param {Object} options.eventBus - Event bus instance
 * @param {Object} options.messageBroker - Message broker instance
 * @returns {Object} Navigation tracker interface
 */
export function createNavigationTracker({ eventBus, messageBroker }) {
  // Store original methods for restoration
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  // Track cleanup functions
  const cleanupFunctions = [];

  /**
   * Process a navigation event
   * @param {Object} navigation - Navigation event data
   */
  function processNavigation(navigation) {
    try {
      // Log the navigation
      console.log("Navigation event captured:", navigation);

      // Emit event for local modules
      eventBus.emit("navigation", navigation);

      // Create an interaction for the navigation
      const interaction = {
        type: "navigation",
        ...navigation,
      };

      // Emit interaction event
      eventBus.emit("interaction", interaction);

      // Send to background script
      messageBroker
        .sendToBackground(createCommand(COMMANDS.ADD_INTERACTION, interaction))
        .catch((error) => {
          console.error("Error sending navigation to background:", error);
        });
    } catch (error) {
      console.error("Error processing navigation event:", error);
    }
  }

  /**
   * Intercept history API
   */
  function interceptHistoryAPI() {
    // Intercept pushState
    window.history.pushState = function (state, title, url) {
      // Call original method
      const result = originalPushState.apply(this, arguments);

      // Process the navigation
      processNavigation({
        method: "pushState",
        url: url || window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
      });

      return result;
    };

    // Intercept replaceState
    window.history.replaceState = function (state, title, url) {
      // Call original method
      const result = originalReplaceState.apply(this, arguments);

      // Process the navigation
      processNavigation({
        method: "replaceState",
        url: url || window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
      });

      return result;
    };
  }

  /**
   * Set up navigation tracking
   */
  function setupNavigationTracking() {
    console.log("Setting up navigation tracking");

    // Intercept history API
    interceptHistoryAPI();

    // Track initial page load
    processNavigation({
      method: "pageLoad",
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
    });

    // Add popstate event listener
    const removePopstateListener = addPopstateListener();
    cleanupFunctions.push(removePopstateListener);

    // Add hashchange event listener
    const removeHashchangeListener = addHashchangeListener();
    cleanupFunctions.push(removeHashchangeListener);

    // Listen for tracking state changes
    const unsubscribe = eventBus.on(
      "trackingStateChanged",
      ({ isTracking }) => {
        if (!isTracking) {
          restoreOriginalBehavior();
        }
      }
    );

    cleanupFunctions.push(unsubscribe);
  }

  /**
   * Add popstate event listener
   * @returns {Function} Function to remove the event listener
   */
  function addPopstateListener() {
    const handler = () => {
      processNavigation({
        method: "popstate",
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener("popstate", handler);

    return () => {
      window.removeEventListener("popstate", handler);
    };
  }

  /**
   * Add hashchange event listener
   * @returns {Function} Function to remove the event listener
   */
  function addHashchangeListener() {
    const handler = () => {
      processNavigation({
        method: "hashchange",
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener("hashchange", handler);

    return () => {
      window.removeEventListener("hashchange", handler);
    };
  }

  /**
   * Restore original navigation behavior
   */
  function restoreOriginalBehavior() {
    console.log("Restoring original navigation behavior");

    // Restore original methods
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;

    // Remove event listeners
    cleanupFunctions.forEach((cleanup) => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    });

    // Clear the array
    cleanupFunctions.length = 0;
  }

  return {
    setupNavigationTracking,
    restoreOriginalBehavior,
  };
}
