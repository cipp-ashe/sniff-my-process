/**
 * Creates an observable state container with storage synchronization
 * @param {Object} options - Configuration options
 * @param {Object} options.storage - Storage manager instance
 * @param {string} options.storageKey - Key to use for storage
 * @param {Object} options.initialState - Initial state
 * @param {Array} options.middleware - Middleware functions to process state updates
 * @returns {Object} Observable state interface
 */
export function createObservableState({
  storage,
  storageKey,
  initialState = {},
  middleware = [],
}) {
  let state = { ...initialState };
  const listeners = new Set();
  let isInitialized = false;

  // Load initial state from storage
  storage.load(storageKey).then((storedState) => {
    if (storedState) {
      state = { ...state, ...storedState };
      isInitialized = true;
      notifyListeners();
    } else {
      isInitialized = true;
      // Save initial state to storage
      storage.save(storageKey, state);
    }
  });

  function notifyListeners() {
    listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error("Error in state listener:", error);
      }
    });
  }

  // Create selectors registry
  const selectors = {};

  return {
    /**
     * Get the current state
     * @returns {Object} Current state
     */
    getState() {
      return { ...state };
    },

    /**
     * Check if the state has been initialized from storage
     * @returns {boolean} Whether the state is initialized
     */
    isInitialized() {
      return isInitialized;
    },

    /**
     * Update the state
     * @param {Object} newState - New state to merge with current state
     * @returns {Object} Updated state
     */
    setState(newState) {
      // Apply middleware
      const finalState = middleware.reduce(
        (nextState, middlewareFn) => middlewareFn(nextState, state),
        newState
      );

      // Update state
      state = { ...state, ...finalState };

      // Persist to storage
      storage.save(storageKey, state);

      // Notify listeners
      notifyListeners();

      return state;
    },

    /**
     * Update a specific part of the state using dot notation
     * @param {string} path - Path to the property to update (e.g., 'user.name')
     * @param {*} value - New value
     * @returns {Object} Updated state
     */
    updateState(path, value) {
      const newState = { ...state };

      // Handle dot notation paths
      const parts = path.split(".");
      let current = newState;

      // Navigate to the nested property
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]] = { ...current[parts[i]] };
      }

      // Set the value
      current[parts[parts.length - 1]] = value;

      return this.setState(newState);
    },

    /**
     * Subscribe to state changes
     * @param {Function} listener - Listener function
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
      listeners.add(listener);

      // Call immediately with current state
      if (isInitialized) {
        try {
          listener(state);
        } catch (error) {
          console.error("Error in state listener:", error);
        }
      }

      // Return unsubscribe function
      return () => listeners.delete(listener);
    },

    /**
     * Register a selector function
     * @param {string} name - Selector name
     * @param {Function} selectorFn - Selector function
     */
    addSelector(name, selectorFn) {
      selectors[name] = selectorFn;
    },

    /**
     * Use a registered selector
     * @param {string} name - Selector name
     * @param {...*} args - Additional arguments to pass to the selector
     * @returns {*} Selector result
     */
    select(name, ...args) {
      if (!selectors[name]) {
        throw new Error(`Selector "${name}" not found`);
      }
      return selectors[name](state, ...args);
    },
  };
}
