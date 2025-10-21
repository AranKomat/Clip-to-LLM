# Clip-to-LLM

A Chrome extension that intelligently captures web content and sends it to ChatGPT with smart site-specific defaults and powerful keyboard shortcuts.

## Features

- **Smart Capture**: Automatically determines the best way to capture content based on the website
  - YouTube: Extracts full transcripts
  - Twitter/X: Takes screenshots
  - Articles: Captures clean text
  - Documentation: Saves relevant text content
- **Queue System**: Build multi-source research queues before sending
- **Keyboard Shortcuts**: Fast workflow with customizable shortcuts
- **No Truncation**: Auto-chunks long text to fit ChatGPT's input limits
- **De-duplication**: Prevents accidental duplicate captures
- **Customizable**: Site-specific overrides and custom prompts

## Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/AranKomat/Clip-to-LLM.git
   cd Clip-to-LLM
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked"

5. Select the `Clip-to-LLM` directory

6. The extension is now installed! You should see the Clip-to-LLM icon in your toolbar.

## Keyboard Shortcuts

### Default Shortcuts (Pre-configured)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+Shift+C` | Save Smart | Queue current page using smart detection |
| `Ctrl+Shift+V` | Quick Send | Capture + send to ChatGPT (no auto-send) |
| `Ctrl+Shift+S` | Summary | Capture + send with "Summarize:" prompt (auto-send) |
| `Ctrl+Shift+D` | Screenshot | Capture visible area as screenshot |

*Note: On Mac, use `Cmd` instead of `Ctrl`*

### Additional Actions (Configure shortcuts manually or use popup buttons)

Chrome limits extensions to 4 pre-configured shortcuts. Additional actions are available via:

**Popup Buttons**: Click the extension icon and use the Quick Action buttons:
- **Explain** - Capture + send with "Explain:" prompt
- **Translate** - Capture + send with "Translate:" prompt
- **Copy Text** - Force text capture (ignores smart defaults)

**Manual Shortcuts**: You can assign custom shortcuts to these actions:
1. Go to `chrome://extensions/shortcuts`
2. Find "Clip-to-LLM"
3. Configure shortcuts for "Custom Quick Send 1", "Custom Quick Send 2", and "Copy page text"

## Usage

### Basic Workflow

1. **Single Page Quick Send**
   - Navigate to a page you want to analyze
   - Press `Ctrl+Shift+V` (Quick Send)
   - Extension captures the page and opens ChatGPT
   - Review the inserted content and press Enter

2. **Multi-Source Research**
   - Visit first source, press `Ctrl+Shift+C` (Save Smart)
   - Visit second source, press `Ctrl+Shift+C`
   - Visit final source, press `Ctrl+Shift+V` (Quick Send)
   - All sources are combined and sent to ChatGPT

3. **Quick Summary**
   - On any article/video, press `Ctrl+Shift+S`
   - Extension captures content and auto-sends to ChatGPT with "Summarize:" prompt

### Smart Site Defaults

The extension automatically chooses the best capture method:

**Transcript Sites:**
- YouTube → Full video transcript
- TED, Coursera, edX → Transcript or text

**Text-Heavy Sites:**
- Medium, Substack, Dev.to → Clean article text
- MDN, Python docs → Documentation text
- Stack Overflow → Question + answers
- News sites → Article content

**Visual Sites:**
- Twitter/X → Screenshot
- Instagram, Pinterest → Screenshot
- Figma → Screenshot
- Google Maps → Screenshot

**Lightweight:**
- GitHub repos → URL
- Product landing pages → URL

### Screenshots & Images

When you capture a screenshot:
1. It's added to your queue
2. On send, it's prepared on your clipboard
3. ChatGPT opens and content is inserted
4. Press `Ctrl/Cmd+V` once to paste the image
5. (Optional) Enable "auto-send after paste" in settings

**Important:** Only one screenshot can be pasted per send (OS clipboard limitation)

## Settings

