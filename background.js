// Background Service Worker for Clip-to-LLM
import { QueueManager } from './queue-manager.js';
import { SiteHeuristics } from './site-heuristics.js';
import { ClipboardManager } from './clipboard-manager.js';

const queueManager = new QueueManager();
const siteHeuristics = new SiteHeuristics();
const clipboardManager = new ClipboardManager();

// Command listeners
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  switch (command) {
    case 'save-smart':
      await handleSaveSmart(tab);
      break;
    case 'quick-send':
      await handleQuickSend(tab);
      break;
    case 'custom-send-1':
      await handleCustomSend(tab, 1);
      break;
    case 'custom-send-2':
      await handleCustomSend(tab, 2);
      break;
    case 'summary-send':
      await handleSummarySend(tab);
      break;
    case 'copy-page-text':
      await handleCopyPageText(tab);
      break;
    case 'screenshot':
      await handleScreenshot(tab);
      break;
  }
});

// Save Smart: Queue content based on site heuristics
async function handleSaveSmart(tab) {
  const action = siteHeuristics.getDefaultAction(tab.url);
  console.log('Save Smart action for', tab.url, ':', action);

  try {
    let item;

    switch (action) {
      case 'youtube_transcript':
        item = await captureYouTubeTranscript(tab);
        break;
      case 'page_text':
        item = await capturePageText(tab);
        break;
      case 'screenshot':
      case 'x_screenshot':
        item = await captureScreenshot(tab, action);
        break;
      case 'url':
      default:
        item = await captureURL(tab);
        break;
    }

    if (item) {
      await queueManager.addItem(item);
      showNotification('Saved to queue', `${item.type}: ${item.title}`);
    }
  } catch (error) {
    console.error('Error in handleSaveSmart:', error);
    showNotification('Error', error.message);
  }
}

// Quick Send: Capture + Open ChatGPT + Paste (no auto-send)
async function handleQuickSend(tab) {
  await handleSaveSmart(tab); // First capture current page
  await sendToChatchatGPT({ autoSend: false });
}

// Custom Send 1: Explain + auto-send
async function handleCustomSend(tab, customNumber) {
  const settings = await chrome.storage.sync.get({
    custom1Prompt: 'Explain:\n',
    custom2Prompt: 'Translate:\n'
  });

  const prompt = customNumber === 1 ? settings.custom1Prompt : settings.custom2Prompt;

  await handleSaveSmart(tab);
  await sendToChatchatGPT({ autoSend: true, customPrompt: prompt });
}

// Summary Send: Summarize + auto-send
async function handleSummarySend(tab) {
  await handleSaveSmart(tab);
  await sendToChatchatGPT({ autoSend: true, customPrompt: 'Summarize:\n' });
}

// Copy Page Text: Force text capture
async function handleCopyPageText(tab) {
  const item = await capturePageText(tab);
  if (item) {
    await queueManager.addItem(item);
    showNotification('Text copied to queue', item.title);
  }
}

// Screenshot: Capture visible area
async function handleScreenshot(tab) {
  const item = await captureScreenshot(tab, 'screenshot');
  if (item) {
    await queueManager.addItem(item);
    showNotification('Screenshot captured', item.title);
  }
}

// Capture functions
async function captureURL(tab) {
  return {
    type: 'url',
    url: tab.url,
    title: tab.title,
    timestamp: Date.now(),
    hash: hashURL(tab.url)
  };
}

async function capturePageText(tab) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractPageText
  });

  if (!results || !results[0]) {
    throw new Error('Failed to extract page text');
  }

  const { text, hasSelection } = results[0].result;

  return {
    type: 'page_text',
    text,
    title: tab.title,
    url: tab.url,
    hasSelection,
    timestamp: Date.now(),
    hash: await hashText(text)
  };
}

async function captureYouTubeTranscript(tab) {
  // Extract video ID
  const videoId = extractYouTubeVideoId(tab.url);
  if (!videoId) {
    throw new Error('Could not extract YouTube video ID');
  }

  // Try to get transcript from the page
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractYouTubeTranscript,
    args: [videoId]
  });

  if (!results || !results[0] || !results[0].result) {
    // Fallback to URL if transcript not available
    return await captureURL(tab);
  }

  const { transcript, language } = results[0].result;

  return {
    type: 'youtube_transcript',
    text: transcript,
    title: tab.title,
    url: tab.url,
    language,
    videoId,
    timestamp: Date.now(),
    hash: await hashText(transcript)
  };
}

async function captureScreenshot(tab, type = 'screenshot') {
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: 'png'
  });

  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return {
    type,
    imageData: dataUrl,
    title: tab.title,
    url: tab.url,
    timestamp: Date.now(),
    size: blob.size,
    hash: `${tab.url}_${Date.now()}`
  };
}

