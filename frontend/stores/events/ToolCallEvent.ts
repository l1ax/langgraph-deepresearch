import { BaseEvent } from './BaseEvent';

/**
 * 工具调用事件
 */
export class ToolCallEvent extends BaseEvent<ToolCallEvent.IContent> {
  content: ToolCallEvent.IContent;

  constructor(data: BaseEvent.IEventData<ToolCallEvent.IData>) {
    super(data);
    this.content = data.content;
  }

  /** 工具名称 */
  get toolName(): string {
    return this.content.data.tool_name;
  }

  /** 工具参数 */
  get toolArguments(): unknown {
    return this.content.data.tool_arguments;
  }

  /** 工具调用 ID */
  get toolCallId(): string {
    return this.content.data.tool_call_id;
  }

  /** 工具调用结果 */
  get toolResult(): unknown {
    return this.content.data.tool_result;
  }
}

export namespace ToolCallEvent {
  export interface IData {
    tool_name: string;
    tool_arguments: unknown;
    tool_call_id: string;
    tool_result: unknown;
  }

  export interface IContent extends BaseEvent.IContent {
    data: IData;
  }
}


