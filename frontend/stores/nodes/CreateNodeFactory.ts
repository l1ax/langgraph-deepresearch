import {AnyEvent} from '../events';
import { BaseNode } from './BaseNode';
import { ClarifyWithUserNode } from './ClarifyWithUserNode';
import { BriefGenerationNode } from './BriefGenerationNode';
import { UserNode } from './UserNode';

export function createNodeFactory(type: BaseNode.NodeType): BaseNode {
    switch (type) {
        case 'ClarifyWithUser':
            return new ClarifyWithUserNode();
        case 'BriefGeneration':
            return new BriefGenerationNode();
        case 'User':
            return new UserNode();
        default:
            throw new Error(`Unknown node type: ${type}`);
    }
}