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
      
      if (url.includes('chat.openai.com')) {
        console.log('Detected ChatGPT interface (chat.openai.com)');
        conversation = extractChatGPTConversation();
      } else if (url.includes('chatgpt.com')) {
        console.log('Detected ChatGPT.com interface');
        conversation = extractChatGPTDotComConversation();
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

// ChatGPT.com conversation extractor
function extractChatGPTDotComConversation() {
  console.log('Starting ChatGPT.com extraction with enhanced debugging');
  const messages = [];
  
  // Debug: Log document title and URL to confirm we're on chatgpt.com
  console.log('Page title:', document.title);
  console.log('URL:', window.location.href);
  
  // Try multiple approaches to find the container
  console.log('Attempting to find conversation container using multiple approaches...');
  
  // Document the DOM structure for debugging
  console.log('Document structure summary:');
  console.log('Body children count:', document.body.children.length);
  console.log('First few body children tag names:', 
    Array.from(document.body.children).slice(0, 3).map(el => el.tagName));

  // Approach 1: Standard selectors
  const standardSelectors = [
    'div.@thread-xl\\/thread\\:pt-header-height',
    'div[class*="thread"]',
    'div.flex.flex-col.overflow-hidden',
    'div.flex.flex-col.text-sm.pb-25',  
    'div.flex.shrink',
    'div.text-token-text-primary'
  ];
  
  let container = null;
  
  for (const selector of standardSelectors) {
    try {
      const el = document.querySelector(selector);
      console.log(`Selector "${selector}": ${el ? 'Found element' : 'No element found'}`);
      if (el) {
        container = el;
        console.log(`Using container found with selector: ${selector}`);
        break;
      }
    } catch (e) {
      console.error(`Error with selector "${selector}":`, e);
    }
  }
  
  // Approach 2: Find by conversation turn attribute
  if (!container) {
    console.log('Approach 2: Looking for conversation turns directly');
    const conversationTurn = document.querySelector('[data-testid^="conversation-turn-"]');
    if (conversationTurn) {
      console.log('Found a conversation turn directly');
      // Try to get the parent container
      container = conversationTurn.closest('div[class*="flex"]') || 
                 conversationTurn.parentElement || 
                 conversationTurn.parentElement?.parentElement;
      
      console.log('Found container via conversation turn parent:', container);
    }
  }
  
  // Approach 3: Look for specific UI elements
  if (!container) {
    console.log('Approach 3: Looking for specific UI elements');
    // Look for elements that are likely to be in the chat interface
    const userMessageElement = document.querySelector('[data-message-author-role="user"]');
    const assistantMessageElement = document.querySelector('[data-message-author-role="assistant"]');
    
    if (userMessageElement || assistantMessageElement) {
      console.log('Found message elements directly');
      const messageElement = userMessageElement || assistantMessageElement;
      container = messageElement.closest('div[class*="flex"]') || 
                 messageElement.parentElement || 
                 messageElement.parentElement?.parentElement;
      
      console.log('Found container via message element parent:', container);
    }
  }
  
  // If still no container, use document.body but log this clearly
  if (!container) {
    console.log('All approaches failed to find a specific container, using document.body as fallback');
    container = document.body;
  }

  // Look for conversation turns
  console.log('Looking for conversation turns in container...');
  const turns = container.querySelectorAll('article[data-testid^="conversation-turn-"]');
  console.log('Found conversation turns with data-testid:', turns.length);
  
  // If no turns found with data-testid, try other approaches
  if (!turns.length) {
    console.log('No turns with data-testid found, trying alternative approaches');
    
    // Try to find all articles
    const articles = container.querySelectorAll('article');
    console.log('Found articles:', articles.length);
    
    if (articles.length > 0) {
      console.log('Processing articles without data-testid');
      // Document what we found
      console.log('Article elements found:');
      articles.forEach((article, index) => {
        console.log(`Article ${index}: has h5="${!!article.querySelector('h5')}", has h6="${!!article.querySelector('h6')}"`);
        console.log(`Article ${index} classes:`, article.className);
      });
      
      // Process each article
      articles.forEach((article, index) => {
        // Try to determine if this is a user or assistant message
        const hasUserHeader = article.querySelector('h5')?.textContent.includes('You');
        const hasAssistantHeader = article.querySelector('h6')?.textContent.includes('ChatGPT');
        
        // If headers don't clearly indicate, check for role attributes or use position
        const hasUserRole = article.querySelector('[data-message-author-role="user"]');
        const hasAssistantRole = article.querySelector('[data-message-author-role="assistant"]');
        
        // Determine message type using all available indicators
        const isUser = hasUserHeader || hasUserRole || (!hasAssistantHeader && !hasAssistantRole && index % 2 === 0);
        const isAssistant = hasAssistantHeader || hasAssistantRole || (!hasUserHeader && !hasUserRole && index % 2 === 1);
        
        console.log(`Article ${index}: isUser=${isUser}, isAssistant=${isAssistant}`);
        
        if (isUser) {
          const userMsg = extractUserMessage(article);
          if (userMsg) {
            messages.push(userMsg);
            console.log(`Extracted user message from article ${index}`);
          } else {
            console.log(`Failed to extract user message from article ${index}`);
          }
        } else if (isAssistant) {
          const assistantMsg = extractAssistantMessage(article);
          if (assistantMsg) {
            messages.push(assistantMsg);
            console.log(`Extracted assistant message from article ${index}`);
          } else {
            console.log(`Failed to extract assistant message from article ${index}`);
          }
        }
      });
    } else {
      // Last resort: look for any elements that might contain messages
      console.log('No articles found, trying last resort approach');
      
      // Try to find user messages by common patterns
      const userElements = container.querySelectorAll('.whitespace-pre-wrap');
      console.log('Found potential user message elements:', userElements.length);
      
      userElements.forEach((element, index) => {
        const text = element.textContent.trim();
        if (text && text.length > 0) {
          const isWithinAssistantMessage = 
            element.closest('[data-message-author-role="assistant"]') || 
            element.closest('pre');
          
          if (!isWithinAssistantMessage) {
            messages.push({
              role: 'user',
              content: [{ type: 'text', text }],
              metadata: {
                name: 'ChatGPT Conversation',
                harmType: 'None'
              }
            });
            console.log(`Added user message from whitespace-pre-wrap ${index}`);
          }
        }
      });
      
      // Try to find assistant messages by common patterns
      const assistantElements = container.querySelectorAll('.markdown, .prose');
      console.log('Found potential assistant message elements:', assistantElements.length);
      
      assistantElements.forEach((element, index) => {
        // Skip if this is within a code block
        const isCodeBlock = element.closest('pre');
        if (!isCodeBlock) {
          const text = element.textContent.trim();
          if (text && text.length > 0) {
            messages.push({
              role: 'assistant',
              content: [{ type: 'text', text }],
              metadata: {
                model: 'gpt-4', // Default fallback
                name: 'ChatGPT Conversation',
                harmType: 'None'
              }
            });
            console.log(`Added assistant message from markdown/prose ${index}`);
          }
        }
      });
    }
  } else {
    // We found turns with data-testid, process them
    console.log('Processing conversation turns with data-testid');
    
    // Process each turn with data-testid
    turns.forEach((turn, index) => {
      console.log(`Processing turn ${index}`);
      
      // Extract user message
      const userMessage = turn.querySelector('[data-message-author-role="user"]');
      if (userMessage) {
        console.log(`Turn ${index} has user message`);
        const msg = extractUserMessage(turn);
        if (msg) {
          messages.push(msg);
          console.log(`Added user message from turn ${index}`);
        } else {
          console.log(`Failed to extract user message from turn ${index}`);
        }
      }
      
      // Extract assistant message
      const assistantMessage = turn.querySelector('[data-message-author-role="assistant"]');
      if (assistantMessage) {
        console.log(`Turn ${index} has assistant message`);
        const msg = extractAssistantMessage(turn);
        if (msg) {
          messages.push(msg);
          console.log(`Added assistant message from turn ${index}`);
        } else {
          console.log(`Failed to extract assistant message from turn ${index}`);
        }
      }
    });
  }

  console.log(`Extraction complete: found ${messages.length} messages`);
  
  // Final check - if no messages were found, return null
  if (messages.length === 0) {
    console.log('No messages were found, returning null');
    return null;
  }
  
  return { messages };
}

// Helper function to extract user message
function extractUserMessage(container) {
  // Find the whitespace-pre-wrap element that contains the message text
  const textElement = container.querySelector('.whitespace-pre-wrap');
  if (!textElement) {
    console.log('extractUserMessage: No .whitespace-pre-wrap element found');
    return null;
  }
  
  const text = textElement.innerText.trim();
  if (!text) {
    console.log('extractUserMessage: Empty text content');
    return null;
  }
  
  console.log('extractUserMessage: Found text:', text.substring(0, 30) + (text.length > 30 ? '...' : ''));
  
  return {
    role: 'user',
    content: [{ type: 'text', text }],
    metadata: {
      name: 'ChatGPT Conversation',
      harmType: 'None'
    }
  };
}

// Helper function to extract assistant message
function extractAssistantMessage(container) {
  // Look for markdown content, which contains the response text
  const markdownContent = container.querySelector('.markdown, .prose, [class*="markdown"]');
  if (!markdownContent) {
    console.log('extractAssistantMessage: No markdown content found');
    
    // Try alternate content containers
    const alternateContent = container.querySelector('[data-message-author-role="assistant"] div, [data-message-id]');
    if (alternateContent) {
      const text = alternateContent.innerText.trim();
      if (text) {
        console.log('extractAssistantMessage: Found text in alternate container');
        return {
          role: 'assistant',
          content: [{ type: 'text', text }],
          metadata: {
            model: 'gpt-4', // Default fallback
            name: 'ChatGPT Conversation',
            harmType: 'None'
          }
        };
      }
    }
    
    return null;
  }
  
  // Find any code blocks
  const codeBlocks = [];
  const preElements = markdownContent.querySelectorAll('pre');
  
  preElements.forEach(pre => {
    const codeElement = pre.querySelector('code');
    if (codeElement) {
      // Try to get the language from the container div class
      let language = 'plaintext';
      const langDiv = pre.querySelector('div.flex.items-center');
      if (langDiv && langDiv.textContent) {
        language = langDiv.textContent.trim();
      }
      
      // Get the code content
      const code = codeElement.textContent.trim();
      if (code) {
        codeBlocks.push({
          language: language,
          code: code
        });
        console.log('extractAssistantMessage: Found code block in language:', language);
      }
    }
  });
  
  // Get text content of the message
  const text = markdownContent.innerText.trim();
  if (!text) {
    console.log('extractAssistantMessage: Empty markdown content');
    return null;
  }
  
  console.log('extractAssistantMessage: Found text:', text.substring(0, 30) + (text.length > 30 ? '...' : ''));
  
  const messageObj = {
    role: 'assistant',
    content: [{ type: 'text', text }]
  };
  
  // Extract metadata
  const metadata = {};
  
  // Look for model name
  const modelSlug = container.querySelector('[data-message-author-role="assistant"]')?.getAttribute('data-message-model-slug');
  if (modelSlug) {
    metadata.model = modelSlug;
    console.log('extractAssistantMessage: Found model from data attribute:', modelSlug);
  } else {
    // Try to find model name from UI elements
    const modelSpan = container.querySelector('[data-state="closed"] button[aria-label="Copy"]')
                       ?.closest('div[data-state="closed"]')
                       ?.nextElementSibling
                       ?.querySelector('span.overflow-hidden');
                        
    if (modelSpan) {
      const modelText = modelSpan.textContent.trim();
      metadata.model = modelText || 'gpt-4'; // Default to gpt-4 if no specific model found
      console.log('extractAssistantMessage: Found model from UI element:', metadata.model);
    } else {
      // Try another approach to find the model
      const modelButton = container.querySelector('button[id^="radix-"]');
      if (modelButton) {
        const modelText = modelButton.textContent.trim();
        console.log('extractAssistantMessage: Found model button text:', modelText);
        if (modelText.includes('o4-mini')) {
          metadata.model = 'o4-mini';
        } else if (modelText.includes('o3')) {
          metadata.model = 'o3';
        } else if (modelText.includes('4o')) {
          metadata.model = 'gpt-4o';
        } else {
          metadata.model = 'gpt-4'; // Default fallback
        }
      } else {
        metadata.model = 'gpt-4'; // Default fallback
      }
    }
  }
  
  // Extract reasoning/thinking content if available
  // Look for a thought panel which appears in the new interface
  const thoughtPanel = container.querySelector('span[data-state="closed"] > button');
  const hasThinker = thoughtPanel && thoughtPanel.textContent.includes('Thought for');
  
  if (hasThinker) {
    console.log('extractAssistantMessage: Found thought panel');
    // Try to find the thought content
    const thoughtContent = container.querySelector('.text-token-text-secondary.text-sm.markdown');
    
    if (thoughtContent) {
      metadata.reasoning = thoughtContent.textContent.trim();
      console.log('extractAssistantMessage: Extracted reasoning from thought content');
    } else {
      // Alternative method to find thought content
      const parentDiv = thoughtPanel.closest('.relative');
      const thoughtBlock = parentDiv?.querySelector('.text-token-text-secondary');
      
      if (thoughtBlock) {
        metadata.reasoning = thoughtBlock.textContent.trim();
        console.log('extractAssistantMessage: Extracted reasoning from thought block');
      }
    }
  }
  
  // Add code blocks to metadata if found
  if (codeBlocks.length > 0) {
    metadata.code_blocks = codeBlocks;
    console.log(`extractAssistantMessage: Added ${codeBlocks.length} code blocks to metadata`);
  }
  
  // Add additional requested fields
  metadata.name = 'ChatGPT Conversation';
  metadata.harmType = 'None';
  
  if (Object.keys(metadata).length > 0) {
    messageObj.metadata = metadata;
  }
  
  return messageObj;
}

// ChatGPT conversation extractor (for chat.openai.com)
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
        
        // Add additional requested fields
        metadata.name = 'ChatGPT Conversation';
        metadata.harmType = 'None';
        
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
        // Look for code blocks first
        const codeBlocks = [];
        const preElements = markdownContent.querySelectorAll('pre');
        
        preElements.forEach(pre => {
          const codeElement = pre.querySelector('code');
          if (codeElement) {
            // Try to get the language from the container div class
            let language = 'plaintext';
            const langDiv = pre.querySelector('div.flex.items-center');
            if (langDiv && langDiv.textContent) {
              language = langDiv.textContent.trim();
            }
            
            // Get the code content
            const code = codeElement.textContent.trim();
            if (code) {
              codeBlocks.push({
                language: language,
                code: code
              });
            }
          }
        });
        
        // Get text content
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
          } else {
            // Try to find model name in UI elements
            const modelElement = turn.querySelector('[data-state="closed"] button[aria-label="Copy"]')
                                 ?.closest('[data-state="closed"]')
                                 ?.nextElementSibling;
                                 
            if (modelElement && modelElement.textContent.includes('4o')) {
              metadata.model = 'gpt-4o';
            } else {
              metadata.model = 'gpt-4'; // default fallback
            }
          }
          
          // Add code blocks to metadata if found
          if (codeBlocks.length > 0) {
            metadata.code_blocks = codeBlocks;
          }
          
          // Find and extract chain of thought/reasoning
          // First check for O1 model reasoning format
          const reasoningSpan = turn.querySelector('span.text-token-text-secondary');
          if (reasoningSpan) {
            // For O1 model, there's a summary line and possibly detailed content
            // First, try to get the reasoning summary
            const reasoningButton = reasoningSpan.querySelector('button');
            const reasoningSummary = reasoningButton?.querySelector('span.text-start')?.textContent?.trim() || 
                                   reasoningSpan.childNodes[0]?.textContent?.trim();
            
            // Next, look for the detailed reasoning content which could be in several possible locations
            let reasoningContent = '';
            
            // Option 1: In a div that follows the span (most common)
            const reasoningNextDiv = reasoningSpan.nextElementSibling?.querySelector('.mb-4');
            if (reasoningNextDiv) {
              reasoningContent = reasoningNextDiv.textContent.trim();
            } 
            // Option 2: In a div inside the span or inside one of the span's children
            else {
              const innerDiv = reasoningSpan.querySelector('.mb-4, .markdown, .prose');
              if (innerDiv) {
                reasoningContent = innerDiv.textContent.trim();
              }
            }
            
            // If we found either summary or content, use it
            if (reasoningSummary && reasoningSummary.includes('Reasoned')) {
              if (reasoningContent) {
                // If we have both, combine them
                metadata.reasoning = reasoningSummary + "\n\n" + reasoningContent;
              } else {
                // Otherwise just use the summary
                metadata.reasoning = reasoningSummary;
              }
            }
          } 
          // If no O1 reasoning found, check for traditional button format
          else {
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
          }
          
          // Add additional requested fields
          metadata.name = 'ChatGPT Conversation';
          metadata.harmType = 'None';
          
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
          
          // Add additional requested fields
          metadata.name = 'DeepSeek Conversation';
          metadata.harmType = 'None';
          
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
        
        // Add additional requested fields
        metadata.name = 'DeepSeek Conversation';
        metadata.harmType = 'None';
        
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
            
            // Extract code blocks
            let codeBlocks = [];
            const preElements = mainContentDiv.querySelectorAll('pre');
            if (preElements.length) {
              preElements.forEach(pre => {
                const codeElement = pre.querySelector('code');
                if (codeElement) {
                  // Try to extract language info
                  let language = 'plaintext';
                  const langDiv = pre.querySelector('.text-text-300');
                  if (langDiv && langDiv.textContent) {
                    language = langDiv.textContent.trim();
                  }
                  // Get the code content
                  const code = codeElement.textContent.trim();
                  if (code) {
                    codeBlocks.push({
                      language: language,
                      code: code
                    });
                  }
                }
              });
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
              codeBlocks: codeBlocks,
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
        
        // Add code blocks to metadata if present
        if (item.codeBlocks && item.codeBlocks.length > 0) {
          metadata.code_blocks = item.codeBlocks;
        }

        // Add additional requested fields
        metadata.name = 'Claude Conversation';
        metadata.harmType = 'None';
        
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
    
    // Add detailed debug logging to help diagnose issues
    console.log('URL:', window.location.href);
    console.log('Page title:', document.title);
    
    // Find all user queries and model responses throughout the page
    // Not limiting to a specific container allows us to capture all messages
    const userQueries = document.querySelectorAll('user-query');
    const modelResponses = document.querySelectorAll('model-response');
    
    console.log('Found Gemini user queries:', userQueries.length);
    console.log('Found Gemini model responses:', modelResponses.length);
    
    // Debug: Log structure of first user query and model response if found
    if (userQueries.length > 0) {
      console.log('First user query HTML:', userQueries[0].outerHTML.substring(0, 500) + '...');
    }
    if (modelResponses.length > 0) {
      console.log('First model response HTML:', modelResponses[0].outerHTML.substring(0, 500) + '...');
    }
    
    if (!userQueries.length && !modelResponses.length) {
      console.log('No Gemini messages found using primary selectors, trying alternative selectors...');
      
      // Try alternative selectors that might be used in different versions of Gemini interface
      const alternativeUserMessages = document.querySelectorAll('.user-message, .human-message, [data-role="user"], .query-container');
      const alternativeAssistantMessages = document.querySelectorAll('.model-message, .assistant-message, [data-role="assistant"], .response-container');
      
      console.log('Found alternative user messages:', alternativeUserMessages.length);
      console.log('Found alternative assistant messages:', alternativeAssistantMessages.length);
      
      if (alternativeUserMessages.length > 0 || alternativeAssistantMessages.length > 0) {
        return extractGeminiConversationAlternative();
      }
      
      // If still no messages found using direct selectors, try a more generic approach
      return extractGeminiConversationGeneric();
    }
    
    // Create a timeline for proper message ordering
    const timeline = [];
    
    // Process user messages
    userQueries.forEach((query, index) => {
      console.log(`Processing user query #${index + 1}`);
      const queryContent = query.querySelector('user-query-content');
      const queryTextElement = queryContent ? queryContent.querySelector('.query-text') : query.querySelector('.query-text');
      
      if (queryTextElement) {
        const text = queryTextElement.textContent.trim();
        if (text) {
          console.log(`Added user message #${index + 1}: ${text.substring(0, 30)}...`);
          timeline.push({
            type: 'user',
            text: text,
            position: query.getBoundingClientRect().top,
            element: query, // Store reference to the element for debugging
            index: index // Store original index for additional sorting stability
          });
        } else {
          console.log(`Empty text content in user query #${index + 1}`);
        }
      } else {
        console.log(`Could not find text element in user query #${index + 1}, trying alternative approach`);
        // Try a more generic approach to extract text
        const text = query.textContent.trim();
        if (text) {
          console.log(`Added user message #${index + 1} using fallback: ${text.substring(0, 30)}...`);
          timeline.push({
            type: 'user',
            text: text,
            position: query.getBoundingClientRect().top,
            element: query,
            index: index
          });
        }
      }
    });
    
    // Process assistant messages
    modelResponses.forEach((response, index) => {
      console.log(`Processing model response #${index + 1}`);
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
          
          console.log(`Added assistant message #${index + 1}: ${text.substring(0, 30)}...`);
          timeline.push({
            type: 'assistant',
            text: text,
            thinking: thinking,
            position: response.getBoundingClientRect().top,
            element: response, // Store reference to the element for debugging
            index: index // Store original index for additional sorting stability
          });
        } else {
          console.log(`Empty text content in model response #${index + 1}`);
        }
      } else {
        console.log(`Could not find message content in model response #${index + 1}, trying alternative approach`);
        // Try alternative content extractors
        const alternativeContents = [
          response.querySelector('.markdown-content'),
          response.querySelector('.response-text'),
          response.querySelector('[data-content="response"]'),
          response.querySelector('.message-body')
        ];
        
        const contentElement = alternativeContents.find(el => el && el.textContent.trim());
        
        if (contentElement) {
          const text = contentElement.textContent.trim();
          console.log(`Added assistant message #${index + 1} using fallback: ${text.substring(0, 30)}...`);
          timeline.push({
            type: 'assistant',
            text: text,
            position: response.getBoundingClientRect().top,
            element: response,
            index: index
          });
        } else {
          // Last resort: try to get any text content from the response
          const text = response.textContent.trim();
          if (text) {
            console.log(`Added assistant message #${index + 1} using last resort: ${text.substring(0, 30)}...`);
            timeline.push({
              type: 'assistant',
              text: text,
              position: response.getBoundingClientRect().top,
              element: response,
              index: index
            });
          }
        }
      }
    });
    
    // Log what we found for debugging
    console.log('Timeline before sorting:', timeline.map(item => ({
      type: item.type,
      position: item.position,
      index: item.index,
      textPreview: item.text.substring(0, 30) + '...'
    })));
    
    // First, check if we have a reasonable number of messages
    if (timeline.length === 0) {
      console.log('No messages found in timeline, trying alternative extraction method');
      return extractGeminiConversationAlternative();
    }
    
    // Sort timeline by vertical position
    timeline.sort((a, b) => {
      // First sort by position
      const positionDiff = a.position - b.position;
      if (Math.abs(positionDiff) > 5) { // Use a small threshold to account for minor position differences
        return positionDiff;
      }
      // If positions are very close, use the original index as a tiebreaker
      return a.index - b.index;
    });
    
    console.log('Timeline after sorting:', timeline.map(item => ({
      type: item.type,
      position: item.position,
      index: item.index,
      textPreview: item.text.substring(0, 30) + '...'
    })));
    
    // Check if the timeline has a reasonable pattern of user/assistant messages
    let userCount = 0;
    let assistantCount = 0;
    let consecutiveUserMessages = 0;
    let maxConsecutiveUserMessages = 0;
    
    timeline.forEach(item => {
      if (item.type === 'user') {
        userCount++;
        consecutiveUserMessages++;
        maxConsecutiveUserMessages = Math.max(maxConsecutiveUserMessages, consecutiveUserMessages);
      } else {
        assistantCount++;
        consecutiveUserMessages = 0;
      }
    });
    
    console.log(`User messages: ${userCount}, Assistant messages: ${assistantCount}, Max consecutive user messages: ${maxConsecutiveUserMessages}`);
    
    // If we have many more user messages than assistant messages, or too many consecutive user messages,
    // there might be a problem with the extraction or sorting
    if ((userCount > assistantCount * 2 && userCount > 3) || maxConsecutiveUserMessages > 3) {
      console.warn('Possible extraction issue: imbalanced message counts or too many consecutive user messages');
      // Try to repair the timeline by alternating user/assistant messages if we have enough messages
      if (userCount >= 2 && timeline.length >= 3) {
        console.log('Attempting to repair timeline by enforcing alternating pattern');
        const repairedTimeline = [];
        let lastType = null;
        
        for (const item of timeline) {
          // If we're getting the same type twice in a row, try to find the next item of the other type
          if (lastType === item.type) {
            const neededType = lastType === 'user' ? 'assistant' : 'user';
            const nextDifferentItem = timeline.find(i => i.type === neededType && !repairedTimeline.includes(i));
            
            if (nextDifferentItem) {
              repairedTimeline.push(nextDifferentItem);
              lastType = nextDifferentItem.type;
            }
          }
          
          if (!repairedTimeline.includes(item)) {
            repairedTimeline.push(item);
            lastType = item.type;
          }
        }
        
        // If the repair looks better, use it
        if (repairedTimeline.length >= timeline.length * 0.8) {
          console.log('Using repaired timeline');
          timeline.length = 0;
          timeline.push(...repairedTimeline);
        } else {
          console.log('Repair did not produce good results, reverting to original timeline');
        }
      }
      
      // If we still have issues, try the alternative extraction method
      if ((userCount > assistantCount * 2 && userCount > 3) || maxConsecutiveUserMessages > 3) {
        console.log('Still having issues, trying alternative extraction method');
        return extractGeminiConversationAlternative();
      }
    }
    
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
        
        // Add additional requested fields
        metadata.name = 'Gemini Conversation';
        metadata.harmType = 'None';
        
        // Only add metadata if we found something
        if (Object.keys(metadata).length > 0) {
          messageObj.metadata = metadata;
        }
        
        messages.push(messageObj);
      }
    });
    
    console.log('Final Gemini messages array with metadata:', messages);
    
    // Final validation: check for a reasonable pattern of messages
    if (messages.length >= 2) {
      let validPattern = true;
      let lastRole = null;
      let consecutiveSameRole = 0;
      
      for (const message of messages) {
        if (message.role === lastRole) {
          consecutiveSameRole++;
          if (consecutiveSameRole > 2) {
            validPattern = false;
            break;
          }
        } else {
          consecutiveSameRole = 0;
          lastRole = message.role;
        }
      }
      
      if (!validPattern) {
        console.warn('Final message array has suspicious pattern, trying alternative method');
        return extractGeminiConversationAlternative();
      }
    }
    
    return messages.length ? { messages } : null;
  } catch (error) {
    console.error('Error in extractGeminiConversation:', error);
    console.log('Trying alternative extraction method after error');
    try {
      return extractGeminiConversationAlternative();
    } catch (alternativeError) {
      console.error('Error in alternative extraction method:', alternativeError);
      return null;
    }
  }
}

