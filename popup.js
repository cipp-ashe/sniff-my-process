let isTracking = false;

document.getElementById('startTracking').addEventListener('click', async () => {
  isTracking = true;
  document.getElementById('startTracking').disabled = true;
  document.getElementById('stopTracking').disabled = false;
  document.getElementById('status').textContent = 'Tracking...';
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'startTracking'});
  });
});

document.getElementById('stopTracking').addEventListener('click', () => {
  isTracking = false;
  document.getElementById('startTracking').disabled = false;
  document.getElementById('stopTracking').disabled = true;
  document.getElementById('downloadData').disabled = false;
  document.getElementById('status').textContent = 'Tracking stopped';
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'stopTracking'});
  });
});

document.getElementById('downloadData').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'downloadData'});
  });
});