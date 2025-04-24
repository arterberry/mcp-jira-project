import dotenv from 'dotenv';
dotenv.config();

interface Config {
    port: number;
    jira: {
        url: string | undefined;
        email: string | undefined;
        apiToken: string | undefined;
        projectKey: string | undefined;
    };
    gemini: {
        apiKey: string | undefined;
        model: string;
    };
    mcp: {
        protocolVersion: string;
    };
}

const config: Config = {
    port: parseInt(process.env.PORT || '3000', 10),
    jira: {
        url: process.env.JIRA_URL,
        email: process.env.JIRA_EMAIL,
        apiToken: process.env.JIRA_API_TOKEN,
        projectKey: process.env.JIRA_PROJECT_KEY,
    },
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
    },
    mcp: {
        protocolVersion: '1.0',
    }
};

const requiredEnv: { [key: string]: string | undefined } = {
    'JIRA_URL': config.jira.url,
    'JIRA_EMAIL': config.jira.email,
    'JIRA_API_TOKEN': config.jira.apiToken,
    'JIRA_PROJECT_KEY': config.jira.projectKey,
    'GEMINI_API_KEY': config.gemini.apiKey,
};

let missingVars = false;
for (const [key, value] of Object.entries(requiredEnv)) {
    if (!value) {
        // console.error(`ERROR: Required environment variable ${key} is missing.`); // Commented out
        missingVars = true;
    }
}

if (missingVars) {
    // console.error("Fatal: Configuration incomplete. Please check your .env file or environment variables."); // Commented out
    process.exit(1);
}

export default config;
