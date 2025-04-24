// src/server.ts

// --- core mcp sdk imports ---
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// --- localized tmports ---
import config from './config.js';
import { getJiraIssueData, formatTicketId } from './jiraservice.js';
import { generateTestsWithGemini } from './aiservice.js';
import type { JiraIssueData } from './types.js';

// --- define input shape (number only) ---
// TODO: will change this to support a string ticket ID in the future
const GetTicketNumberInputShape = z.object({
    ticketNumber: z.number().int().positive("Ticket number must be a positive integer"),
});

type GetTicketNumberInput = z.infer<typeof GetTicketNumberInputShape>;

// --- define output schema ---
const TestReadinessSchema = z.object({
    jiraUrl: z.string().url(),
    jiraSummary: z.string(),
    testPlanAndScript: z.string(),
    aiResultStatus: z.enum(['success', 'fallback']),
});

const GetTestReadinessResultSchema = z.object({
    protocolVersion: z.string(),
    source: z.string(),
    identifier: z.string(), 
    context: TestReadinessSchema,
});
type GetTestReadinessResult = z.infer<typeof GetTestReadinessResultSchema>;

// --- mcp implementation ---
const getTestReadinessHandler = async (input: GetTicketNumberInput) => { 
    // console.error(`[MCP Tool: getTestReadinessPerJira] Handler invoked.`);

    // --- construct ticket ---
    const ticketNumber = input.ticketNumber;
    const ticketPrefix = config.jira.projectKey!; 
    const ticketInput = `${ticketPrefix}-${ticketNumber}`;
    // console.error(`[MCP Tool: getTestReadinessPerJira] Processing ticketNumber: ${ticketNumber} as ${ticketInput}`);

    let formattedTicketId: string = '';

    try {
        formattedTicketId = formatTicketId(ticketInput);
        const jiraData: JiraIssueData = await getJiraIssueData(formattedTicketId);
        const aiOutput: string = await generateTestsWithGemini(jiraData);

        const isFallback = aiOutput.includes("Insufficient information");

        const responsePayload: GetTestReadinessResult = {
            protocolVersion: config.mcp.protocolVersion,
            source: 'jira+gemini',
            identifier: formattedTicketId,
            context: {
                jiraUrl: jiraData.url,
                jiraSummary: jiraData.summary,
                testPlanAndScript: aiOutput, // check output
                aiResultStatus: isFallback ? 'fallback' : 'success',
            },
        };
        GetTestReadinessResultSchema.parse(responsePayload); 

        return {
            content: [{ type: "text", text: JSON.stringify(responsePayload, null, 2) }]
        };

    } catch (error: any) {
        // console.error(`[MCP Tool: getTestReadinessPerJira] Error during processing for input number "${ticketNumber}" (Formatted ID: ${formattedTicketId || 'N/A'}): ${error instanceof Error ? error.stack : String(error)}`);
        throw error; 
    }
};

// --- initialize mcp server ---
const serverInfo = {
    name: "Jira Test Readiness Generator", 
    version: "0.1.0",
};
const server = new McpServer(serverInfo);

// mcp registery
server.tool(
    "getTestReadinessPerJira", 
    "Accepts a Jira ticket number, fetches details, generates a test checklist and Zsh script using AI.", // desc
    GetTicketNumberInputShape.shape, 
    getTestReadinessHandler as any // handler function
);

// --- server setup & transport ---
const transport = new StdioServerTransport();
server.connect(transport)
    .then(() => {
        // console.error("[MCP Server] Connected via stderr.");
    })
    .catch((err) => {
        console.error("[MCP Server] Failed to connect:", err);
        process.exit(1);
    });

// --- shutdown ---
const shutdown = () => {
    // console.error("[MCP Server] Shutting down...");
    server.close().then(() => {
        // console.error("[MCP Server] Closed via stderr.");
        process.exit(0);
    }).catch(err => {
        console.error("[MCP Server] Shutdown error:", err);
        process.exit(1);
    });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
