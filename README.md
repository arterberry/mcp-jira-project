# MCP Jira Test Readiness Generator

This project provides a Model Context Protocol (MCP) server designed to integrate with tools like Cursor. It fetches details for a specified Jira ticket (by number for a configured project) using the Jira API, then uses the Google Gemini AI API to generate a test readiness checklist and a Zsh shell script containing relevant cURL commands based on the ticket's content.

**⚠️ Security Warning: Handle Credentials With Care! ⚠️**

This server requires API credentials for both **Jira** and **Google Cloud (Gemini AI)**.

*   These credentials grant significant access to your Jira instance and Google Cloud resources.
*   Configuration is handled via environment variables (`.env` file for standalone, the MCP JSON config in Cursor or Claude's Desktop `env` block in `claude_desktop_config.json`).
*   **NEVER commit `.env` files or configuration files containing secrets directly to version control (e.g., Git).**
*   Ensure only trusted individuals have access to the environment variables or configuration files where these secrets are stored.
*   Be mindful of the security implications when running this server, especially if exposing it beyond local use (which the current `stdio` transport does not do).

**This is a Proof-of-Concept and may have security shortcomings. Use with caution.**

## Prerequisites

*   Node.js (v18+ recommended)
*   npm (or yarn/pnpm)
*   Access to a Jira instance and a corresponding API Token.
*   Access to Google Cloud and a Gemini API Key.

## Setup

1.  **Clone:** Clone this repository.
2.  **Install:** Navigate to the project directory and run `npm install`.
3.  **Configure Environment Variables:**
    *   **For Standalone Use:** Create a `.env` file in the project root and add the following variables:
        ```dotenv
        JIRA_URL=https://your-domain.atlassian.net
        JIRA_EMAIL=your-jira-login-email@example.com
        JIRA_API_TOKEN=your-jira-api-token
        JIRA_PROJECT_KEY=YOUR_PROJECT_KEY # e.g., SCRUM
        GEMINI_API_KEY=your-google-ai-api-key
        # GEMINI_MODEL=gemini-1.5-flash-latest # Optional: Defaults to flash
        ```
    *   **For Cursor Use:** Configure the `env` block within your Cursor `claude_desktop_config.json` file (see "Running with Cursor" below). **Do not use a `.env` file if running via Cursor's config.**

## Building

Compile the TypeScript code to JavaScript:

```bash
npm run build
