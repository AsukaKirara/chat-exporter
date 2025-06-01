# AI Chat Exporter

A browser extension that allows you to export your conversations from popular AI chat platforms into JSON format for archiving, analysis, or sharing.
The JSON structure follows a common format used across many chat exporters so it can easily be ingested by other tools.

## Features

- Export conversations from multiple AI chat platforms
- Download conversation data as JSON files
- Simple one-click export process
- Works directly in your browser without needing to copy/paste
- Supabase-based registration and login (email/password, Google, Apple)
- Upload exports to a private Supabase Storage bucket for backup
- Link to a management website for browsing your history and purchases

## Supported Platforms

- OpenAI ChatGPT (chat.openai.com)
- Google Gemini (gemini.google.com)
- Anthropic Claude (claude.ai)
- DeepSeek Chat (chat.deepseek.com)
- Google AI Studio (aistudio.google.com)

## Installation

### Manual Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing the extension files
5. The extension icon should now appear in your browser toolbar

### Database Setup

Run the SQL script `prepal_migration.sql` against your Supabase project to create the user profile and purchase tables used by the dashboard.

## Usage

1. Visit any supported AI chat platform
2. Have a conversation with the AI
3. Click on the AI Chat Exporter icon in your browser toolbar
4. Sign up or log in to your Prepal account using Supabase Auth (email/password, Google or Apple)
5. Click the "Export Conversation" button
6. The conversation will be downloaded as a JSON file and uploaded to your private Supabase bucket
7. Open `dashboard/index.html` to view your profile and purchase history
8. Use the "Purchase Service" button to upgrade via Stripe Checkout

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

## Authentication & Cloud Storage

When logged in, each export is uploaded to a private Supabase Storage bucket named `chat-exports`. You can browse these uploads and manage your purchases using the dashboard under `dashboard/index.html`.

## Privacy

This extension processes all data locally in your browser. No conversation data is sent to any servers. Your conversations remain private and under your control.

## Contributing

Contributions are welcome! If you'd like to add support for additional AI chat platforms or improve the existing functionality:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Admin Dashboard

The `dashboard/admin.html` page lists all users in your Supabase project. Serve
it from a backend environment that injects `SUPABASE_SERVICE_KEY` so that the
Supabase client can access admin APIs without exposing your service key in
client-side code.

## Payments via Stripe

The dashboard integrates with Stripe Checkout for purchasing the premium plan.
It expects a backend endpoint at `/create-checkout-session` that returns a
`sessionId` for Stripe. After successful payment, record the purchase in the
`purchases` table using a webhook or server-side logic.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
