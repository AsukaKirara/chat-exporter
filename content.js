console.log('Content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.action === 'exportConversation') {
    try {
      // Detect which interface we're on
      const url = window.location.href;
      console.log('Current URL:', url);
      
      let conversation = null;
      
      if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
        console.log('Detected ChatGPT interface');
        conversation = extractChatGPTConversation();
      } else if (url.includes('gemini.google.com')) {
        console.log('Detected Gemini interface');
        conversation = extractGeminiConversation();
      } else if (url.includes('claude.ai')) {
        console.log('Detected Claude interface');
        conversation = extractClaudeConversation();
      } else if (url.includes('chat.deepseek.com')) {
        console.log('Detected DeepSeek interface');
        conversation = extractDeepSeekConversation();
      } else if (url.includes('aistudio.google.com')) {
        console.log('Detected AIStudio interface');
        conversation = extractAIStudioConversation();
      }
      
      console.log('Extracted conversation:', conversation);
      sendResponse(conversation);
    } catch (error) {
      console.error('Error extracting conversation:', error);
      sendResponse(null);
    }
  }
  return true; // Required for async response
});

// ChatGPT conversation extractor
function extractChatGPTConversation() {
  const messages = [];
  
  // Try multiple potential container selectors for ChatGPT
  const container = 
    document.querySelector('.flex.flex-col.text-sm.md\\:pb-9') || // Primary selector based on your HTML
    document.querySelector('main div.flex.flex-col.items-center > div') || // Alternative location
    document.querySelector('.flex.flex-col.text-sm'); // Fallback to our original selector
  
  console.log('Found ChatGPT container:', container);
  
  if (!container) {
    console.log('No ChatGPT container found');
    return null;
  }

  // Get all conversation turns
  const turns = container.querySelectorAll('article[data-testid^="conversation-turn-"]');
  console.log('Found conversation turns:', turns.length);
  
  // Process each turn to extract messages
  turns.forEach(turn => {
    // Extract user message
    const userMessage = turn.querySelector('[data-message-author-role="user"]');
    if (userMessage) {
      const text = userMessage.querySelector('.whitespace-pre-wrap')?.innerText?.trim();
      if (text) {
        messages.push({
          role: 'user',
          content: [{ type: 'text', text }]
        });
      }
    }
    
    // Extract assistant message
    const assistantMessage = turn.querySelector('[data-message-author-role="assistant"]');
    if (assistantMessage) {
      const text = assistantMessage.querySelector('.markdown')?.innerText?.trim();
      if (text) {
        messages.push({
          role: 'assistant',
          content: [{ type: 'text', text }]
        });
      }
    }
  });

  console.log('Found ChatGPT messages:', messages.length);
  return messages.length ? { messages } : null;
}

// Gemini conversation extractor
function extractGeminiConversation() {
  try {
    const messages = [];
    
    // Log all conversation containers for debugging
    const allContainers = document.querySelectorAll('.conversation-container');
    console.log('All conversation containers:', allContainers.length);
    
    // Try to get the most complete container
    const mainContainer = document.querySelector('main');
    console.log('Main container:', mainContainer);
    
    if (!mainContainer) {
      console.log('No main container found');
      return null;
    }

    // Collect all user and assistant messages in order
    const userQueries = mainContainer.querySelectorAll('user-query');
    const modelResponses = mainContainer.querySelectorAll('model-response');
    
    console.log('Found user queries:', userQueries.length);
    console.log('Found model responses:', modelResponses.length);
    
    // Create a combined timeline of messages
    const timeline = [];
    
    // Add user messages to timeline with position info
    userQueries.forEach((query, index) => {
      const rect = query.getBoundingClientRect();
      timeline.push({
        type: 'user',
        element: query,
        position: rect.top,
        index: index
      });
    });
    
    // Add assistant messages to timeline with position info
    modelResponses.forEach((response, index) => {
      const rect = response.getBoundingClientRect();
      timeline.push({
        type: 'assistant',
        element: response,
        position: rect.top,
        index: index
      });
    });
    
    // Sort timeline by vertical position
    timeline.sort((a, b) => a.position - b.position);
    
    console.log('Timeline created with entries:', timeline.length);
    
    // Process timeline to extract messages in order
    timeline.forEach(entry => {
      if (entry.type === 'user') {
        const queryText = entry.element.querySelector('.query-text');
        if (queryText) {
          const text = queryText.innerText.trim();
          if (text) {
            messages.push({
              role: 'user',
              content: [{ type: 'text', text }]
            });
          }
        }
      } else if (entry.type === 'assistant') {
        const markdown = entry.element.querySelector('.markdown');
        if (markdown) {
          const text = markdown.innerText.trim();
          if (text) {
            messages.push({
              role: 'assistant',
              content: [{ type: 'text', text }]
            });
          }
        }
      }
    });

    console.log('Final Gemini messages array:', messages);
    return messages.length ? { messages } : null;
  } catch (error) {
    console.error('Error in extractGeminiConversation:', error);
    return null;
  }
}

