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
        const messageObj = {
          role: 'user',
          content: [{ type: 'text', text }]
        };
        
        // Extract metadata if available
        const metadata = {};
        
        // Look for model name
        const modelSlug = userMessage.getAttribute('data-message-model-slug');
        if (modelSlug) {
          metadata.model = modelSlug;
        }
        
        // Look for reasoning button and content
        const reasoningButton = turn.querySelector('button.inline.w-full.text-start');
        if (reasoningButton) {
          const reasoningSpan = reasoningButton.querySelector('span.align-middle');
          if (reasoningSpan && reasoningSpan.textContent.includes('Reasoned for')) {
            const reasoningContainer = reasoningButton.parentElement.nextElementSibling;
            if (reasoningContainer && reasoningContainer.classList.contains('relative')) {
              metadata.reasoning = reasoningContainer.textContent.trim();
            }
          }
        }
        
        if (Object.keys(metadata).length > 0) {
          messageObj.metadata = metadata;
        }
        
        messages.push(messageObj);
      }
    }
    
    // Extract assistant message
    const assistantMessage = turn.querySelector('[data-message-author-role="assistant"]');
    if (assistantMessage) {
      const markdownContent = assistantMessage.querySelector('.markdown');
      if (markdownContent) {
        const text = markdownContent.innerText.trim();
        if (text) {
          const messageObj = {
            role: 'assistant',
            content: [{ type: 'text', text }]
          };
          
          // Extract metadata if available
          const metadata = {};
          
          // Look for model name
          const modelSlug = assistantMessage.getAttribute('data-message-model-slug');
          if (modelSlug) {
            metadata.model = modelSlug;
          }
          
          // Find and extract chain of thought/reasoning
          const reasoningButton = turn.querySelector('button.inline.w-full.text-start');
          if (reasoningButton) {
            const reasoningLabel = reasoningButton.querySelector('span.align-middle');
            if (reasoningLabel && reasoningLabel.textContent.includes('Reasoned for')) {
              // The reasoning content is in the next sibling after the button
              const reasoningContainer = reasoningButton.nextElementSibling;
              if (reasoningContainer && reasoningContainer.classList.contains('relative')) {
                // Look for the markdown content within the reasoning section
                const reasoningMarkdown = reasoningContainer.querySelector('._markdown_1frq2_10, .text-token-text-secondary.markdown');
                if (reasoningMarkdown) {
                  metadata.reasoning = reasoningMarkdown.innerText.trim();
                } else {
                  // Fallback to get all text from the reasoning container
                  const reasoningText = reasoningContainer.querySelector('.flex .text-token-text-secondary');
                  if (reasoningText) {
                    metadata.reasoning = reasoningText.innerText.trim();
                  }
                }
              }
            }
          }
          
          if (Object.keys(metadata).length > 0) {
            messageObj.metadata = metadata;
          }
          
          messages.push(messageObj);
        }
      }
    }
  });

  console.log('Found ChatGPT messages:', messages.length);
  return messages.length ? { messages } : null;
}

