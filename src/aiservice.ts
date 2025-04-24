// src/aiservice.ts

import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult, GenerateContentResponse } from "@google/generative-ai";
import config from './config.js';
import type { JiraIssueData } from './types.js';

// initialize Gemini (NOTE: I'm using this because I dont have an OpenAI key for FOX)
let genAI: GoogleGenerativeAI | undefined;
if (config.gemini.apiKey) {
     genAI = new GoogleGenerativeAI(config.gemini.apiKey);
}

// prompt gen
function generatePromptForGemini(jiraData: JiraIssueData): string {
    const descriptionText = jiraData.description
        ? (typeof jiraData.description === 'object' ? JSON.stringify(jiraData.description, null, 2) : String(jiraData.description))
        : 'No description provided.';

    const commentsText = jiraData.comments && jiraData.comments.length > 0
        ? jiraData.comments.map((comment: any, index: number) =>
            `Comment ${index + 1}:\n${typeof comment === 'object' ? JSON.stringify(comment, null, 2) : String(comment)}`
          ).join('\n\n')
        : 'No comments provided.';

    // --- prompt checklist and zsh script builder ---
    // TODO: This is the core driver (prompt) AND subject to change. I built this specifically for VIDINFRA.
    return `You are an API test planning and script generation assistant. Based on the following Jira ticket details, generate a test readiness checklist and a Zsh shell script containing relevant cURL commands.

**Input Jira Data:**
Ticket ID: ${jiraData.id}
Ticket URL: ${jiraData.url}
Summary: ${jiraData.summary}
Description:
${descriptionText}

Comments:
${commentsText}

---
**Instructions:**

1.  **Analyze:** Review the Summary, Description, and Comments to understand the required API interaction and testing goals.
2.  **Generate Test Checklist:** Create a concise checklist of test scenarios or summaries based on the analysis. Use markdown checklist format (e.g., \`- [ ] Test scenario 1 with X and Y.\`). Include at least 3-5 key test points if possible.
3.  **Generate Zsh Script:** Create a single, runnable Zsh shell script (\`#!/bin/zsh\`) containing relevant cURL commands to execute the tests outlined in the checklist. Use variables for clarity (e.g., BASE_URL, TOKEN). Add comments explaining each command's purpose. **After each primary \`curl\` command, add a basic check to report if the HTTP status code was 2xx (success) or non-2xx (potential failure).** Ensure the script is well-formatted.
4.  **Format:** Output the Test Checklist first, followed by two newline characters (\`\\n\\n\`), and then the complete Zsh Script. **DO NOT include markdown fences** like \`\`\`zsh around the script block.

**Output Format:**
- [ ] Test scenario 1.
- [ ] Test scenario 2.
- [ ] Test scenario 3.

#!/bin/zsh
# Test script for ${jiraData.id} - ${jiraData.summary}

# Variables (replace with actual values or environment variables using export)
# Example: export BASE_URL="https://your-api.com"; export TOKEN="YOUR_AUTH_TOKEN"
: "\${BASE_URL:="https://default-api.com"}" # Default if not set
: "\${TOKEN:="DEFAULT_TOKEN"}"             # Default if not set
EXPECTED_STATUS_SUCCESS="200" # Or 201, etc.
EXPECTED_STATUS_AUTH_ERROR="401" # Or 403

# Function to check status code
check_status() {
  local expected_code=$1
  local actual_code=$2
  local test_name=$3
  if [[ "\$actual_code" == "\$expected_code"* ]]; then
    echo "  [PASS] \$test_name: Received expected status code starting with \$expected_code."
  else
    echo "  [FAIL] \$test_name: Expected status code starting with \$expected_code, but got \$actual_code."
  fi
}

# Test Case 1: Description
echo "\\nRunning Test Case 1..."
status_code=\$(curl -s -o /dev/null -w "%{http_code}" -X GET "\${BASE_URL}/endpoint" -H "Authorization: Bearer \${TOKEN}")
check_status "\$EXPECTED_STATUS_SUCCESS" "\$status_code" "Test Case 1"
# Optional: Run again with -i to see full output if needed for debugging
# curl -i -X GET "\${BASE_URL}/endpoint" -H "Authorization: Bearer \${TOKEN}"
echo "---"

# Test Case 2: Description
echo "\\nRunning Test Case 2..."
status_code=\$(curl -s -o /dev/null -w "%{http_code}" -X POST "\${BASE_URL}/resource" -H "Authorization: Bearer \${TOKEN}" -H "Content-Type: application/json" -d '{"key": "value"}')
check_status "\$EXPECTED_STATUS_SUCCESS" "\$status_code" "Test Case 2" # Adjust expected code if needed (e.g., 201)
echo "---"

# Add more test cases corresponding to the checklist

echo "\\nAll tests completed."

---
**Fallback:** If the input data is clearly insufficient or lacks actionable details for test generation, respond ONLY with:
- [ ] Insufficient information to generate test plan.

#!/bin/zsh
# Insufficient information provided in Jira ticket to generate test script.
echo "Skipping tests due to insufficient information."
`;

}

// exported function to call Gemini API - which returns a single string
export async function generateTestsWithGemini(jiraData: JiraIssueData): Promise<string> {
    if (!genAI) {
        throw new Error("Gemini client not initialized. Check API Key configuration.");
    }

    const model: GenerativeModel = genAI.getGenerativeModel({ model: config.gemini.model });
    const prompt: string = generatePromptForGemini(jiraData);

    try {
        const result: GenerateContentResult = await model.generateContent(prompt);
        const response: GenerateContentResponse = result.response;
        const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (typeof text !== 'string' || text.length === 0) {
            const blockReason = response?.promptFeedback?.blockReason;
            if (blockReason) throw new Error(`Gemini response was blocked. Reason: ${blockReason}. Details: ${JSON.stringify(response.promptFeedback)}`);
            if (!response?.candidates || response.candidates.length === 0) throw new Error("Gemini response contained no candidates.");
            throw new Error("Extracted text from Gemini response was empty or invalid.");
        }

        // const stripFences = ...
        // return stripFences(text);
        return text.trim(); 

    } catch (error: any) {
        const message = error.message || 'Unknown error during Gemini API call';
        const details = error instanceof Error ? error.stack : String(error);
        throw new Error(`Gemini API request failed: ${message}${details ? `\nDetails: ${details}` : ''}`);
    }
}