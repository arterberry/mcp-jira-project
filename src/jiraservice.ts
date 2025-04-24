// src/jiraService.ts

import config from './config.js';
import type { JiraIssueData, JiraIssueApiResponse } from './types.js';
import fetch, { Response, Headers } from 'node-fetch';

export function formatTicketId(ticketInput: string): string {
    const projectKey = config.jira.projectKey!;
    const inputStr = ticketInput.trim();

    if (/^\d+$/.test(inputStr)) {        
        return `${projectKey.toUpperCase()}-${inputStr}`;
    }
    else if (/^[A-Z][A-Z0-9]+-\d+$/i.test(inputStr)) {
        return inputStr.toUpperCase();
    }
    else {
        throw new Error(`Invalid Jira ticket ID format provided: "${ticketInput}". Expected format like "PROJ-123".`);
    }
}

export async function getJiraIssueData(ticketInput: string): Promise<JiraIssueData> {
    const url = config.jira.url!;
    const email = config.jira.email!;
    const apiToken = config.jira.apiToken!;

    let sanitizedTicketId: string;
    try {
        sanitizedTicketId = formatTicketId(ticketInput);
    } catch (error) {
        throw error;
    }

    const fieldsToFetch: string[] = ['summary', 'description', 'comment'];
    const apiUrl = `${url}/rest/api/3/issue/${sanitizedTicketId}?fields=${fieldsToFetch.join(',')}`;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const headers = new Headers({
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    });

    try {
        const response: Response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            let errorBody = '';
            try { errorBody = await response.text(); } catch { /* ignore */ }
            if (response.status === 404) throw new Error(`Jira issue ${sanitizedTicketId} not found.`);
            if (response.status === 401) throw new Error(`Jira authentication failed (401). Check JIRA_EMAIL and JIRA_API_TOKEN.`);
            if (response.status === 403) throw new Error(`Jira authorization failed (403). The user '${email}' may lack permissions for project/issue ${sanitizedTicketId}.`);
            throw new Error(`Jira API request failed for ${sanitizedTicketId}. Status: ${response.status} ${response.statusText}. Body: ${errorBody || '(could not read body)'}`);
        }

        const data = await response.json() as JiraIssueApiResponse;
        const issueData: JiraIssueData = {
            id: data.key,
            url: `${url}/browse/${data.key}`,
            summary: data.fields.summary || 'No summary provided.',
            description: data.fields.description,
            comments: data.fields.comment?.comments?.map(comment => comment.body) || [],
        };

        return issueData;

    } catch (error: any) {
        if (error instanceof Error) {
             throw error;
        } else {
             throw new Error(`An unexpected error occurred fetching Jira data: ${String(error)}`);
        }
    }
}
