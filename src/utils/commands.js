/**
 * Command types for inter-context communication
 */
export const COMMANDS = {
  // Content script to background
  CONTENT_LOADED: "CONTENT_LOADED",
  LOG_ERROR: "LOG_ERROR",
  DOWNLOAD_DATA: "DOWNLOAD_DATA",
  ADD_INTERACTION: "ADD_INTERACTION",
  ADD_NETWORK_REQUEST: "ADD_NETWORK_REQUEST",

  // Background to content script
  START_TRACKING: "START_TRACKING",
  STOP_TRACKING: "STOP_TRACKING",

  // Bidirectional
  GET_STATE: "GET_STATE",
  SET_STATE: "SET_STATE",
  UPDATE_STATE: "UPDATE_STATE",
  PING: "PING",

  // Registration
  REGISTER_CONTENT_SCRIPT: "REGISTER_CONTENT_SCRIPT",
  REGISTER_POPUP: "REGISTER_POPUP",

  // State updates
  STATE_UPDATE: "STATE_UPDATE",
};

/**
 * Creates a command message
 * @param {string} type - Command type from COMMANDS
 * @param {Object} payload - Command payload
 * @returns {Object} Command message
 */
export function createCommand(type, payload = {}) {
  return {
    command: type,
    payload,
    timestamp: new Date().toISOString(),
  };
}
