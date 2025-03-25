/**
 * DOM helper utilities for working with elements
 */
import { getSelector, getEnhancedSelector } from "./selectors.js";

/**
 * Get the full path of an element in the DOM
 * @param {Element} element - DOM element
 * @returns {string} Element path
 */
export function getElementPath(element) {
  if (!element || !element.tagName) {
    return "";
  }

  const path = [];
  let current = element;

  while (current && current.tagName) {
    let identifier = current.tagName.toLowerCase();

    if (current.id) {
      identifier += `#${current.id}`;
    } else if (current.className && typeof current.className === "string") {
      const classes = current.className.trim().split(/\s+/);
      if (classes.length > 0) {
        identifier += `.${classes.join(".")}`;
      }
    }

    path.unshift(identifier);
    current = current.parentElement;
  }

  return path.join(" > ");
}

/**
 * Check if an element is visible in the viewport
 * @param {Element} element - DOM element
 * @returns {boolean} Whether the element is visible
 */
export function isElementVisible(element) {
  if (!element || !element.tagName) {
    return false;
  }

  const style = window.getComputedStyle(element);

  // Check if the element is hidden via CSS
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }

  // Check if the element has zero dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  // Check if the element is within the viewport
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  return (
    rect.top < viewportHeight &&
    rect.bottom > 0 &&
    rect.left < viewportWidth &&
    rect.right > 0
  );
}

/**
 * Get text content from an element, including alt text for images
 * @param {Element} element - DOM element
 * @returns {string} Text content
 */
export function getElementText(element) {
  if (!element || !element.tagName) {
    return "";
  }

  // For images, use alt text
  if (element.tagName.toLowerCase() === "img") {
    return element.alt || "";
  }

  // For inputs, use value or placeholder
  if (element.tagName.toLowerCase() === "input") {
    return element.value || element.placeholder || "";
  }

  // For other elements, use textContent
  return element.textContent || "";
}

/**
 * Get a summary of an element's attributes
 * @param {Element} element - DOM element
 * @returns {Object} Attribute summary
 */
export function getElementAttributes(element) {
  if (!element || !element.tagName) {
    return {};
  }

  const result = {
    tagName: element.tagName.toLowerCase(),
    selector: getSelector(element),
    enhancedSelector: getEnhancedSelector(element),
    attributes: {},
  };

  // Add important attributes
  const importantAttributes = [
    "id",
    "class",
    "name",
    "type",
    "value",
    "href",
    "src",
    "alt",
    "title",
    "role",
    "aria-label",
    "aria-labelledby",
    "data-testid",
  ];

  importantAttributes.forEach((attr) => {
    if (element.hasAttribute(attr)) {
      result.attributes[attr] = element.getAttribute(attr);
    }
  });

  // Add data attributes
  Array.from(element.attributes)
    .filter((attr) => attr.name.startsWith("data-"))
    .forEach((attr) => {
      result.attributes[attr.name] = attr.value;
    });

  return result;
}

/**
 * Create a DOM element from an HTML string
 * @param {string} html - HTML string
 * @returns {Element} Created element
 */
export function createElementFromHTML(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

/**
 * Add event listener with automatic cleanup
 * @param {Element} element - DOM element
 * @param {string} eventType - Event type
 * @param {Function} handler - Event handler
 * @param {Object} options - Event listener options
 * @returns {Function} Function to remove the event listener
 */
export function addSafeEventListener(
  element,
  eventType,
  handler,
  options = {}
) {
  if (!element || !element.addEventListener) {
    return () => {};
  }

  element.addEventListener(eventType, handler, options);

  return () => {
    element.removeEventListener(eventType, handler, options);
  };
}
