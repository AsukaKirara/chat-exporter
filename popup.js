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
    
    // Extract metadata for filename
    let harmType = 'None';
    let modelName = 'Unknown';
    let name = 'Conversation';
    
    // Look for metadata in the first assistant message
    if (conversation && conversation.messages) {
      const assistantMessage = conversation.messages.find(msg => msg.role === 'assistant');
      if (assistantMessage && assistantMessage.metadata) {
        harmType = assistantMessage.metadata.harmType || 'None';
        modelName = assistantMessage.metadata.model || 'Unknown';
        name = assistantMessage.metadata.name || 'Conversation';
      }
    }
    
    await chrome.downloads.download({
      url: url,
      filename: `${harmType} - ${modelName} - ${name} - ${timestamp}.json`
    });

    statusDiv.textContent = 'Export successful!';
  } catch (error) {
    console.error('Export failed:', error);
    statusDiv.textContent = 'Export failed: ' + error.message;
  }
}); 