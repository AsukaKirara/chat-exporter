document.getElementById('exportBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'Exporting...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // First inject the content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Small delay to ensure content script is loaded
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const conversation = await chrome.tabs.sendMessage(tab.id, {
      action: 'exportConversation'
    });
    
    if (!conversation) {
      statusDiv.textContent = 'No conversation found to export';
      return;
    }

    // Create and download the file
    const blob = new Blob([JSON.stringify(conversation, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    await chrome.downloads.download({
      url: url,
      filename: `conversation-${timestamp}.json`
    });

    statusDiv.textContent = 'Export successful!';
  } catch (error) {
    console.error('Export failed:', error);
    statusDiv.textContent = 'Export failed: ' + error.message;
  }
}); 