// DeepSeek conversation extractor
function extractDeepSeekConversation() {
  try {
    console.log('Extracting DeepSeek conversation');
    
    const messages = [];
    
    // The main div holding the conversation has 'dad65929' class
    // User messages have 'fa81' class
    // Assistant messages have 'f9bf7997' class
    
    // Find the conversation container
    const conversationContainer = document.querySelector('.dad65929');
    console.log('Found DeepSeek conversation container:', !!conversationContainer);
    
    if (conversationContainer) {
      // Get all message elements in order (both user and assistant)
      const allMessages = [];
      
      // Get user messages (fa81)
      const userMessages = Array.from(document.querySelectorAll('.fa81'));
      userMessages.forEach(el => {
        allMessages.push({
          element: el,
          type: 'user',
          position: el.getBoundingClientRect().top
        });
      });
      
      // Get assistant messages (f9bf7997)
      const assistantMessages = Array.from(document.querySelectorAll('.f9bf7997'));
      assistantMessages.forEach(el => {
        allMessages.push({
          element: el,
          type: 'assistant',
          position: el.getBoundingClientRect().top
        });
      });
      
      // Sort messages by vertical position to get the correct conversation flow
      allMessages.sort((a, b) => a.position - b.position);
      
      console.log(`Found ${userMessages.length} user messages and ${assistantMessages.length} assistant messages, total: ${allMessages.length}`);
      
      // Process each message in order
      allMessages.forEach((item, index) => {
        if (item.type === 'user') {
          // Extract user message content
          const contentElement = item.element.querySelector('.fbb737a4') || item.element;
          const text = contentElement.textContent.trim();
          
          if (text) {
            messages.push({
              role: 'user',
              content: [{ type: 'text', text }]
            });
            console.log(`Extracted user message ${index}: ${text.substring(0, 30)}...`);
          }
        } else if (item.type === 'assistant') {
          // Extract assistant message content
          // Try multiple possible content elements
          const possibleContentElements = [
            item.element.querySelector('.ds-markdown--block'), 
            item.element.querySelector('.b0a51e35'),
            item.element.querySelector('div[class*="markdown"]'),
            item.element.querySelector('p'),
            item.element // If no specific content element found, use the whole message
          ];
          
          // Find the first non-null content element
          const contentElement = possibleContentElements.find(el => el !== null);
          
          if (contentElement) {
            const text = contentElement.textContent.trim();
            
            if (text) {
              const messageObj = {
                role: 'assistant',
                content: [{ type: 'text', text }]
              };
              
              // Extract metadata (model name and reasoning)
              const metadata = {};
              
              // Look for model selector
              const modelSelector = document.querySelector('.model-select-button');
              if (modelSelector) {
                metadata.model = modelSelector.textContent.trim();
              }
              
              // Look for reasoning/thinking section
              const reasoningContainer = item.element.querySelector('.e1675d8b, .thinking-section');
              if (reasoningContainer) {
                const reasoningText = reasoningContainer.textContent.trim();
                metadata.reasoning = reasoningText;
                // Update model if we found reasoning
                metadata.model = 'deepseek-r1';
              } else {
                metadata.model = 'deepseek-v3';
              }
              
              // Only add metadata if we found something
              if (Object.keys(metadata).length > 0) {
                messageObj.metadata = metadata;
              }
              
              messages.push(messageObj);
              console.log(`Extracted assistant message ${index}: ${text.substring(0, 30)}...`);
            }
          }
        }
      });
      
      console.log('Final DeepSeek messages array:', messages);
      if (messages.length > 0) {
        return { messages };
      }
    }
    
    // If the direct approach failed, try an alternative approach
    console.log('Direct approach failed, trying alternative approach...');
    
    // If we can't find the conversation container, try just looking for all messages directly
    const userElements = document.querySelectorAll('.fa81');
    const assistantElements = document.querySelectorAll('.f9bf7997');
    
    if (userElements.length > 0 || assistantElements.length > 0) {
      // Create a combined timeline
      const timeline = [];
      
      // Process user messages
      userElements.forEach(element => {
        const contentElement = element.querySelector('.fbb737a4') || element;
        const text = contentElement.textContent.trim();
        
        if (text) {
          timeline.push({
            type: 'user',
            text: text,
            position: element.getBoundingClientRect().top
          });
        }
      });
      
      // Process assistant messages
      assistantElements.forEach(element => {
        const contentElements = [
          element.querySelector('.ds-markdown--block'),
          element.querySelector('.b0a51e35'),
          element.querySelector('div[class*="markdown"]'),
          element.querySelector('p'),
          element
        ];
        
        const contentElement = contentElements.find(el => el !== null);
        
        if (contentElement) {
          const text = contentElement.textContent.trim();
          
          if (text) {
            timeline.push({
              type: 'assistant',
              text: text,
              position: element.getBoundingClientRect().top,
              element: element // Keep reference for metadata extraction
            });
          }
        }
      });
      
      // Sort by position to maintain correct conversation order
      timeline.sort((a, b) => a.position - b.position);
      
      // Convert to messages array
      timeline.forEach(item => {
        if (item.type === 'user') {
          messages.push({
            role: 'user',
            content: [{ type: 'text', text: item.text }]
          });
        } else {
          const messageObj = {
            role: 'assistant',
            content: [{ type: 'text', text: item.text }]
          };
          
          // Extract metadata if available
          const metadata = {};
          
          const modelSelector = document.querySelector('.model-select-button');
          if (modelSelector) {
            metadata.model = modelSelector.textContent.trim();
          }
          
          // If there's a reference to the original element, check for reasoning
          if (item.element) {
            const reasoningContainer = item.element.querySelector('.e1675d8b, .thinking-section');
            if (reasoningContainer) {
              metadata.reasoning = reasoningContainer.textContent.trim();
              metadata.model = 'deepseek-r1';
            }
          }
          
          if (Object.keys(metadata).length > 0) {
            messageObj.metadata = metadata;
          }
          
          messages.push(messageObj);
        }
      });
      
      console.log('Final DeepSeek messages using direct class approach:', messages);
      if (messages.length > 0) {
        return { messages };
      }
    }
    
    // If both approaches failed, fall back to our original method
    console.log('Both specific approaches failed, falling back to original method...');
    
    // First try the direct method
    const messageContainers = document.querySelectorAll('.dad65929, .f9bf7997, .deep-chat-message, .deep-chat-message-container, .fa81');
    console.log('Found DeepSeek message containers using fallback method:', messageContainers.length);
    
    if (!messageContainers.length) {
      console.log('No DeepSeek message containers found');
      return null;
    }
    
    // Create a timeline based on position
    const fallbackTimeline = [];
    
    // Process each container
    Array.from(messageContainers).forEach(container => {
      // Check if this is a user or assistant message
      const isUser = 
        container.classList.contains('fa81') || 
        container.classList.contains('deep-chat-user-message') ||
        container.querySelector('.fbb737a4, .deep-chat-user-avatar') !== null;
      
      const isAssistant = 
        container.classList.contains('f9bf7997') || 
        container.classList.contains('deep-chat-model-message') ||
        container.querySelector('.ds-markdown--block, .deep-chat-model-avatar') !== null;
      
      if (isUser) {
        // Extract user message
        const contentElement = container.querySelector('.fbb737a4, .deep-chat-message-content, .message-content') || container;
        const text = contentElement.textContent.trim();
        
        if (text) {
          fallbackTimeline.push({
            type: 'user',
            text: text,
            position: container.getBoundingClientRect().top
          });
        }
      } else if (isAssistant) {
        // Extract assistant message
        const contentElement = container.querySelector('.ds-markdown--block, .deep-chat-message-content, .message-content, .b0a51e35') || container;
        const text = contentElement.textContent.trim();
        
        if (text) {
          fallbackTimeline.push({
            type: 'assistant',
            text: text,
            position: container.getBoundingClientRect().top,
            container: container // Keep reference for metadata
          });
        }
      }
    });
    
    // Sort by position
    fallbackTimeline.sort((a, b) => a.position - b.position);
    
    // Convert to messages
    fallbackTimeline.forEach(item => {
      if (item.type === 'user') {
        messages.push({
          role: 'user',
          content: [{ type: 'text', text: item.text }]
        });
      } else {
        const messageObj = {
          role: 'assistant',
          content: [{ type: 'text', text: item.text }]
        };
        
        // Extract metadata
        const metadata = {};
        
        const modelSelector = document.querySelector('.model-select-button');
        if (modelSelector) {
          metadata.model = modelSelector.textContent.trim();
        }
        
        if (item.container) {
          const reasoningContainer = item.container.querySelector('.e1675d8b, .thinking-section');
          if (reasoningContainer) {
            metadata.reasoning = reasoningContainer.textContent.trim();
            metadata.model = 'deepseek-r1';
          }
        }
        
        if (Object.keys(metadata).length > 0) {
          messageObj.metadata = metadata;
        }
        
        messages.push(messageObj);
      }
    });
    
    console.log('Final DeepSeek messages using fallback timeline approach:', messages);
    return messages.length ? { messages } : null;
    
  } catch (error) {
    console.error('Error in extractDeepSeekConversation:', error);
    return null;
  }
}

