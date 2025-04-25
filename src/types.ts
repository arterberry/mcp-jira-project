// src/types.ts

export interface JiraIssueData {
    id: string;
    url: string;
    summary: string;
    description: any; // Atlassian Document Format (ADF)
    comments: any[]; // ADF comments 
}


export interface JiraIssueApiResponse {
    key: string;
    fields: {
        summary?: string;
        description?: any; // ADF object or null
        comment?: {
            comments?: { body: any }[]; // Array of comment objects with ADF body
        };
    };
}
// NOTE: removed a parser (ParsedAiResponse) since the output is a single string. May change in the future.
