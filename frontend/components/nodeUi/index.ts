import {NodeTypes} from '@xyflow/react';
import { ClarifyWithUserNodeUi } from './ClarifyWithUserNodeUi';
import { BriefGenerationNodeUi } from './BriefGenerationNodeUi';
import { UserNodeUi } from './UserNodeUi';
import { SupervisorNodeUi } from './SupervisorNodeUi';
import { ResearcherNodeUi } from './ResearcherNodeUi';
import { ToolCallNodeUi } from './ToolCallNodeUi';
import { BasicOutputNodeUi } from './BasicOutputNodeUi';

export const nodeTypes: NodeTypes = {
    ClarifyWithUser: ClarifyWithUserNodeUi,
    BriefGeneration: BriefGenerationNodeUi,
    User: UserNodeUi,
    Supervisor: SupervisorNodeUi,
    Researcher: ResearcherNodeUi,
    ToolCall: ToolCallNodeUi,
    BasicOutput: BasicOutputNodeUi,
};