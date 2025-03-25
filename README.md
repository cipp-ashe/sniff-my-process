# Workflow Tracker

A browser extension that tracks user interactions and network requests to map application workflows. This tool helps developers and QA teams understand how users navigate through web applications, identify bottlenecks, and document complex workflows.

## Features

- **User Interaction Tracking**: Captures clicks and input changes with detailed information
- **Network Request Monitoring**: Intercepts and logs both Fetch API and XMLHttpRequest calls
- **Privacy-Focused**: Automatically redacts input values to protect sensitive information
- **Simple Interface**: Easy-to-use popup with controls to start/stop tracking and download data
- **Detailed Output**: Generates JSON files with timestamps, selectors, and other relevant data

## Installation

### From Source

1. Clone this repository:

   ```
   git clone https://github.com/yourusername/workflow-tracker.git
   ```

2. Build the extension:

   ```
   npm install
   npm run build
   ```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top-right corner)
   - Click "Load unpacked" and select the build directory

### From Chrome Web Store

_Coming soon_

## Usage

1. Click on the Workflow Tracker icon in your browser toolbar to open the popup
2. Click "Start Tracking" to begin recording interactions and network requests
3. Navigate through the application you want to map
4. Click "Stop Tracking" when you're done
5. Click "Download Data" to save the recorded workflow as a JSON file

The downloaded JSON file will contain:

- A list of user interactions (clicks, inputs) with timestamps and element selectors
- A list of network requests with URLs, methods, status codes, and timestamps

## Example Output

```json
{
  "interactions": [
    {
      "type": "click",
      "timestamp": "2025-03-25T19:30:45.123Z",
      "selector": "#login-button",
      "text": "Log In",
      "tagName": "button"
    },
    {
      "type": "input",
      "timestamp": "2025-03-25T19:30:50.456Z",
      "selector": "#username",
      "value": "[REDACTED]",
      "inputType": "text"
    }
  ],
  "networkRequests": [
    {
      "type": "fetch",
      "url": "https://api.example.com/login",
      "method": "POST",
      "timestamp": "2025-03-25T19:30:52.789Z",
      "status": 200,
      "statusText": "OK"
    }
  ],
  "timestamp": "2025-03-25T19:30:40.000Z"
}
```

## Privacy Considerations

Workflow Tracker is designed with privacy in mind:

- Input values are automatically redacted and replaced with `[REDACTED]`
- No personal information is collected or transmitted
- All data remains local to your browser until you explicitly download it
- The extension only tracks activity on the current tab when tracking is enabled

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

1. Clone the repository

   ```
   git clone https://github.com/yourusername/workflow-tracker.git
   cd workflow-tracker
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Start the development server
   ```
   npm run dev
   ```

### Project Structure

- `manifest.json` - Extension configuration
- `background.js` - Service worker for background tasks
- `content.js` - Core tracking functionality
- `popup.html/js` - Extension popup interface
- `src/` - React application (for future dashboard features)

### Building for Production

```
npm run build
```

## Future Enhancements

- Visual workflow diagram generation
- Filtering and search capabilities for large workflows
- Integration with issue tracking systems
- Automated test generation from recorded workflows
- Performance metrics collection

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Screenshots

_[Add screenshots of the extension in action here]_

---

Made with ❤️ for developers and QA teams who need to understand complex web applications.