// Claude conversation extractor
function extractClaudeConversation() {
  try {
    console.log('Extracting Claude conversation');
    const messages = [];
    
    // Find the conversation container - the exact class may vary, so try a few options
    const conversationContainer = 
      document.querySelector('.flex-1.flex.flex-col.gap-3') ||
      document.querySelector('.flex.h-full.w-full.max-w-3xl.flex-1.flex-col');
    
    if (!conversationContainer) {
      console.log('No Claude conversation container found');
      return null;
    }
    
    // Find all message elements
    const allElements = Array.from(conversationContainer.children);
    const messageElements = allElements.filter(el => el.hasAttribute('data-test-render-count'));
    
    console.log('Found Claude message elements:', messageElements.length);
    
    if (!messageElements.length) {
      console.log('No Claude messages found');
      return null;
    }
    
    // Create a timeline for proper message ordering
    const timeline = [];
    
    // Process each message element
    messageElements.forEach(element => {
      // Check for user message
      const userMessageGroup = element.querySelector('.group');
      if (userMessageGroup && userMessageGroup.querySelector('[data-testid="user-message"]')) {
        const userMessage = userMessageGroup.querySelector('[data-testid="user-message"]');
        const paragraphs = userMessage.querySelectorAll('p.whitespace-pre-wrap');
        
        if (paragraphs.length) {
          const text = Array.from(paragraphs)
            .map(p => p.textContent.trim())
            .join('\n\n')
            .trim();
          
          if (text) {
            timeline.push({
              type: 'user',
              text: text,
              position: element.getBoundingClientRect().top
            });
          }
        }
      }
      
      // Check for assistant message
      const assistantContainer = element.querySelector('div[data-is-streaming="false"]');
      if (assistantContainer) {
        const claudeMessage = assistantContainer.querySelector('.font-claude-message');
        if (claudeMessage) {
          // Get all content divs (may include thoughts panel and response)
          const contentDivs = claudeMessage.querySelectorAll('div > div.grid-cols-1');
          
          // The last content div should contain the actual message
          if (contentDivs.length) {
            const mainContentDiv = contentDivs[contentDivs.length - 1];
            const paragraphs = mainContentDiv.querySelectorAll('p.whitespace-pre-wrap');
            
            let text;
            if (paragraphs.length) {
              text = Array.from(paragraphs)
                .map(p => p.textContent.trim())
                .join('\n\n')
                .trim();
            } else {
              text = mainContentDiv.textContent.trim();
            }
            
            // Look for thinking content
            let thinking = null;
            const thoughtsPanel = claudeMessage.querySelector('.mb-2.border-0\\.5.border-border-300.rounded-lg');
            
            if (thoughtsPanel) {
              // Find the thought process button
              const thoughtsButtonText = thoughtsPanel.querySelector('button span.text-left');
              
              if (thoughtsButtonText && thoughtsButtonText.textContent.includes('Thought process')) {
                // Find the thoughts content
                const thoughtsContentDiv = thoughtsPanel.querySelector('.overflow-hidden .grid-cols-1, .max-h-80 .grid-cols-1');
                
                if (thoughtsContentDiv) {
                  const thoughtsParagraphs = thoughtsContentDiv.querySelectorAll('p.whitespace-pre-wrap');
                  
                  if (thoughtsParagraphs.length) {
                    thinking = Array.from(thoughtsParagraphs)
                      .map(p => p.textContent.trim())
                      .join('\n\n')
                      .trim();
                  } else {
                    thinking = thoughtsContentDiv.textContent.trim();
                  }
                }
              }
            }
            
            timeline.push({
              type: 'assistant',
              text: text,
              thinking: thinking,
              position: element.getBoundingClientRect().top
            });
          }
        }
      }
    });
    
    // Log what we found for debugging
    console.log('Claude timeline before sorting:', timeline.map(item => ({
      type: item.type,
      position: item.position,
      textPreview: item.text.substring(0, 30) + '...'
    })));
    
    // Sort timeline by vertical position
    timeline.sort((a, b) => a.position - b.position);
    
    console.log('Claude timeline after sorting:', timeline.map(item => ({
      type: item.type,
      position: item.position,
      textPreview: item.text.substring(0, 30) + '...'
    })));
    
    // Convert timeline to messages array
    timeline.forEach(item => {
      if (item.type === 'user') {
        const messageObj = {
          role: 'user',
          content: [{ type: 'text', text: item.text }]
        };
        messages.push(messageObj);
      } else if (item.type === 'assistant') {
        const messageObj = {
          role: 'assistant',
          content: [{ type: 'text', text: item.text }]
        };
        
        // Extract metadata
        const metadata = {};
        
        // Get model name
        const modelName = getClaudeModelName();
        if (modelName) {
          metadata.model = modelName;
        }
        
        // Add thinking as reasoning if present
        if (item.thinking) {
          metadata.reasoning = item.thinking;
        }
        
        // Only add metadata if we found something
        if (Object.keys(metadata).length > 0) {
          messageObj.metadata = metadata;
        }
        
        messages.push(messageObj);
      }
    });
    
    console.log('Final Claude messages array with metadata:', messages);
    return messages.length ? { messages } : null;
  } catch (error) {
    console.error('Error in extractClaudeConversation:', error);
    return null;
  }
}

