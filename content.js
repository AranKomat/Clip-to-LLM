// Content script injected into all pages

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractPageText') {
    const result = extractPageText();
    sendResponse(result);
    return true;
  }

  if (message.action === 'extractYouTubeTranscript') {
    extractYouTubeTranscript(message.videoId).then(sendResponse);
    return true;
  }
});

function extractPageText() {
  const selection = window.getSelection().toString().trim();

  if (selection) {
    return { text: selection, hasSelection: true };
  }

  // Extract main content (remove scripts, styles)
  const clone = document.body.cloneNode(true);
  const unwanted = clone.querySelectorAll('script, style, nav, header, footer, iframe, [role="navigation"], [role="complementary"], .advertisement, .ads');
  unwanted.forEach(el => el.remove());

  const text = clone.innerText.trim();
  return { text, hasSelection: false };
}

async function extractYouTubeTranscript(videoId) {
  // First try to get transcript from timedtext API
  const timedTextTranscript = await fetchTimedTextTranscript(videoId);
  if (timedTextTranscript) {
    return timedTextTranscript;
  }

  // Fallback to UI transcript
  return await extractTranscriptFromUI();
}

async function fetchTimedTextTranscript(videoId) {
  try {
    // Get available caption tracks
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();

    // Extract caption track URLs from player config
    const captionTracksMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (!captionTracksMatch) {
      return null;
    }

    const captionTracks = JSON.parse(captionTracksMatch[1]);
    if (captionTracks.length === 0) {
      return null;
    }

    // Prefer language order: browser lang, en, then first available
    const browserLang = navigator.language.split('-')[0];
    const langPriority = [navigator.language, browserLang, 'en'];

    let selectedTrack = null;
    for (const lang of langPriority) {
      selectedTrack = captionTracks.find(track =>
        track.languageCode === lang || track.languageCode.startsWith(lang)
      );
      if (selectedTrack) break;
    }

    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    // Fetch transcript
    const transcriptResponse = await fetch(selectedTrack.baseUrl);
    const transcriptXml = await transcriptResponse.text();

    // Parse XML and extract text
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(transcriptXml, 'text/xml');
    const textNodes = xmlDoc.querySelectorAll('text');

    let transcript = '';
    textNodes.forEach(node => {
      const text = node.textContent.replace(/\n/g, ' ').trim();
      transcript += text + ' ';
    });

    return {
      transcript: transcript.trim(),
      language: selectedTrack.languageCode
    };
  } catch (error) {
    console.error('Error fetching timedtext transcript:', error);
    return null;
  }
}

async function extractTranscriptFromUI() {
  return new Promise((resolve) => {
    // Try to open transcript panel if not already open
    const transcriptButton = document.querySelector('button[aria-label*="transcript" i], button[aria-label*="Show transcript" i]');

    if (transcriptButton && transcriptButton.getAttribute('aria-pressed') !== 'true') {
      transcriptButton.click();
    }

    // Wait for transcript panel to load
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
        resolve(null); // No transcript available
      }
    }, 1000);
  });
}

console.log('Clip-to-LLM content script loaded');
