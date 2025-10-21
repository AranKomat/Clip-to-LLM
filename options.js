// Options page script

const DEFAULT_SETTINGS = {
  clearQueueAfterSend: true,
  sendAfterPaste: false,
  maxQueueItems: 25,
  maxImageSize: 25,
  custom1Prompt: 'Explain:\n',
  custom2Prompt: 'Translate:\n',
  siteOverrides: {}
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();

  // Event listeners
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  document.getElementById('addOverride').addEventListener('click', addSiteOverride);
});

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  // Load general settings
  document.getElementById('clearQueueAfterSend').checked = settings.clearQueueAfterSend;
  document.getElementById('sendAfterPaste').checked = settings.sendAfterPaste;
  document.getElementById('maxQueueItems').value = settings.maxQueueItems;
  document.getElementById('maxImageSize').value = settings.maxImageSize;
  document.getElementById('custom1Prompt').value = settings.custom1Prompt;
  document.getElementById('custom2Prompt').value = settings.custom2Prompt;

  // Load site overrides
  renderSiteOverrides(settings.siteOverrides);
}

async function saveSettings() {
  const settings = {
    clearQueueAfterSend: document.getElementById('clearQueueAfterSend').checked,
    sendAfterPaste: document.getElementById('sendAfterPaste').checked,
    maxQueueItems: parseInt(document.getElementById('maxQueueItems').value),
    maxImageSize: parseInt(document.getElementById('maxImageSize').value),
    custom1Prompt: document.getElementById('custom1Prompt').value,
    custom2Prompt: document.getElementById('custom2Prompt').value,
    siteOverrides: getSiteOverridesFromDOM()
  };

  await chrome.storage.sync.set(settings);

  // Show save confirmation
  const saveStatus = document.getElementById('saveStatus');
  saveStatus.classList.add('show');
  setTimeout(() => {
    saveStatus.classList.remove('show');
  }, 2000);
}

async function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) {
    return;
  }

  await chrome.storage.sync.set(DEFAULT_SETTINGS);
  await loadSettings();

  // Show save confirmation
  const saveStatus = document.getElementById('saveStatus');
  saveStatus.textContent = '✓ Reset to defaults';
  saveStatus.classList.add('show');
  setTimeout(() => {
    saveStatus.classList.remove('show');
    saveStatus.textContent = '✓ Saved';
  }, 2000);
}

function renderSiteOverrides(overrides) {
  const container = document.getElementById('siteOverrideList');
  container.innerHTML = '';

  Object.entries(overrides).forEach(([hostname, action]) => {
    const item = createSiteOverrideItem(hostname, action);
    container.appendChild(item);
  });
}

function createSiteOverrideItem(hostname = '', action = 'url') {
  const div = document.createElement('div');
  div.className = 'site-override-item';

  div.innerHTML = `
    <input type="text" placeholder="example.com" value="${hostname}">
    <select>
      <option value="url" ${action === 'url' ? 'selected' : ''}>URL</option>
      <option value="page_text" ${action === 'page_text' ? 'selected' : ''}>Page Text</option>
      <option value="screenshot" ${action === 'screenshot' ? 'selected' : ''}>Screenshot</option>
      <option value="youtube_transcript" ${action === 'youtube_transcript' ? 'selected' : ''}>YouTube Transcript</option>
    </select>
    <button class="remove-override">Remove</button>
  `;

  div.querySelector('.remove-override').addEventListener('click', () => {
    div.remove();
  });

  return div;
}

function addSiteOverride() {
  const container = document.getElementById('siteOverrideList');
  const item = createSiteOverrideItem();
  container.appendChild(item);
}

function getSiteOverridesFromDOM() {
  const overrides = {};
  const items = document.querySelectorAll('.site-override-item');

  items.forEach(item => {
    const hostname = item.querySelector('input').value.trim();
    const action = item.querySelector('select').value;

    if (hostname) {
      overrides[hostname] = action;
    }
  });

  return overrides;
}
