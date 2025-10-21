// Offscreen document for clipboard operations

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'copyImageToClipboard') {
    await copyImageToClipboard(message.imageData);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'copyTextToClipboard') {
    await copyTextToClipboard(message.text);
    sendResponse({ success: true });
    return true;
  }
});

async function copyImageToClipboard(dataUrl) {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Write to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);

    console.log('Image copied to clipboard');
  } catch (error) {
    console.error('Failed to copy image to clipboard:', error);
  }
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Text copied to clipboard');
  } catch (error) {
    console.error('Failed to copy text to clipboard:', error);
  }
}

console.log('Offscreen document loaded');