// Send to ChatGPT
async function sendToChatchatGPT({ autoSend = false, customPrompt = '' }) {
  const queue = await queueManager.getQueue();

  if (queue.length === 0) {
    showNotification('Queue is empty', 'Nothing to send');
    return;
  }

  // Compose message
  const { textPayload, hasImage, imageData } = await composeMessage(queue, customPrompt);

  // Prepare clipboard if needed
  if (hasImage) {
    await clipboardManager.prepareImage(imageData);
  }

  // Open or find ChatGPT tab
  const chatGPTTab = await openChatGPT();

  // Wait for tab to load
  await waitForTabLoad(chatGPTTab.id);

  // Insert text
  await chrome.tabs.sendMessage(chatGPTTab.id, {
    action: 'insertText',
    text: textPayload,
    autoSend: autoSend && !hasImage
  });

  // Handle tab focus
  if (hasImage) {
    // Focus immediately for manual paste
    await chrome.tabs.update(chatGPTTab.id, { active: true });
    showNotification('Ready to paste', 'Press Ctrl/Cmd+V to paste the screenshot');
  } else if (!autoSend) {
    // Focus for review
    await chrome.tabs.update(chatGPTTab.id, { active: true });
  } else {
    // Background send - focus when generation starts
    setTimeout(async () => {
      await chrome.tabs.update(chatGPTTab.id, { active: true });
    }, 1000);
  }

  // Clear queue if configured
  const settings = await chrome.storage.sync.get({ clearQueueAfterSend: true });
  if (settings.clearQueueAfterSend) {
    await queueManager.clearQueue();
  }
}

// Compose message from queue
async function composeMessage(queue, customPrompt = '') {
  let textParts = [];
  let hasImage = false;
  let imageData = null;

  if (customPrompt) {
    textParts.push(customPrompt);
  }

  for (const item of queue) {
    switch (item.type) {
      case 'url':
        textParts.push(`URL: ${item.url}\nTitle: ${item.title}\n`);
        break;

      case 'page_text':
        textParts.push(`Page: ${item.title}\nURL: ${item.url}\n\n${item.text}\n`);
        break;

      case 'youtube_transcript':
        textParts.push(`YouTube Video: ${item.title}\nURL: ${item.url}\nLanguage: ${item.language}\n\nTranscript:\n${item.text}\n`);
        break;

      case 'screenshot':
      case 'x_screenshot':
        // Only use the latest screenshot
        hasImage = true;
        imageData = item.imageData;
        textParts.push(`Screenshot from: ${item.title}\nURL: ${item.url}\n`);
        break;
    }

    textParts.push('---\n');
  }

  const textPayload = textParts.join('\n');

  return { textPayload, hasImage, imageData };
}

// Open or find ChatGPT tab
async function openChatGPT() {
  // Check for existing ChatGPT tab
  const tabs = await chrome.tabs.query({ url: 'https://chatgpt.com/*' });

  if (tabs.length > 0) {
    return tabs[0];
  }

  // Create new tab adjacent to current
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const newTab = await chrome.tabs.create({
    url: 'https://chatgpt.com/',
    active: false,
    index: currentTab ? currentTab.index + 1 : undefined
  });

  return newTab;
}

// Wait for tab to load
function waitForTabLoad(tabId, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(); // Resolve anyway after timeout
    }, timeout);

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Check if already loaded
    chrome.tabs.get(tabId, (tab) => {
      if (tab.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

// Helper functions
function extractYouTubeVideoId(url) {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

function hashURL(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

async function hashText(text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title,
    message
  });
}

// Content script functions (injected)
function extractPageText() {
  const selection = window.getSelection().toString().trim();

  if (selection) {
    return { text: selection, hasSelection: true };
  }

  // Extract main content (remove scripts, styles)
  const clone = document.body.cloneNode(true);
  const unwanted = clone.querySelectorAll('script, style, nav, header, footer, iframe');
  unwanted.forEach(el => el.remove());

  const text = clone.innerText.trim();
  return { text, hasSelection: false };
}

function extractYouTubeTranscript(videoId) {
  // Try to get transcript from UI
  const transcriptButton = document.querySelector('button[aria-label*="transcript" i], button[aria-label*="Show transcript" i]');

  if (transcriptButton && !transcriptButton.getAttribute('aria-pressed')) {
    transcriptButton.click();
  }

  // Wait a bit for transcript panel to load
  return new Promise((resolve) => {
    setTimeout(() => {
      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');

      if (transcriptSegments.length > 0) {
        let transcript = '';
        transcriptSegments.forEach(segment => {
          const textEl = segment.querySelector('.segment-text');
          if (textEl) {
            transcript += textEl.textContent.trim() + ' ';
          }
        });

        resolve({
          transcript: transcript.trim(),
          language: 'auto-detected'
        });
      } else {
        resolve(null); // Will fallback to URL
      }
    }, 500);
  });
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getQueue') {
    queueManager.getQueue().then(sendResponse);
    return true;
  }

  if (message.action === 'clearQueue') {
    queueManager.clearQueue().then(sendResponse);
    return true;
  }

  if (message.action === 'removeQueueItem') {
    queueManager.removeItem(message.index).then(sendResponse);
    return true;
  }

  if (message.action === 'triggerCommand') {
    // Get current tab and trigger the command
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        await handleCommand(message.command, tabs[0]);
      }
    });
    return true;
  }
});

// Helper function to handle command routing
async function handleCommand(command, tab) {
  switch (command) {
    case 'custom-send-1':
      await handleCustomSend(tab, 1);
      break;
    case 'custom-send-2':
      await handleCustomSend(tab, 2);
      break;
    case 'copy-page-text':
      await handleCopyPageText(tab);
      break;
  }
}

console.log('Clip-to-LLM background service worker loaded');
