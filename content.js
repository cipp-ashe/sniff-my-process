let workflowData = {
  interactions: [],
  networkRequests: [],
  timestamp: null
};

let isTracking = false;

// Utility function to get unique selector
function getSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className) {
    return `.${element.className.split(' ').join('.')}`;
  }
  
  let path = [];
  while (element.parentNode) {
    let siblings = element.parentNode.children;
    let index = Array.from(siblings).indexOf(element) + 1;
    path.unshift(`${element.tagName}:nth-child(${index})`);
    element = element.parentNode;
  }
  
  return path.join(' > ');
}

// Track clicks
function trackClick(e) {
  const interaction = {
    type: 'click',
    timestamp: new Date().toISOString(),
    selector: getSelector(e.target),
    text: e.target.textContent?.trim(),
    tagName: e.target.tagName.toLowerCase()
  };
  
  workflowData.interactions.push(interaction);
}

// Track input changes
function trackInput(e) {
  const interaction = {
    type: 'input',
    timestamp: new Date().toISOString(),
    selector: getSelector(e.target),
    value: e.target.value ? '[REDACTED]' : '', // Don't store actual input values
    inputType: e.target.type
  };
  
  workflowData.interactions.push(interaction);
}

// Track network requests using Fetch API
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  if (!isTracking) return originalFetch.apply(this, args);
  
  const request = args[0];
  const startTime = new Date().toISOString();
  
  try {
    const response = await originalFetch.apply(this, args);
    const networkRequest = {
      type: 'fetch',
      url: typeof request === 'string' ? request : request.url,
      method: typeof request === 'string' ? 'GET' : request.method || 'GET',
      timestamp: startTime,
      status: response.status,
      statusText: response.statusText
    };
    
    workflowData.networkRequests.push(networkRequest);
    return response;
  } catch (error) {
    const networkRequest = {
      type: 'fetch',
      url: typeof request === 'string' ? request : request.url,
      method: typeof request === 'string' ? 'GET' : request.method || 'GET',
      timestamp: startTime,
      error: error.message
    };
    
    workflowData.networkRequests.push(networkRequest);
    throw error;
  }
};

// Track XHR requests
const XHR = XMLHttpRequest.prototype;
const originalOpen = XHR.open;
const originalSend = XHR.send;

XHR.open = function(method, url) {
  if (isTracking) {
    this._trackingData = {
      method,
      url,
      startTime: new Date().toISOString()
    };
  }
  originalOpen.apply(this, arguments);
};

XHR.send = function() {
  if (isTracking && this._trackingData) {
    this.addEventListener('load', function() {
      const networkRequest = {
        type: 'xhr',
        ...this._trackingData,
        status: this.status,
        statusText: this.statusText
      };
      workflowData.networkRequests.push(networkRequest);
    });
    
    this.addEventListener('error', function() {
      const networkRequest = {
        type: 'xhr',
        ...this._trackingData,
        error: 'Request failed'
      };
      workflowData.networkRequests.push(networkRequest);
    });
  }
  originalSend.apply(this, arguments);
};

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'startTracking':
      isTracking = true;
      workflowData = {
        interactions: [],
        networkRequests: [],
        timestamp: new Date().toISOString()
      };
      document.addEventListener('click', trackClick, true);
      document.addEventListener('input', trackInput, true);
      break;
      
    case 'stopTracking':
      isTracking = false;
      document.removeEventListener('click', trackClick, true);
      document.removeEventListener('input', trackInput, true);
      break;
      
    case 'downloadData':
      const blob = new Blob([JSON.stringify(workflowData, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      break;
  }
});