// Helper function to get Claude model name
function getClaudeModelName() {
  try {
    // Look for the model selector dropdown
    const modelSelector = document.querySelector('[data-testid="model-selector-dropdown"]');
    if (modelSelector) {
      // Try to find the specific element with the model name
      const modelNameElement = modelSelector.querySelector('.whitespace-nowrap.tracking-tight');
      if (modelNameElement) {
        return "Claude " + modelNameElement.textContent.trim();
      }
      
      // If that doesn't work, try to extract it from the button text using regex
      const buttonText = modelSelector.textContent.trim();
      const matches = buttonText.match(/\d+\.\d+\s+\w+/);
      if (matches && matches[0]) {
        return "Claude " + matches[0];
      }
    }
    
    // Try an alternative approach - look for the Claude logo and nearby text
    const claudeLogo = document.querySelector('.claude-logo-model-selector');
    if (claudeLogo) {
      const nearbyText = claudeLogo.closest('button')?.textContent.trim();
      if (nearbyText) {
        const matches = nearbyText.match(/\d+\.\d+\s+\w+/);
        if (matches && matches[0]) {
          return "Claude " + matches[0];
        }
      }
    }
    
    return "Claude";
  } catch (error) {
    console.error('Error getting Claude model name:', error);
    return "Claude";
  }
}

