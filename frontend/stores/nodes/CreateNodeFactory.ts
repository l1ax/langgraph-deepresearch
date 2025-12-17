import {AnyEvent} from '../events';
import { BaseNode } from './BaseNode';
import { ClarifyWithUserNode } from './ClarifyWithUserNode';
import { BriefGenerationNode } from './BriefGenerationNode';
import { UserNode } from './UserNode';
import { SupervisorNode } from './SupervisorNode';
import { ResearcherNode } from './ResearcherNode';
import { ToolCallNode } from './ToolCallNode';
import { BasicOutputNode } from './BasicOutputNode';

export interface ICreateNodeFactoryParams {
    type: BaseNode.NodeType;
    toolCallName?: string;
    subType?: string;
}

export function createNodeFactory(params: ICreateNodeFactoryParams): BaseNode {
    switch (params.type) {
        case 'ClarifyWithUser':
            return ClarifyWithUserNode.createNew();
        case 'BriefGeneration':
            return BriefGenerationNode.createNew();
        case 'User':
            return UserNode.createNew();
        case 'Supervisor':
            return SupervisorNode.createNew();
        case 'Researcher':
            return ResearcherNode.createNew();
        case 'ToolCall':
            return ToolCallNode.createNew(params.toolCallName);
        case 'BasicOutput': {
            if (!params.subType) {
                throw new Error('subType is required for BasicOutput node');
            }
            return BasicOutputNode.createNew(params.subType);
        }
        default:
            throw new Error(`Unknown node type: ${params.type}`);
    }
}