// Site Heuristics - Determines default capture action based on URL

export class SiteHeuristics {
  constructor() {
    this.rules = this.buildDefaultRules();
  }

  buildDefaultRules() {
    return [
      // High-confidence transcript/text sources
      {
        patterns: ['youtube.com/watch'],
        action: 'youtube_transcript',
        description: 'YouTube videos'
      },
      {
        patterns: ['ted.com/talks', 'coursera.org', 'edx.org'],
        action: 'page_text',
        description: 'Educational content with transcripts'
      },
      {
        patterns: [
          'medium.com',
          'substack.com',
          'dev.to',
          'hashnode.dev',
          'hackernoon.com'
        ],
        action: 'page_text',
        description: 'Reader-friendly article sites'
      },
      {
        patterns: [
          'developer.mozilla.org',
          'docs.python.org',
          'docs.rs',
          'go.dev/doc',
          'react.dev'
        ],
        action: 'page_text',
        description: 'Technical documentation'
      },

      // Visual-first / context-critical sites
      {
        patterns: ['twitter.com', 'x.com'],
        action: 'x_screenshot',
        description: 'X/Twitter posts'
      },
      {
        patterns: [
          'instagram.com',
          'pinterest.com',
          'behance.net',
          'dribbble.com'
        ],
        action: 'screenshot',
        description: 'Visual portfolio sites'
      },
      {
        patterns: ['figma.com/file', 'figma.com/board'],
        action: 'screenshot',
        description: 'Figma designs'
      },
      {
        patterns: [
          'maps.google.com',
          'google.com/maps',
          'mapbox.com'
        ],
        action: 'screenshot',
        description: 'Map interfaces'
      },
      {
        patterns: [
          'looker.com',
          'datastudio.google.com',
          'grafana.com'
        ],
        action: 'screenshot',
        description: 'Analytics dashboards'
      },

      // URL is usually sufficient
      {
        patterns: [
          'github.com/.*/.*', // Repo pages
          'gitlab.com'
        ],
        action: 'url',
        description: 'Code repositories'
      },

      // Full-text analysis-heavy
      {
        patterns: [
          'nytimes.com/.*/.*/.*', // Article URLs
          'washingtonpost.com',
          'theguardian.com',
          'reuters.com/article',
          'apnews.com/article'
        ],
        action: 'page_text',
        description: 'News articles'
      },
      {
        patterns: ['arxiv.org/abs'],
        action: 'page_text',
        description: 'arXiv abstracts'
      },
      {
        patterns: ['stackoverflow.com/questions'],
        action: 'page_text',
        description: 'Stack Overflow Q&A'
      },

      // Special cases - default to URL
      {
        patterns: [
          'arxiv.org/pdf',
          'docs.google.com',
          'drive.google.com'
        ],
        action: 'url',
        description: 'PDF viewers and Google Docs'
      }
    ];
  }

  getDefaultAction(url) {
    try {
      const urlObj = new URL(url);
      const fullPath = urlObj.hostname + urlObj.pathname;

      // Check against rules
      for (const rule of this.rules) {
        for (const pattern of rule.patterns) {
          if (this.matchesPattern(fullPath, pattern)) {
            return rule.action;
          }
        }
      }

      // Default to URL for unknown sites
      return 'url';
    } catch (e) {
      console.error('Error parsing URL:', e);
      return 'url';
    }
  }

  matchesPattern(url, pattern) {
    // Simple pattern matching - can be enhanced with regex
    if (pattern.includes('*')) {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      const regex = new RegExp(regexPattern);
      return regex.test(url);
    }

    return url.includes(pattern);
  }

  async getActionForUrl(url) {
    // Check user overrides first
    const overrides = await this.getUserOverrides();
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (overrides[hostname]) {
      return overrides[hostname];
    }

    // Use default heuristics
    return this.getDefaultAction(url);
  }

  async getUserOverrides() {
    const result = await chrome.storage.sync.get('siteOverrides');
    return result.siteOverrides || {};
  }

  async setUserOverride(hostname, action) {
    const overrides = await this.getUserOverrides();
    overrides[hostname] = action;
    await chrome.storage.sync.set({ siteOverrides: overrides });
  }

  async removeUserOverride(hostname) {
    const overrides = await this.getUserOverrides();
    delete overrides[hostname];
    await chrome.storage.sync.set({ siteOverrides: overrides });
  }
}
