document.getElementById('signupBtn').addEventListener('click', signup);
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('googleBtn').addEventListener('click', loginWithGoogle);
document.getElementById('appleBtn').addEventListener('click', loginWithApple);
document.getElementById('logoutBtn').addEventListener('click', logout);

document.getElementById('exportBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'Exporting...';

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    statusDiv.textContent = 'Please log in first';
    return;
  }

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
    
    const BUCKET = 'chat-exports';
    const filePath = `${user.id}/${timestamp}.json`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, blob, { contentType: 'application/json' });

    if (uploadError) {
      statusDiv.textContent = 'Upload failed: ' + uploadError.message;
      return;
    }

    // Record metadata in Supabase
    const title = `${harmType} - ${modelName} - ${name} - ${timestamp}`;
    await supabase.from('records').insert({
      user_id: user.id,
      title,
      path: filePath
    });

    await chrome.downloads.download({
      url: url,
      filename: title + '.json'
    });

    statusDiv.textContent = 'Exported and uploaded!';
  } catch (error) {
    console.error('Export failed:', error);
    statusDiv.textContent = 'Export failed: ' + error.message;
  }
}); 