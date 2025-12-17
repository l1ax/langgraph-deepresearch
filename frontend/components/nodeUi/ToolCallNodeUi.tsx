import {observer} from 'mobx-react-lite';
import {Handle, Position, NodeProps} from '@xyflow/react';
import {Wrench, Hammer, Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';

interface ToolCallNodeData {
    status?: 'pending' | 'running' | 'done';
    tool_name?: string;
}

export const ToolCallNodeUi = observer((props: NodeProps) => {
    const data = props.data as ToolCallNodeData;
    const status = data?.status ?? 'pending';
    const toolName = data?.tool_name || 'Tool Call';

    const statusStyles = {
        pending: {
            container: 'border-slate-200 bg-white/60 shadow-sm opacity-80',
            icon: 'text-slate-400 bg-slate-100',
            text: 'text-slate-500',
            handle: '!bg-slate-400'
        },
        running: {
            container: 'border-orange-400/50 bg-white/90 shadow-[0_0_20px_-5px_rgba(249,115,22,0.3)] ring-2 ring-orange-500/20',
            icon: 'text-orange-600 bg-orange-50',
            text: 'text-slate-800',
            handle: '!bg-orange-500'
        },
        done: {
            container: 'border-orange-500/30 bg-white/90 shadow-md',
            icon: 'text-orange-600 bg-orange-50',
            text: 'text-slate-800',
            handle: '!bg-orange-500'
        },
    };

    const style = statusStyles[status] || statusStyles.pending;
    const isRunning = status === 'running';

    return (
        <div className={cn(
            "relative group rounded-2xl border transition-all duration-500 ease-out backdrop-blur-sm px-4 py-3 min-w-[160px]",
            style.container
        )}>
            <Handle 
                type="target" 
                position={Position.Left} 
                className={cn("!w-2.5 !h-2.5 !border-[2px] !border-white transition-all duration-300", style.handle)}
            />
            <div className="flex items-center gap-3">
                <div className={cn(
                    "p-2 rounded-xl transition-colors duration-300 flex items-center justify-center",
                    style.icon
                )}>
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
                </div>
                <div className="flex flex-col">
                    <span className={cn("text-xs font-bold leading-none mb-0.5 max-w-[120px] truncate", style.text)} title={toolName}>
                        {toolName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {status === 'done' ? 'Executed' : status}
                    </span>
                </div>
            </div>
            <Handle 
                type="source" 
                position={Position.Right} 
                className={cn("!w-2.5 !h-2.5 !border-[2px] !border-white transition-all duration-300", style.handle)}
            />
        </div>
    );
});
