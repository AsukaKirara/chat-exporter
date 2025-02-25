# AI Chat Exporter

A browser extension that allows you to export your conversations from popular AI chat platforms into JSON format for archiving, analysis, or sharing.

## Features

- Export conversations from multiple AI chat platforms
- Download conversation data as JSON files
- Simple one-click export process
- Works directly in your browser without needing to copy/paste

## Supported Platforms

- OpenAI ChatGPT (chat.openai.com)
- Google Gemini (gemini.google.com)
- Anthropic Claude (claude.ai)
- DeepSeek Chat (chat.deepseek.com)
- Google AI Studio (aistudio.google.com)

## Installation

### Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store page](#) for AI Chat Exporter
2. Click "Add to Chrome"
3. Confirm the installation when prompted

### Manual Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing the extension files
5. The extension icon should now appear in your browser toolbar

## Usage

1. Visit any supported AI chat platform
2. Have a conversation with the AI
3. Click on the AI Chat Exporter icon in your browser toolbar
4. Click the "Export Conversation" button
5. The conversation will be downloaded as a JSON file to your default download location

## How It Works

The extension injects a content script into supported AI chat platforms that analyzes the page structure to identify and extract user and assistant messages. The extracted conversation is then formatted into a standardized JSON structure and downloaded as a file.

The extension works differently for each platform:

- **ChatGPT**: Extracts messages from conversation turn articles
- **Gemini**: Creates a timeline of messages based on their vertical position
- **Claude**: Identifies user and assistant messages using data attributes and CSS classes
- **DeepSeek**: Extracts messages from their unique container structure
- **AI Studio**: Works with Angular-based UI components to extract message content

## File Format

The exported JSON has the following format:
```json
{
  "messages": [
    {
      "role": "user",
      "content": [{
        "type": "text",
        "text": "Hello, how are you?"
        }]
    },
    {
      "role": "assistant",
      "content": [{
        "type": "text",
        "text": "I'm doing well, thank you for asking! How can I help you today?"
      }]
    }
  ]
}
```

## Privacy

This extension processes all data locally in your browser. No conversation data is sent to any servers. Your conversations remain private and under your control.

## Contributing

Contributions are welcome! If you'd like to add support for additional AI chat platforms or improve the existing functionality:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.