// Alternative extraction method for Gemini conversations
function extractGeminiConversationAlternative() {
  console.log('Using alternative extraction method for Gemini conversation');
  const messages = [];
  
  try {
    // Find the main conversation container - try multiple selectors
    const possibleContainers = [
      document.querySelector('main-view'),
      document.querySelector('#chat-container'),
      document.querySelector('.conversation-container'),
      document.querySelector('main.flex-1'),
      document.querySelector('.chat-scroll-container'),
      document.body // fallback to body if no specialized container is found
    ];
    
    const container = possibleContainers.find(c => c !== null);
    if (!container) {
      console.error('Could not find any container for Gemini conversation');
      return null;
    }
    
    console.log('Found alternative container:', container.tagName);
    
    // Look for elements that might signify a message
    const messageContainers = container.querySelectorAll('div[style*="padding"], section, article, .message');
    console.log('Found potential message containers:', messageContainers.length);
    
    if (messageContainers.length === 0) {
      return extractGeminiConversationGeneric();
    }
    
    // Filter to elements that have a reasonable amount of text content
    const potentialMessages = Array.from(messageContainers).filter(el => {
      const text = el.textContent.trim();
      return text.length > 20 && text.length < 10000; // Reasonable message length
    });
    
    console.log('Found potential messages after filtering:', potentialMessages.length);
    
    // Create a timeline with position information
    const timeline = [];
    
    // Helper function to check if element is likely a user message
    function isLikelyUserMessage(element) {
      // Check for common user message indicators
      const indicators = [
        element.querySelector('svg path[d*="M15.5 14"]'), // User icon common in Google interfaces
        element.querySelector('img[src*="profile"]'),
        element.classList.contains('user'),
        element.classList.contains('human'),
        element.getAttribute('data-role') === 'user',
        element.textContent.includes('You:'),
        element.style.backgroundColor === 'rgb(241, 243, 244)' || element.style.backgroundColor === '#f1f3f4' // Common user message background
      ];
      
      return indicators.some(i => i);
    }
    
    // Helper function to check if element is likely an assistant message
    function isLikelyAssistantMessage(element) {
      // Check for common assistant message indicators
      const indicators = [
        element.querySelector('svg path[d*="M9.5 13.5"]'), // Gemini icon path
        element.querySelector('img[src*="gemini"]'),
        element.querySelector('img[src*="assistant"]'),
        element.classList.contains('assistant'),
        element.classList.contains('bot'),
        element.classList.contains('model'),
        element.getAttribute('data-role') === 'assistant',
        element.textContent.includes('Gemini:')
      ];
      
      return indicators.some(i => i);
    }
    
    // Process each potential message
    potentialMessages.forEach((element, index) => {
      // Skip elements that are too small or are likely UI controls
      if (element.clientHeight < 30 || element.textContent.length < 20) {
        return;
      }
      
      // Determine message type
      const isUser = isLikelyUserMessage(element);
      const isAssistant = isLikelyAssistantMessage(element);
      
      let messageType = null;
      
      // If we can directly determine the type, use it
      if (isUser && !isAssistant) {
        messageType = 'user';
      } else if (isAssistant && !isUser) {
        messageType = 'assistant';
      } else {
        // Otherwise, use position-based heuristic (even indexes are user, odd are assistant)
        messageType = timeline.length % 2 === 0 ? 'user' : 'assistant';
      }
      
      // Extract message text
      let text = element.textContent.trim();
      
      // Try to clean up the text by removing UI elements text
      const buttonTexts = Array.from(element.querySelectorAll('button')).map(b => b.textContent.trim());
      buttonTexts.forEach(btnText => {
        if (btnText.length > 0) {
          text = text.replace(btnText, '');
        }
      });
      
      // Remove common UI texts in Gemini
      ['Copy', 'Thumbs up', 'Thumbs down', 'Share', 'More actions', 'Send', 'Regenerate'].forEach(uiText => {
        text = text.replace(uiText, '');
      });
      
      text = text.trim();
      
      if (text.length > 0) {
        console.log(`Added ${messageType} message #${index} using alternative method: ${text.substring(0, 30)}...`);
        timeline.push({
          type: messageType,
          text: text,
          position: element.getBoundingClientRect().top,
          index: index
        });
      }
    });
    
    // Sort by position
    timeline.sort((a, b) => a.position - b.position);
    
    // Convert to message format
    let lastType = null;
    
    timeline.forEach(item => {
      // Skip consecutive messages of the same type
      if (item.type === lastType) {
        return;
      }
      
      lastType = item.type;
      
      if (item.type === 'user') {
        messages.push({
          role: 'user',
          content: [{ type: 'text', text: item.text }]
        });
      } else {
        const messageObj = {
          role: 'assistant',
          content: [{ type: 'text', text: item.text }],
          metadata: {
            model: getGeminiModelName() || 'Gemini',
            name: 'Gemini Conversation',
            harmType: 'None'
          }
        };
        
        messages.push(messageObj);
      }
    });
    
    console.log('Final messages from alternative method:', messages);
    return messages.length ? { messages } : null;
  } catch (error) {
    console.error('Error in extractGeminiConversationAlternative:', error);
    return null;
  }
}