// Claude conversation extractor
function extractClaudeConversation() {
  try {
    const messages = [];
    
    // Find main container
    const container = document.querySelector('.flex-1.flex.flex-col.gap-3');
    console.log('Found Claude container:', container);
    
    if (!container) {
      console.log('No Claude container found');
      return null;
    }

    // Find user messages
    const userMessages = container.querySelectorAll('[data-testid="user-message"]');
    console.log('Found Claude user messages:', userMessages.length);
    
    // Find assistant messages
    const assistantContainers = container.querySelectorAll('.font-claude-message');
    console.log('Found Claude assistant messages:', assistantContainers.length);
    
    // Create a timeline of all message elements ordered by their position
    const timeline = [];
    
    // Add user messages to timeline
    userMessages.forEach((message, index) => {
      const messageContainer = message.closest('.group.relative.inline-flex');
      if (messageContainer) {
        const rect = messageContainer.getBoundingClientRect();
        timeline.push({
          type: 'user',
          element: message,
          position: rect.top,
          index: index
        });
      }
    });
    
    // Add assistant messages to timeline
    assistantContainers.forEach((message, index) => {
      const rect = message.getBoundingClientRect();
      timeline.push({
        type: 'assistant',
        element: message,
        position: rect.top,
        index: index
      });
    });
    
    // Sort timeline by vertical position
    timeline.sort((a, b) => a.position - b.position);
    
    console.log('Claude timeline created with entries:', timeline.length);
    
    // Process timeline to extract messages in order
    timeline.forEach(entry => {
      if (entry.type === 'user') {
        const text = entry.element.querySelector('p.whitespace-pre-wrap')?.innerText?.trim();
        if (text) {
          messages.push({
            role: 'user',
            content: [{ type: 'text', text }]
          });
        }
      } else if (entry.type === 'assistant') {
        const text = entry.element.querySelector('p.whitespace-pre-wrap')?.innerText?.trim();
        if (text) {
          messages.push({
            role: 'assistant',
            content: [{ type: 'text', text }]
          });
        }
      }
    });

    console.log('Final Claude messages array:', messages);
    return messages.length ? { messages } : null;
  } catch (error) {
    console.error('Error in extractClaudeConversation:', error);
    return null;
  }
}

// DeepSeek conversation extractor
function extractDeepSeekConversation() {
  try {
    const messages = [];
    
    // Find the main container
    const container = document.querySelector('body'); // Start from body since we don't have a specific class for the main container
    
    if (!container) {
      console.log('No DeepSeek container found');
      return null;
    }

    // Create a timeline of all message elements ordered by their position
    const timeline = [];
    
    // Find user messages
    const userMessages = container.querySelectorAll('.dad65929 .fbb737a4');
    console.log('Found DeepSeek user messages:', userMessages.length);
    
    // Find assistant messages
    const assistantMessages = container.querySelectorAll('.f9bf7997 .ds-markdown--block');
    console.log('Found DeepSeek assistant messages:', assistantMessages.length);
    
    // Add user messages to timeline
    userMessages.forEach((message, index) => {
      const rect = message.getBoundingClientRect();
      timeline.push({
        type: 'user',
        element: message,
        position: rect.top,
        index: index
      });
    });
    
    // Add assistant messages to timeline
    assistantMessages.forEach((message, index) => {
      const rect = message.getBoundingClientRect();
      timeline.push({
        type: 'assistant',
        element: message,
        position: rect.top,
        index: index
      });
    });
    
    // Sort timeline by vertical position
    timeline.sort((a, b) => a.position - b.position);
    
    console.log('DeepSeek timeline created with entries:', timeline.length);
    
    // Process timeline to extract messages in order
    timeline.forEach(entry => {
      if (entry.type === 'user') {
        const text = entry.element.innerText?.trim();
        if (text) {
          messages.push({
            role: 'user',
            content: [{ type: 'text', text }]
          });
        }
      } else if (entry.type === 'assistant') {
        const text = entry.element.innerText?.trim();
        if (text) {
          messages.push({
            role: 'assistant',
            content: [{ type: 'text', text }]
          });
        }
      }
    });
    
    console.log('Final DeepSeek messages array:', messages);
    return messages.length ? { messages } : null;
  } catch (error) {
    console.error('Error in extractDeepSeekConversation:', error);
    return null;
  }
}

// AIStudio conversation extractor
function extractAIStudioConversation() {
  try {
    const messages = [];
    
    // Find all chat turns
    const chatTurns = document.querySelectorAll('ms-chat-turn');
    console.log('Found AIStudio chat turns:', chatTurns.length);
    
    if (!chatTurns.length) {
      console.log('No AIStudio chat turns found');
      return null;
    }

    // Create a timeline for ordering
    const timeline = [];
    
    // Process each turn
    chatTurns.forEach((turn, index) => {
      const rect = turn.getBoundingClientRect();
      
      // Check if user or assistant message
      if (turn.querySelector('.user-prompt-container')) {
        timeline.push({
          type: 'user',
          element: turn,
          position: rect.top,
          index: index
        });
      } else if (turn.querySelector('.model-prompt-container')) {
        timeline.push({
          type: 'assistant',
          element: turn,
          position: rect.top,
          index: index
        });
      }
    });
    
    // Sort timeline by vertical position
    timeline.sort((a, b) => a.position - b.position);
    
    console.log('AIStudio timeline created with entries:', timeline.length);
    
    // Process timeline to extract messages
    timeline.forEach(entry => {
      if (entry.type === 'user') {
        const container = entry.element.querySelector('.user-prompt-container');
        if (container) {
          const text = container.innerText.trim();
          if (text) {
            messages.push({
              role: 'user',
              content: [{ type: 'text', text }]
            });
          }
        }
      } else if (entry.type === 'assistant') {
        const container = entry.element.querySelector('.model-prompt-container');
        if (container) {
          const text = container.innerText.trim();
          if (text) {
            messages.push({
              role: 'assistant',
              content: [{ type: 'text', text }]
            });
          }
        }
      }
    });
    
    console.log('Final AIStudio messages array:', messages);
    return messages.length ? { messages } : null;
  } catch (error) {
    console.error('Error in extractAIStudioConversation:', error);
    return null;
  }
} 