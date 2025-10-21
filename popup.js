// Popup UI script

document.addEventListener('DOMContentLoaded', async () => {
  await loadQueue();

  // Event listeners
  document.getElementById('clearQueue').addEventListener('click', clearQueue);
  document.getElementById('openSettings').addEventListener('click', openSettings);
  document.getElementById('viewAllShortcuts').addEventListener('click', showShortcuts);

  // Quick action buttons
  document.getElementById('explainBtn').addEventListener('click', () => triggerCommand('custom-send-1'));
  document.getElementById('translateBtn').addEventListener('click', () => triggerCommand('custom-send-2'));
  document.getElementById('copyTextBtn').addEventListener('click', () => triggerCommand('copy-page-text'));
});

async function loadQueue() {
  const response = await chrome.runtime.sendMessage({ action: 'getQueue' });
  const queue = response || [];

  const queueList = document.getElementById('queueList');
  const queueCount = document.getElementById('queueCount');

  queueCount.textContent = `${queue.length} item${queue.length !== 1 ? 's' : ''}`;

  if (queue.length === 0) {
    queueList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div>Queue is empty</div>
        <div style="font-size: 12px; margin-top: 8px;">Use Ctrl+Shift+C to save content</div>
      </div>
    `;
    return;
  }

  queueList.innerHTML = '';

  queue.forEach((item, index) => {
    const itemEl = createQueueItemElement(item, index);
    queueList.appendChild(itemEl);
  });
}

function createQueueItemElement(item, index) {
  const div = document.createElement('div');
  div.className = 'queue-item';

  const typeLabel = {
    url: 'URL',
    page_text: 'Page Text',
    youtube_transcript: 'YouTube Transcript',
    screenshot: 'Screenshot',
    x_screenshot: 'X/Twitter Screenshot'
  }[item.type] || item.type;

  let preview = '';

  if (item.type === 'page_text' || item.type === 'youtube_transcript') {
    const previewText = item.text.substring(0, 150);
    preview = `<div class="queue-item-preview">${escapeHtml(previewText)}${item.text.length > 150 ? '...' : ''}</div>`;
  }

  if (item.type === 'screenshot' || item.type === 'x_screenshot') {
    preview = `<div class="screenshot-indicator" style="background-image: url('${item.imageData}')"></div>`;
  }

  div.innerHTML = `
    <div class="queue-item-header">
      <div class="queue-item-type">${typeLabel}</div>
      <button class="queue-item-remove" data-index="${index}">×</button>
    </div>
    <div class="queue-item-title">${escapeHtml(item.title)}</div>
    <div class="queue-item-url">${escapeHtml(item.url)}</div>
    ${preview}
  `;

  // Add remove button handler
  div.querySelector('.queue-item-remove').addEventListener('click', () => {
    removeQueueItem(index);
  });

  return div;
}

async function clearQueue() {
  if (!confirm('Clear all items from the queue?')) {
    return;
  }

  await chrome.runtime.sendMessage({ action: 'clearQueue' });
  await loadQueue();
}

async function removeQueueItem(index) {
  await chrome.runtime.sendMessage({
    action: 'removeQueueItem',
    index
  });
  await loadQueue();
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

function showShortcuts() {
  chrome.tabs.create({
    url: 'chrome://extensions/shortcuts'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function triggerCommand(command) {
  // Send message to background to trigger command
  await chrome.runtime.sendMessage({
    action: 'triggerCommand',
    command
  });

  // Close popup
  window.close();
}