// Generic extraction method as a last resort
function extractGeminiConversationGeneric() {
  console.log('Using generic extraction method for Gemini conversation');
  const messages = [];
  
  try {
    // Get all paragraphs and large text blocks on the page
    const textElements = document.querySelectorAll('p, div > span, div[style*="margin"]');
    console.log('Found potential text elements:', textElements.length);
    
    // Filter to elements with sufficient text
    const substantialElements = Array.from(textElements).filter(el => {
      const text = el.textContent.trim();
      return text.length > 30 && text.length < 10000 && !el.querySelector('button');
    });
    
    console.log('Substantial text elements:', substantialElements.length);
    
    if (substantialElements.length < 2) {
      console.log('Not enough substantial text elements found');
      return null;
    }
    
    // Create timeline
    const timeline = [];
    
    // Process text elements
    substantialElements.forEach((element, index) => {
      const text = element.textContent.trim();
      
      // Simple heuristic: alternate user/assistant roles
      const type = index % 2 === 0 ? 'user' : 'assistant';
      
      timeline.push({
        type: type,
        text: text,
        position: element.getBoundingClientRect().top,
        index: index
      });
    });
    
    // Sort by position
    timeline.sort((a, b) => a.position - b.position);
    
    // Convert to messages
    timeline.forEach(item => {
      if (item.type === 'user') {
        messages.push({
          role: 'user',
          content: [{ type: 'text', text: item.text }]
        });
      } else {
        messages.push({
          role: 'assistant',
          content: [{ type: 'text', text: item.text }],
          metadata: {
            model: 'Gemini',
            name: 'Gemini Conversation',
            harmType: 'None'
          }
        });
      }
    });
    
    return messages.length ? { messages } : null;
  } catch (error) {
    console.error('Error in extractGeminiConversationGeneric:', error);
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
            
            // Add additional requested fields
            metadata.name = 'AIStudio Conversation';
            metadata.harmType = 'None';
            
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