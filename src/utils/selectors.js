/**
 * Utility functions for generating CSS selectors for DOM elements
 */

/**
 * Get a unique CSS selector for an element
 * @param {Element} element - DOM element
 * @returns {string} CSS selector
 */
export function getSelector(element) {
  if (!element || !element.tagName) {
    return "";
  }

  // For body and html, return the tag name
  if (
    element.tagName.toLowerCase() === "body" ||
    element.tagName.toLowerCase() === "html"
  ) {
    return element.tagName.toLowerCase();
  }

  // Try to use ID if available
  if (element.id) {
    return `#${element.id}`;
  }

  // Use classes if available
  if (element.className && typeof element.className === "string") {
    const classes = element.className.trim().split(/\s+/);
    if (classes.length > 0) {
      const classSelector = classes.map((c) => `.${c}`).join("");

      // Check if this selector uniquely identifies the element
      if (document.querySelectorAll(classSelector).length === 1) {
        return classSelector;
      }
    }
  }

  // Get the element's position among siblings with the same tag
  const siblings = Array.from(element.parentNode.children).filter(
    (child) => child.tagName === element.tagName
  );

  if (siblings.length > 1) {
    const index = siblings.indexOf(element) + 1;
    return `${getSelector(
      element.parentNode
    )} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
  }

  // If it's the only child of its type, use the tag name
  return `${getSelector(
    element.parentNode
  )} > ${element.tagName.toLowerCase()}`;
}

/**
 * Get an enhanced selector that includes meaningful attributes
 * @param {Element} element - DOM element
 * @returns {string} Enhanced CSS selector
 */
export function getEnhancedSelector(element) {
  if (!element || !element.tagName) {
    return "";
  }

  let selector = getSelector(element);

  // Add data attributes if available
  const dataAttributes = Array.from(element.attributes)
    .filter((attr) => attr.name.startsWith("data-"))
    .map((attr) => `[${attr.name}="${attr.value}"]`);

  if (dataAttributes.length > 0) {
    selector += dataAttributes.join("");
  }

  // Add role attribute if available
  if (element.getAttribute("role")) {
    selector += `[role="${element.getAttribute("role")}"]`;
  }

  return selector;
}

/**
 * Find the most meaningful ancestor element
 * @param {Element} element - DOM element
 * @returns {Element} Meaningful ancestor element
 */
export function findMeaningfulAncestor(element) {
  if (!element || !element.parentElement) {
    return element;
  }

  // Check if the element itself is meaningful
  if (isMeaningfulElement(element)) {
    return element;
  }

  // Walk up the DOM tree to find a meaningful ancestor
  let current = element.parentElement;
  while (current && current.tagName.toLowerCase() !== "body") {
    if (isMeaningfulElement(current)) {
      return current;
    }
    current = current.parentElement;
  }

  // If no meaningful ancestor is found, return the original element
  return element;
}

/**
 * Check if an element is meaningful (has ID, specific classes, or semantic role)
 * @param {Element} element - DOM element
 * @returns {boolean} Whether the element is meaningful
 */
function isMeaningfulElement(element) {
  // Elements with IDs are meaningful
  if (element.id) {
    return true;
  }

  // Elements with certain classes are meaningful
  if (element.className && typeof element.className === "string") {
    const classes = element.className.trim().split(/\s+/);
    const meaningfulClassPatterns = [
      /btn/i,
      /button/i,
      /nav/i,
      /menu/i,
      /header/i,
      /footer/i,
      /card/i,
      /panel/i,
      /dialog/i,
      /modal/i,
      /form/i,
      /input/i,
    ];

    if (
      classes.some((cls) =>
        meaningfulClassPatterns.some((pattern) => pattern.test(cls))
      )
    ) {
      return true;
    }
  }

  // Elements with semantic roles are meaningful
  if (element.getAttribute("role")) {
    return true;
  }

  // Semantic HTML elements are meaningful
  const semanticTags = [
    "header",
    "footer",
    "nav",
    "main",
    "article",
    "section",
    "aside",
    "button",
    "a",
    "form",
    "input",
    "select",
    "textarea",
    "label",
  ];

  if (semanticTags.includes(element.tagName.toLowerCase())) {
    return true;
  }

  return false;
}