// Gemini conversation extractor
function extractGeminiConversation() {
  try {
    console.log('Extracting Gemini conversation');
    const messages = [];
    
    // Find all user queries and model responses throughout the page
    // Not limiting to a specific container allows us to capture all messages
    const userQueries = document.querySelectorAll('user-query');
    const modelResponses = document.querySelectorAll('model-response');
    
    console.log('Found Gemini user queries:', userQueries.length);
    console.log('Found Gemini model responses:', modelResponses.length);
    
    if (!userQueries.length && !modelResponses.length) {
      console.log('No Gemini messages found');
      return null;
    }
    
    // Create a timeline for proper message ordering
    const timeline = [];
    
    // Process user messages
    userQueries.forEach(query => {
      const queryContent = query.querySelector('user-query-content');
      const queryTextElement = queryContent ? queryContent.querySelector('.query-text') : query.querySelector('.query-text');
      
      if (queryTextElement) {
        const text = queryTextElement.textContent.trim();
        if (text) {
          timeline.push({
            type: 'user',
            text: text,
            position: query.getBoundingClientRect().top,
            element: query // Store reference to the element for debugging
          });
        }
      }
    });
    
    // Process assistant messages
    modelResponses.forEach(response => {
      const responseContainer = response.querySelector('response-container');
      const messageContent = response.querySelector('message-content.model-response-text');
      
      if (messageContent) {
        const text = messageContent.textContent.trim();
        
        if (text) {
          // Check for thinking content
          let thinking = null;
          const thoughtsPanel = response.querySelector('model-thoughts');
          
          if (thoughtsPanel) {
            const thoughtsContent = thoughtsPanel.querySelector('.thoughts-content');
            if (thoughtsContent) {
              // Try to get the markdown content within thoughts
              const markdownElement = thoughtsContent.querySelector('.markdown');
              if (markdownElement) {
                thinking = markdownElement.textContent.trim();
              } else {
                thinking = thoughtsContent.textContent.trim();
              }
            }
          }
          
          timeline.push({
            type: 'assistant',
            text: text,
            thinking: thinking,
            position: response.getBoundingClientRect().top,
            element: response // Store reference to the element for debugging
          });
        }
      }
    });
    
    // Log what we found for debugging
    console.log('Timeline before sorting:', timeline.map(item => ({
      type: item.type,
      position: item.position,
      textPreview: item.text.substring(0, 30) + '...'
    })));
    
    // Sort timeline by vertical position
    timeline.sort((a, b) => a.position - b.position);
    
    console.log('Timeline after sorting:', timeline.map(item => ({
      type: item.type,
      position: item.position,
      textPreview: item.text.substring(0, 30) + '...'
    })));
    
    // Convert timeline to messages array
    timeline.forEach(item => {
      if (item.type === 'user') {
        messages.push({
          role: 'user',
          content: [{ type: 'text', text: item.text }]
        });
      } else if (item.type === 'assistant') {
        const messageObj = {
          role: 'assistant',
          content: [{ type: 'text', text: item.text }]
        };
        
        // Add metadata if available
        const metadata = {};
        
        // Get model information
        const modelName = getGeminiModelName();
        if (modelName) {
          metadata.model = modelName;
        }
        
        // Add thinking content if available
        if (item.thinking) {
          metadata.reasoning = item.thinking;
        }
        
        // Only add metadata if we found something
        if (Object.keys(metadata).length > 0) {
          messageObj.metadata = metadata;
        }
        
        messages.push(messageObj);
      }
    });
    
    console.log('Final Gemini messages array with metadata:', messages);
    return messages.length ? { messages } : null;
  } catch (error) {
    console.error('Error in extractGeminiConversation:', error);
    return null;
  }
}

