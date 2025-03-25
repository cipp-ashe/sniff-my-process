/**
 * UI updater for popup
 */

/**
 * Creates a UI updater
 * @returns {Object} UI updater interface
 */
export function createUiUpdater() {
  /**
   * Update UI based on tracking state
   * @param {boolean} isTracking - Whether tracking is active
   * @param {Object} stats - Tracking statistics
   * @param {string} sessionId - Current session ID
   * @param {string} lastActivity - Last activity timestamp
   */
  function updateUI(isTracking, stats, sessionId, lastActivity) {
    console.log(
      "Updating UI, tracking state:",
      isTracking,
      "sessionId:",
      sessionId,
      "lastActivity:",
      lastActivity
    );

    // Update button states
    document.getElementById("startTracking").disabled = isTracking;
    document.getElementById("stopTracking").disabled = !isTracking;
    document.getElementById("downloadData").disabled =
      !isTracking && !document.getElementById("downloadData").disabled;

    // Update status text
    let statusText = isTracking
      ? `Tracking... (${stats.interactionCount} interactions, ${stats.networkRequestCount} requests)`
      : "Not tracking";

    // Add session ID if available
    if (isTracking && sessionId) {
      statusText += `\nSession: ${sessionId}`;
    }

    // Add last activity timestamp if available
    if (isTracking && lastActivity) {
      const activityTime = new Date(lastActivity).toLocaleTimeString();
      statusText += `\nLast activity: ${activityTime}`;
    }

    document.getElementById("status").textContent = statusText;

    // Add a visible alert for debugging
    if (isTracking) {
      document.getElementById("status").style.color = "#4CAF50";
      document.getElementById("status").style.fontWeight = "bold";
    } else {
      document.getElementById("status").style.color = "#666";
      document.getElementById("status").style.fontWeight = "normal";
    }

    // Make status a multi-line element
    document.getElementById("status").style.whiteSpace = "pre-line";
  }

  /**
   * Get the last activity timestamp from workflowData
   * @param {Object} workflowData - Workflow data
   * @returns {string|null} Last activity timestamp
   */
  function getLastActivityTimestamp(workflowData) {
    if (!workflowData) return null;

    let lastTimestamp = null;

    // Check interactions
    if (workflowData.interactions && workflowData.interactions.length > 0) {
      const lastInteraction =
        workflowData.interactions[workflowData.interactions.length - 1];
      lastTimestamp = lastInteraction.timestamp;
    }

    // Check network requests
    if (
      workflowData.networkRequests &&
      workflowData.networkRequests.length > 0
    ) {
      const lastRequest =
        workflowData.networkRequests[workflowData.networkRequests.length - 1];
      const requestTimestamp = lastRequest.timestamp;

      // Update if this is more recent than the interaction timestamp
      if (
        !lastTimestamp ||
        new Date(requestTimestamp) > new Date(lastTimestamp)
      ) {
        lastTimestamp = requestTimestamp;
      }
    }

    return lastTimestamp;
  }

  /**
   * Set tracking state in UI
   * @param {boolean} isTracking - Whether tracking is active
   * @param {Object} workflowData - Workflow data
   */
  function setTrackingState(isTracking, workflowData = null) {
    const stats = {
      interactionCount: workflowData?.interactions?.length || 0,
      networkRequestCount: workflowData?.networkRequests?.length || 0,
    };

    const sessionId = workflowData?.sessionId || null;
    const lastActivity = getLastActivityTimestamp(workflowData);

    updateUI(isTracking, stats, sessionId, lastActivity);
  }

  return {
    updateUI,
    getLastActivityTimestamp,
    setTrackingState,
  };
}
