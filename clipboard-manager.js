// Clipboard Manager - Handles clipboard operations via offscreen document

export class ClipboardManager {
  constructor() {
    this.offscreenCreated = false;
  }

  async ensureOffscreenDocument() {
    if (this.offscreenCreated) {
      return;
    }

    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
      this.offscreenCreated = true;
      return;
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Write image data to clipboard for pasting into ChatGPT'
    });

    this.offscreenCreated = true;
  }

  async prepareImage(imageDataUrl) {
    await this.ensureOffscreenDocument();

    // Send message to offscreen document to prepare clipboard
    await chrome.runtime.sendMessage({
      action: 'copyImageToClipboard',
      imageData: imageDataUrl
    });
  }

  async prepareText(text) {
    await this.ensureOffscreenDocument();

    await chrome.runtime.sendMessage({
      action: 'copyTextToClipboard',
      text
    });
  }
}
