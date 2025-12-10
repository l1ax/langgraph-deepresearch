import {BaseEvent} from './BaseEvent';

export class ToolCallEvent extends BaseEvent<ToolCallEvent.IContent> {
    content: ToolCallEvent.IContent = {
        contentType: 'text',
        data: {
            tool_name: '',
            tool_arguments: {},
            tool_call_id: '',
            tool_result: null,
        },
    };

    /**
     * @param role 角色名称
     * @param deterministicId 可选的确定性 ID
     */
    constructor(role: BaseEvent.RoleName, deterministicId?: string) {
        super(BaseEvent.createEventType(role, 'tool_call'), deterministicId);
    }

    /** 设置工具调用信息 */
    setToolCall(toolName: string, toolArguments: unknown, toolCallId: string): this {
        this.content.data.tool_name = toolName;
        this.content.data.tool_arguments = toolArguments;
        this.content.data.tool_call_id = toolCallId;
        return this;
    }

    /** 设置工具调用结果 */
    setToolResult(result: unknown): this {
        this.content.data.tool_result = result;
        return this;
    }
}

export namespace ToolCallEvent {
    export interface IContent extends BaseEvent.IContent {
        contentType: 'text';
        data: {
            /** 工具名称 */
            tool_name: string;
            /** 工具参数 */
            tool_arguments: unknown;
            /** 工具调用 ID */
            tool_call_id: string;
            /** 工具调用结果 */
            tool_result: unknown;
        };
    }
}

