import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { MemorySaver, type BaseCheckpointSaver } from "@langchain/langgraph";
import dotenv from 'dotenv';

dotenv.config();

const isDevelopment = process.env.NODE_ENV !== 'production';
const useMemorySaver = isDevelopment && process.env.USE_MEMORY_SAVER !== 'false';

let checkpointer: BaseCheckpointSaver;

if (useMemorySaver) {
    console.log('🧠 Using MemorySaver for local development');
    checkpointer = new MemorySaver();
} else {
    console.log('🗄️  Using PostgresSaver for production');

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined in environment variables");
    }

    checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);
}

export { checkpointer };

/**
 * Initialize the checkpointer tables.
 * This should be called once before using the checkpointer.
 * Note:
 * - PostgresSaver.setup() creates the necessary tables if they don't exist.
 * - MemorySaver doesn't require setup.
 */
export async function initCheckpointer() {
    if (checkpointer instanceof PostgresSaver) {
        console.log('Initializing PostgreSQL checkpoint tables...');
        await checkpointer.setup();
    } else {
        console.log('MemorySaver does not require initialization');
    }
}