Access settings by:
- Clicking the extension icon → "Settings" button
- Right-clicking the icon → "Options"

### Available Settings

- **Clear queue after send**: Automatically clear queue after sending to ChatGPT
- **Auto-send after paste**: Automatically press Enter after detecting image paste
- **Max queue items**: Maximum number of items to keep in queue (default: 25)
- **Max image size**: Total size limit for screenshots in MB (default: 25)
- **Custom prompts**: Customize the prompts for Custom Send 1 and 2
- **Site overrides**: Override smart defaults for specific websites

## Queue Management

View your queue by clicking the extension icon. You can:
- See all queued items with previews
- Remove individual items
- Clear the entire queue
- See total item count

## How It Works

1. **Capture**: When you trigger a capture, the extension:
   - Analyzes the current URL
   - Applies smart heuristics or user overrides
   - Extracts content (text/transcript/screenshot)
   - Checks for duplicates (15-second window)
   - Adds to queue

2. **Send**: When you send to ChatGPT:
   - Composes a single message from all queue items
   - Handles long text with auto-chunking
   - Opens ChatGPT in adjacent tab
   - Inserts content automatically
   - Optionally auto-sends (based on command used)

## Privacy

- All processing is done locally in your browser
- No data is sent to external servers (except ChatGPT when you send)
- Queue is stored in Chrome's local storage
- No tracking or analytics

## Permissions

The extension requires:
- `tabs`: To detect which page you're on
- `activeTab`: To extract content from current page
- `storage`: To save queue and settings
- `scripting`: To inject content extraction scripts
- `downloads`: (Optional) For future export features
- `offscreen`: For clipboard operations (images)

## Development

### Project Structure

```
Clip-to-LLM/
├── manifest.json          # Extension manifest
├── background.js          # Service worker (main logic)
├── queue-manager.js       # Queue management
├── site-heuristics.js     # Smart site detection
├── clipboard-manager.js   # Clipboard operations
├── content.js             # Content extraction script
├── chatgpt-inject.js      # ChatGPT integration
├── popup.html/js          # Extension popup UI
├── options.html/js        # Settings page
├── offscreen.html/js      # Clipboard offscreen doc
└── icons/                 # Extension icons
```

### Building

No build step required. The extension runs directly from source.

### Testing

1. Load the extension in developer mode
2. Open the developer tools for the extension:
   - Go to `chrome://extensions/`
   - Click "Inspect views: background page"
3. Test on various websites
4. Check console for errors

## Troubleshooting

### Extension doesn't work on a page
- Refresh the page after installing/updating
- Some Chrome internal pages (chrome://) don't allow extensions
- Check if the page requires special permissions

### Shortcuts don't work
- Check for conflicts in `chrome://extensions/shortcuts`
- Some shortcuts may be reserved by Chrome
- Try the fallback shortcuts (Ctrl+Alt instead of Ctrl+Shift)

### ChatGPT insertion fails
- Make sure you're logged into ChatGPT
- ChatGPT UI may have changed - open an issue
- Check browser console for errors

### Screenshot not pasting
- Make sure clipboard permissions are granted
- Try pasting manually (Ctrl/Cmd+V)
- Only one image can be on clipboard at a time

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- Issues: [GitHub Issues](https://github.com/AranKomat/Clip-to-LLM/issues)
- Feature requests: Open an issue with the "enhancement" label

## Roadmap

- [ ] Support for more LLM platforms (Claude, Gemini, etc.)
- [ ] Export queue to markdown/JSON
- [ ] Better YouTube transcript language selection
- [ ] PDF content extraction
- [ ] Custom site rules editor
- [ ] Sync settings across devices
- [ ] Firefox support

## Changelog

### Version 1.0.0 (Initial Release)
- Smart site-specific capture
- Keyboard shortcuts for quick workflows
- Queue management system
- ChatGPT integration
- Screenshot support
- Auto-chunking for long text
- De-duplication
- Customizable settings
