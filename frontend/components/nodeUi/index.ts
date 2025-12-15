import {NodeTypes} from '@xyflow/react';
import { ClarifyWithUserNodeUi } from './ClarifyWithUserNodeUi';
import { BriefGenerationNodeUi } from './BriefGenerationNodeUi';
import { UserNodeUi } from './UserNodeUi';

export const nodeTypes: NodeTypes = {
    ClarifyWithUser: ClarifyWithUserNodeUi,
    BriefGeneration: BriefGenerationNodeUi,
    User: UserNodeUi,
};