/**
 * Network tracking module
 */
import { COMMANDS, createCommand } from "../utils/commands.js";

/**
 * Creates a network tracker
 * @param {Object} options - Configuration options
 * @param {Object} options.eventBus - Event bus instance
 * @param {Object} options.messageBroker - Message broker instance
 * @returns {Object} Network tracker interface
 */
export function createNetworkTracker({ eventBus, messageBroker }) {
  // Store original methods for restoration
  const originalFetch = window.fetch;
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  // Track active XHR requests
  const activeXhrRequests = new Map();

  /**
   * Process a network request
   * @param {Object} request - Network request data
   */
  function processRequest(request) {
    try {
      // Log the request
      console.log("Network request captured:", request);

      // Emit event for local modules
      eventBus.emit("networkRequest", request);

      // Send to background script
      messageBroker
        .sendToBackground(createCommand(COMMANDS.ADD_NETWORK_REQUEST, request))
        .catch((error) => {
          console.error("Error sending network request to background:", error);
        });
    } catch (error) {
      console.error("Error processing network request:", error);
    }
  }

  /**
   * Intercept fetch requests
   */
  function interceptFetch() {
    window.fetch = function (...args) {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
      const method = args[1]?.method || "GET";
      const requestTime = new Date().toISOString();

      // Create request data
      const request = {
        type: "fetch",
        url,
        method,
        timestamp: requestTime,
        pageUrl: window.location.href,
        pageTitle: document.title,
      };

      // Process the request
      processRequest(request);

      // Call the original fetch
      return originalFetch
        .apply(this, args)
        .then((response) => {
          // Update request with response info
          request.status = response.status;
          request.statusText = response.statusText;
          request.responseTime = new Date().toISOString();
          request.duration = new Date() - new Date(requestTime);

          // Process the updated request
          processRequest(request);

          return response;
        })
        .catch((error) => {
          // Update request with error info
          request.error = error.message;
          request.responseTime = new Date().toISOString();
          request.duration = new Date() - new Date(requestTime);

          // Process the updated request
          processRequest(request);

          throw error;
        });
    };
  }

  /**
   * Intercept XMLHttpRequest
   */
  function interceptXhr() {
    // Intercept XHR open
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      const requestId = Math.random().toString(36).substring(2);

      // Store request info
      activeXhrRequests.set(this, {
        id: requestId,
        type: "xhr",
        url,
        method,
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        pageTitle: document.title,
      });

      // Call the original open
      return originalXhrOpen.apply(this, [method, url, ...args]);
    };

    // Intercept XHR send
    XMLHttpRequest.prototype.send = function (body) {
      const request = activeXhrRequests.get(this);

      if (request) {
        // Add request body info if available
        if (body) {
          try {
            request.bodySize = body.length || 0;

            // Try to determine content type
            if (typeof body === "string") {
              try {
                JSON.parse(body);
                request.bodyType = "json";
              } catch {
                request.bodyType = "text";
              }
            } else if (body instanceof FormData) {
              request.bodyType = "formdata";
            } else if (body instanceof Blob) {
              request.bodyType = "blob";
            } else if (body instanceof ArrayBuffer) {
              request.bodyType = "arraybuffer";
            }
          } catch (error) {
            console.error("Error processing XHR body:", error);
          }
        }

        // Process the initial request
        processRequest(request);

        // Add response handlers
        this.addEventListener("load", function () {
          request.status = this.status;
          request.statusText = this.statusText;
          request.responseTime = new Date().toISOString();
          request.duration = new Date() - new Date(request.timestamp);

          // Process the updated request
          processRequest(request);

          // Remove from active requests
          activeXhrRequests.delete(this);
        });

        this.addEventListener("error", function () {
          request.error = "Network error";
          request.responseTime = new Date().toISOString();
          request.duration = new Date() - new Date(request.timestamp);

          // Process the updated request
          processRequest(request);

          // Remove from active requests
          activeXhrRequests.delete(this);
        });

        this.addEventListener("abort", function () {
          request.error = "Request aborted";
          request.responseTime = new Date().toISOString();
          request.duration = new Date() - new Date(request.timestamp);

          // Process the updated request
          processRequest(request);

          // Remove from active requests
          activeXhrRequests.delete(this);
        });

        this.addEventListener("timeout", function () {
          request.error = "Request timeout";
          request.responseTime = new Date().toISOString();
          request.duration = new Date() - new Date(request.timestamp);

          // Process the updated request
          processRequest(request);

          // Remove from active requests
          activeXhrRequests.delete(this);
        });
      }

      // Call the original send
      return originalXhrSend.apply(this, arguments);
    };
  }

  /**
   * Set up network tracking
   */
  function setupNetworkTracking() {
    console.log("Setting up network tracking");

    // Intercept fetch and XHR
    interceptFetch();
    interceptXhr();

    // Listen for tracking state changes
    eventBus.on("trackingStateChanged", ({ isTracking }) => {
      if (!isTracking) {
        restoreOriginalBehavior();
      }
    });
  }

  /**
   * Restore original network behavior
   */
  function restoreOriginalBehavior() {
    console.log("Restoring original network behavior");

    // Restore original methods
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXhrOpen;
    XMLHttpRequest.prototype.send = originalXhrSend;

    // Clear active requests
    activeXhrRequests.clear();
  }

  return {
    setupNetworkTracking,
    restoreOriginalBehavior,
  };
}
