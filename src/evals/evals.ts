//evals.ts

import { EvalConfig } from 'mcp-evals';
import { openai } from "@ai-sdk/openai";
import { grade, EvalFunction } from "mcp-evals";

const pg_psqlEval: EvalFunction = {
    name: "pg_psql Tool Evaluation",
    description: "Evaluates the functionality of the pg_psql tool",
    run: async () => {
        const result = await grade(openai("gpt-4"), "How can I create a new table named 'users' with two columns id and name, then retrieve all rows using pg_psql?");
        return JSON.parse(result);
    }
};

const pg_infoEval: EvalFunction = {
    name: 'PG Info Tool Evaluation',
    description: 'Evaluates the database status retrieval from the PG Info tool',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Show me the status of the 'mydb' database in the 'myapp' app using the pg_info tool.");
        return JSON.parse(result);
    }
};

const pg_psEval: EvalFunction = {
    name: 'pg_ps tool evaluation',
    description: 'Evaluates the monitoring of active queries: progress, resources, performance',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Show me the currently running queries on the 'mydb' database with verbose output so I can monitor resource usage on Heroku");
        return JSON.parse(result);
    }
};

const pgLocksEval: EvalFunction = {
    name: 'pg_locks Tool Evaluation',
    description: 'Evaluates the functionality of the pg_locks tool',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Please analyze the locks for the database 'mydb' to check for blocked queries or deadlocks.");
        return JSON.parse(result);
    }
};

const pg_outliersEval: EvalFunction = {
    name: 'pg_outliers Tool Evaluation',
    description: 'Evaluates the tool for finding resource-heavy queries in Postgres',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Which queries in my Postgres database are the most resource-intensive and how can I optimize them?");
        return JSON.parse(result);
    }
};

const config: EvalConfig = {
    model: openai("gpt-4"),
    evals: [pg_psqlEval, pg_infoEval, pg_psEval, pgLocksEval, pg_outliersEval]
};
  
export default config;
  
export const evals = [pg_psqlEval, pg_infoEval, pg_psEval, pgLocksEval, pg_outliersEval];