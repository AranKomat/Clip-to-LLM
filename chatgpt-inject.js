// ChatGPT injection script - handles text insertion and auto-send

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'insertText') {
    insertTextIntoChatGPT(message.text, message.autoSend);
    sendResponse({ success: true });
    return true;
  }
});

async function insertTextIntoChatGPT(text, autoSend = false) {
  console.log('Inserting text into ChatGPT, autoSend:', autoSend);

  // Find the input textarea
  const textarea = findChatGPTInput();

  if (!textarea) {
    console.error('Could not find ChatGPT input textarea');
    return;
  }

  // Check if text needs chunking (ChatGPT has ~32k character limit for input)
  const MAX_CHUNK_SIZE = 30000;

  if (text.length <= MAX_CHUNK_SIZE) {
    // Single insertion
    await insertChunk(textarea, text, autoSend);
  } else {
    // Auto-chunk and insert sequentially
    const chunks = chunkText(text, MAX_CHUNK_SIZE);
    console.log(`Text too long, splitting into ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const chunkPrefix = `[Part ${i + 1}/${chunks.length}]\n`;
      const chunkText = chunkPrefix + chunks[i];

      await insertChunk(textarea, chunkText, autoSend && isLast);

      // Wait between chunks
      if (!isLast) {
        await sleep(500);
      }
    }
  }
}

async function insertChunk(textarea, text, autoSend) {
  // Set value
  textarea.value = text;

  // Trigger input events to notify React
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  // Focus textarea
  textarea.focus();

  if (autoSend) {
    // Wait a bit for React to update
    await sleep(300);

    // Find and click send button
    const sendButton = findSendButton();
    if (sendButton && !sendButton.disabled) {
      sendButton.click();
      console.log('Auto-sent message');
    } else {
      console.warn('Send button not found or disabled');
    }
  }
}

function findChatGPTInput() {
  // Try multiple selectors as ChatGPT UI may change
  const selectors = [
    '#prompt-textarea',
    'textarea[data-id="root"]',
    'textarea[placeholder*="Message" i]',
    'textarea[placeholder*="Send a message" i]',
    'div[contenteditable="true"][role="textbox"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }

  // Fallback: find any textarea in main content area
  const textareas = document.querySelectorAll('textarea');
  if (textareas.length > 0) {
    return textareas[textareas.length - 1]; // Return last textarea
  }

  return null;
}

function findSendButton() {
  // Try multiple selectors
  const selectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send" i]',
    'button[type="submit"]'
  ];

  for (const selector of selectors) {
    const button = document.querySelector(selector);
    if (button) {
      return button;
    }
  }

  // Fallback: find button with send icon (SVG path)
  const buttons = document.querySelectorAll('button');
  for (const button of buttons) {
    const svg = button.querySelector('svg');
    if (svg && button.closest('form')) {
      return button;
    }
  }

  return null;
}

function chunkText(text, maxSize) {
  const chunks = [];
  let currentChunk = '';

  // Split by paragraphs to avoid breaking mid-sentence
  const paragraphs = text.split(/\n\n+/);

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxSize && currentChunk) {
      // Save current chunk and start new one
      chunks.push(currentChunk.trim());
      currentChunk = para + '\n\n';
    } else {
      currentChunk += para + '\n\n';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Listen for paste events if send-after-paste is enabled
document.addEventListener('paste', async (event) => {
  // Check if send-after-paste is enabled
  chrome.storage.sync.get({ sendAfterPaste: false }, async (settings) => {
    if (!settings.sendAfterPaste) return;

    // Wait for paste to complete
    await sleep(500);

    // Check if an image was pasted
    const textarea = findChatGPTInput();
    if (!textarea) return;

    // Look for image attachment indicator
    const hasAttachment = document.querySelector('[data-testid="attachment"], img[src^="blob:"]');

    if (hasAttachment) {
      // Auto-send after image paste
      await sleep(300);
      const sendButton = findSendButton();
      if (sendButton && !sendButton.disabled) {
        sendButton.click();
        console.log('Auto-sent after paste');
      }
    }
  });
});

console.log('ChatGPT injection script loaded');