// Helper function to get the model name
function getGeminiModelName() {
  try {
    // First try to get from the disclaimer text
    const disclaimerText = document.querySelector('.disclaimer-text span');
    if (disclaimerText) {
      const text = disclaimerText.textContent.trim();
      
      // Try to extract model name from format like "2.0 Flash Thinking Experimental"
      if (text.includes('Flash') || text.includes('Experimental')) {
        const modelMatch = text.match(/(\d+\.\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)*)/);
        if (modelMatch && modelMatch[1]) {
          return "Gemini " + modelMatch[1];
        }
      }
      
      // If no specific pattern matched, return the full text
      return "Gemini " + text;
    }
    
    return "Gemini";
  } catch (error) {
    console.error('Error getting Gemini model name:', error);
    return "Gemini";
  }
}

// AIStudio conversation extractor
function extractAIStudioConversation() {
  try {
    console.log('Extracting AIStudio conversation');
    const messages = [];
    
    // Find all chat turns
    const chatTurns = document.querySelectorAll('ms-chat-turn');
    console.log('Found AIStudio chat turns:', chatTurns.length);
    
    if (!chatTurns.length) {
      console.log('No AIStudio chat turns found');
      return null;
    }
    
    // First pass - identify thinking-only messages
    const thinkingOnlyIndices = new Set();
    for (let i = 0; i < chatTurns.length; i++) {
      const turn = chatTurns[i];
      const modelContainer = turn.querySelector('.model-prompt-container[data-turn-role="Model"]');
      
      if (modelContainer) {
        // Check if this is a thinking-only message
        const thoughtsPanel = turn.querySelector('mat-expansion-panel');
        const regularContent = turn.querySelector('.turn-content ms-text-chunk:not(.mat-expansion-panel-body ms-text-chunk)');
        
        const hasThoughts = thoughtsPanel && 
                          thoughtsPanel.querySelector('.top-panel-title-content') && 
                          thoughtsPanel.querySelector('.top-panel-title-content').textContent.includes('Thoughts');
        
        const hasRegularContent = regularContent && regularContent.textContent.trim() !== '';
        
        // If it has thoughts but no regular content, mark as thinking-only
        if (hasThoughts && !hasRegularContent) {
          thinkingOnlyIndices.add(i);
          console.log(`Identified thinking-only message at index ${i}`);
        }
      }
    }
    
    // Second pass - extract messages and incorporate thinking properly
    for (let i = 0; i < chatTurns.length; i++) {
      // Skip thinking-only messages
      if (thinkingOnlyIndices.has(i)) {
        continue;
      }
      
      const turn = chatTurns[i];
      
      // Process user messages
      const userContainer = turn.querySelector('.user-prompt-container[data-turn-role="User"]');
      if (userContainer) {
        const text = userContainer.textContent.trim();
        if (text) {
          messages.push({
            role: 'user',
            content: [{ type: 'text', text }]
          });
        }
      }
      
      // Process assistant messages
      const modelContainer = turn.querySelector('.model-prompt-container[data-turn-role="Model"]');
      if (modelContainer) {
        const textChunk = modelContainer.querySelector('.turn-content ms-text-chunk:not(.mat-expansion-panel-body ms-text-chunk)');
        
        if (textChunk) {
          const text = textChunk.textContent.trim();
          if (text) {
            const messageObj = {
              role: 'assistant',
              content: [{ type: 'text', text }]
            };
            
            // Extract metadata
            const metadata = {};
            
            // Get model name
            const modelName = getAIStudioModelName();
            if (modelName) {
              metadata.model = modelName;
            }
            
            // Look for thinking content
            let thinkingText = null;
            
            // Check current turn for thinking
            const thoughtsPanel = turn.querySelector('mat-expansion-panel');
            if (thoughtsPanel) {
              const panelTitle = thoughtsPanel.querySelector('.top-panel-title-content');
              if (panelTitle && panelTitle.textContent.includes('Thoughts')) {
                const thoughtsContent = thoughtsPanel.querySelector('.mat-expansion-panel-body ms-text-chunk');
                if (thoughtsContent) {
                  thinkingText = thoughtsContent.textContent.trim();
                }
              }
            }
            
            // If no thinking in current turn, check if previous turn was a thinking-only turn
            if (!thinkingText && i > 0 && thinkingOnlyIndices.has(i-1)) {
              const prevTurn = chatTurns[i-1];
              const thoughtsPanel = prevTurn.querySelector('mat-expansion-panel');
              if (thoughtsPanel) {
                const panelTitle = thoughtsPanel.querySelector('.top-panel-title-content');
                if (panelTitle && panelTitle.textContent.includes('Thoughts')) {
                  const thoughtsContent = thoughtsPanel.querySelector('.mat-expansion-panel-body ms-text-chunk');
                  if (thoughtsContent) {
                    thinkingText = thoughtsContent.textContent.trim();
                  }
                }
              }
            }
            
            // Add thinking text as reasoning if found
            if (thinkingText) {
              metadata.reasoning = thinkingText;
            }
            
            // Add metadata to message if we found any
            if (Object.keys(metadata).length > 0) {
              messageObj.metadata = metadata;
            }
            
            messages.push(messageObj);
          }
        }
      }
    }
    
    console.log('Final AIStudio messages array with metadata:', messages);
    return messages.length ? { messages } : null;
  } catch (error) {
    console.error('Error in extractAIStudioConversation:', error);
    return null;
  }
}

// Helper function to get the model name
function getAIStudioModelName() {
  const modelSelector = document.querySelector('ms-model-selector .model-option-content span');
  return modelSelector ? modelSelector.textContent.trim() : null;
} 