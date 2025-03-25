/**
 * Click tracking module
 */
import {
  getSelector,
  getEnhancedSelector,
  findMeaningfulAncestor,
} from "../utils/selectors.js";
import {
  getElementText,
  getElementAttributes,
  addSafeEventListener,
} from "../utils/dom-helpers.js";
import { COMMANDS, createCommand } from "../utils/commands.js";

/**
 * Creates a click tracker
 * @param {Object} options - Configuration options
 * @param {Object} options.eventBus - Event bus instance
 * @param {Object} options.messageBroker - Message broker instance
 * @returns {Object} Click tracker interface
 */
export function createClickTracker({ eventBus, messageBroker }) {
  // Track event listeners for cleanup
  const cleanupFunctions = [];

  /**
   * Handle click events
   * @param {MouseEvent} event - Click event
   */
  function handleClick(event) {
    try {
      // Get the target element
      const target = event.target;

      // Skip if not a valid element
      if (!target || !target.tagName) {
        return;
      }

      // Find the most meaningful ancestor
      const meaningfulElement = findMeaningfulAncestor(target);

      // Get element information
      const selector = getSelector(meaningfulElement);
      const enhancedSelector = getEnhancedSelector(meaningfulElement);
      const text = getElementText(meaningfulElement).trim();
      const tagName = meaningfulElement.tagName.toLowerCase();
      const attributes = getElementAttributes(meaningfulElement);

      // Create interaction data
      const interaction = {
        type: "click",
        timestamp: new Date().toISOString(),
        selector,
        enhancedSelector,
        text,
        tagName,
        attributes,
        url: window.location.href,
        title: document.title,
      };

      // Log the interaction
      console.log("Click event captured!", meaningfulElement);
      console.log("Adding click interaction to workflowData:", interaction);

      // Emit event for local modules
      eventBus.emit("interaction", interaction);

      // Send to background script
      messageBroker
        .sendToBackground(createCommand(COMMANDS.ADD_INTERACTION, interaction))
        .catch((error) => {
          console.error(
            "Error sending click interaction to background:",
            error
          );
        });
    } catch (error) {
      console.error("Error handling click event:", error);
    }
  }

  /**
   * Set up click tracking
   */
  function setupClickTracking() {
    console.log("Setting up click tracking");

    // Add global click listener
    const removeClickListener = addSafeEventListener(
      document,
      "click",
      (event) => {
        console.log(
          "DIAGNOSTIC: Global click event detected on:",
          event.target
        );
        handleClick(event);
      },
      { capture: true }
    );

    cleanupFunctions.push(removeClickListener);

    // Listen for tracking state changes
    const unsubscribe = eventBus.on(
      "trackingStateChanged",
      ({ isTracking }) => {
        if (!isTracking) {
          removeEventListeners();
        }
      }
    );

    cleanupFunctions.push(unsubscribe);
  }

  /**
   * Remove all event listeners
   */
  function removeEventListeners() {
    console.log("Removing click tracking event listeners");

    cleanupFunctions.forEach((cleanup) => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    });

    // Clear the array
    cleanupFunctions.length = 0;
  }

  return {
    setupClickTracking,
    removeEventListeners,
  };
}
