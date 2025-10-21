// Queue Manager - Handles queue storage and de-duplication

export class QueueManager {
  constructor() {
    this.STORAGE_KEY = 'clipToLLM_queue';
    this.MAX_ITEMS = 25;
    this.MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25 MB
    this.DEDUP_WINDOW = 15000; // 15 seconds
  }

  async getQueue() {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || [];
  }

  async addItem(item) {
    const queue = await this.getQueue();

    // Check for duplicates within time window
    if (this.isDuplicate(item, queue)) {
      console.log('Duplicate item detected, skipping:', item);
      return false;
    }

    // Add new item
    queue.push(item);

    // Enforce limits
    await this.enforceLimit(queue);

    // Save queue
    await chrome.storage.local.set({ [this.STORAGE_KEY]: queue });

    return true;
  }

  isDuplicate(newItem, queue) {
    if (queue.length === 0) return false;

    const lastItem = queue[queue.length - 1];
    const timeDiff = newItem.timestamp - lastItem.timestamp;

    // Check if within dedup window
    if (timeDiff > this.DEDUP_WINDOW) return false;

    // Compare hashes
    return newItem.hash === lastItem.hash;
  }

  async enforceLimit(queue) {
    const settings = await chrome.storage.sync.get({
      maxQueueItems: this.MAX_ITEMS,
      maxImageSize: this.MAX_IMAGE_SIZE
    });

    // Remove old items if exceeding count limit
    while (queue.length > settings.maxQueueItems) {
      queue.shift();
    }

    // Check total image size
    let totalImageSize = 0;
    const imageItems = [];

    for (let i = queue.length - 1; i >= 0; i--) {
      const item = queue[i];
      if (item.type === 'screenshot' || item.type === 'x_screenshot') {
        totalImageSize += item.size || 0;
        imageItems.push(i);
      }
    }

    // Remove oldest images if exceeding size limit
    while (totalImageSize > settings.maxImageSize && imageItems.length > 1) {
      const oldestIndex = imageItems.pop();
      const removedItem = queue.splice(oldestIndex, 1)[0];
      totalImageSize -= removedItem.size || 0;
    }
  }

  async clearQueue() {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: [] });
  }

  async removeItem(index) {
    const queue = await this.getQueue();
    if (index >= 0 && index < queue.length) {
      queue.splice(index, 1);
      await chrome.storage.local.set({ [this.STORAGE_KEY]: queue });
    }
  }

  async getLatestScreenshot() {
    const queue = await this.getQueue();

    for (let i = queue.length - 1; i >= 0; i--) {
      const item = queue[i];
      if (item.type === 'screenshot' || item.type === 'x_screenshot') {
        return item;
      }
    }

    return null;
  }
}
