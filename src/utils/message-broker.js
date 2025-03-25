/**
 * Creates a message broker for communication between extension contexts
 * @returns {Object} Message broker interface
 */
export function createMessageBroker() {
  return {
    /**
     * Send a message to the background script
     * @param {Object} message - Message to send
     * @returns {Promise} Promise that resolves with the response
     */
    sendToBackground(message) {
      console.log("Sending message to background:", message);
      return new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage(message, (response) => {
            console.log("Received response from background:", response);
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending message to background:",
                chrome.runtime.lastError
              );
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        } catch (error) {
          console.error("Exception sending message to background:", error);
          reject(error);
        }
      });
    },

    /**
     * Send a message to a specific tab
     * @param {number} tabId - ID of the tab to send the message to
     * @param {Object} message - Message to send
     * @returns {Promise} Promise that resolves with the response
     */
    sendToTab(tabId, message) {
      return new Promise((resolve, reject) => {
        try {
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    },

    /**
     * Add a listener for messages
     * @param {Function} handler - Message handler function
     * @returns {Function} Function to remove the listener
     */
    addListener(handler) {
      const listener = (message, sender, sendResponse) => {
        // Process the message and get a response
        const result = handler(message, sender);

        // If the handler returns a Promise, resolve it before sending response
        if (result instanceof Promise) {
          result.then(sendResponse).catch((error) => {
            console.error("Error handling message:", error);
            sendResponse({ error: error.message });
          });
          return true; // Keep the message channel open
        }

        // Otherwise, send the response immediately
        sendResponse(result);
      };

      chrome.runtime.onMessage.addListener(listener);

      // Return a function to remove the listener
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
  };
}
