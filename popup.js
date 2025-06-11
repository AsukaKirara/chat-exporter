// Initialize UI state
document.addEventListener('DOMContentLoaded', async () => {
  await updateUIState();
});

// Auth event listeners
document.getElementById('signupBtn').addEventListener('click', async () => {
  await signup();
  await updateUIState();
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  await login();
  await updateUIState();
});

document.getElementById('googleBtn').addEventListener('click', async () => {
  await loginWithGoogle();
  await updateUIState();
});

document.getElementById('appleBtn').addEventListener('click', async () => {
  await loginWithApple();
  await updateUIState();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await logout();
  await updateUIState();
});

// Function to update UI based on authentication and subscription status
async function updateUIState() {
  const { data: { user } } = await supabase.auth.getUser();
  const loginSection = document.getElementById('loginSection');
  const userSection = document.getElementById('userSection');
  const userInfo = document.getElementById('userInfo');
  const subscriptionInfo = document.getElementById('subscriptionInfo');
  const dashboardLink = document.getElementById('dashboardLink');

  if (user) {
    // User is logged in
    loginSection.style.display = 'none';
    userSection.style.display = 'block';
    userInfo.textContent = `Logged in as: ${user.email}`;

    // Check subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    if (profile && profile.subscription_status === 'active') {
      subscriptionInfo.innerHTML = '<span style="color: green;">✓ Subscribed - Cloud backup enabled</span>';
      dashboardLink.style.display = 'block';
    } else {
      subscriptionInfo.innerHTML = '<span style="color: orange;">Subscribe for cloud backup and dashboard access</span>';
      dashboardLink.style.display = 'none';
    }
  } else {
    // User is not logged in
    loginSection.style.display = 'block';
    userSection.style.display = 'none';
  }
}

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

    // Create and download the JSON file (always available)
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

    const title = `${harmType} - ${modelName} - ${name} - ${timestamp}`;

    await chrome.downloads.download({
      url: url,
      filename: title + '.json'
    });

    // Check if user is logged in for additional features
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Check if user has subscription for HTML storage
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      if (profile && profile.subscription_status === 'active') {
        // Get HTML content for subscribed users
        const htmlContent = await chrome.tabs.sendMessage(tab.id, {
          action: 'exportHTML'
        });

        if (htmlContent) {
          // Store HTML record in database
          await supabase.from('records').insert({
            user_id: user.id,
            title,
            content_type: 'html',
            html_content: htmlContent,
            json_data: conversation
          });

          statusDiv.textContent = 'Exported and saved to your dashboard!';
        } else {
          statusDiv.textContent = 'Exported! (HTML backup failed)';
        }
      } else {
        statusDiv.textContent = 'Exported! Login and subscribe for cloud backup.';
      }
    } else {
      statusDiv.textContent = 'Exported! Login for cloud backup features.';
    }
  } catch (error) {
    console.error('Export failed:', error);
    statusDiv.textContent = 'Export failed: ' + error.message;
  }
});