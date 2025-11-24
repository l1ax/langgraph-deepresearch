/**
 * @file Simple test for research agent graph
 */

import { HumanMessage } from '@langchain/core/messages';
import { researchAgentGraph } from '../src/graph';
import dotenv from 'dotenv';

dotenv.config();

async function testResearchAgent() {
    console.log('Testing Research Agent Graph...\n');

    const researchBrief = `I want to identify and evaluate the coffee shops in San Francisco that are considered the best based specifically on coffee quality.`;

    try {
        const result = await researchAgentGraph.invoke({
            researcher_messages: [
                new HumanMessage({ content: `${researchBrief}.` }),
            ],
        });

        console.log('Research Agent completed successfully!');
        console.log('\n--- Compressed Research ---');
        console.log(result.compressed_research);
        console.log('\n--- Raw Notes Count ---');
        console.log(`${result.raw_notes.length} notes collected`);
    } catch (error) {
        console.error('Error running research agent:', error);
        throw error;
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testResearchAgent()
        .then(() => {
            console.log('\nTest completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nTest failed:', error);
            process.exit(1);
        });
}

export { testResearchAgent };
