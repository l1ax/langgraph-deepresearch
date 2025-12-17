import {Handle, Position, NodeProps} from '@xyflow/react';
import {observer} from 'mobx-react-lite';
import {MessageCircle, HelpCircle, Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';

interface ClarifyNodeData {
    status?: 'pending' | 'running' | 'done';
}

export const ClarifyWithUserNodeUi = observer((props: NodeProps) => {
    const data = props.data as ClarifyNodeData;
    const status = data?.status ?? 'pending';

    const statusStyles = {
        pending: {
            container: 'border-slate-200 bg-white/60 shadow-sm opacity-80',
            icon: 'text-slate-400 bg-slate-100',
            text: 'text-slate-500',
            handle: '!bg-slate-400'
        },
        running: {
            container: 'border-violet-400/50 bg-white/90 shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)] ring-2 ring-violet-500/20',
            icon: 'text-violet-600 bg-violet-50',
            text: 'text-slate-800',
            handle: '!bg-violet-500'
        },
        done: {
            container: 'border-green-500/30 bg-white/90 shadow-md',
            icon: 'text-green-600 bg-green-50',
            text: 'text-slate-800',
            handle: '!bg-green-500'
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
                position={Position.Top} 
                className={cn("!w-2.5 !h-2.5 !border-[2px] !border-white transition-all duration-300", style.handle)}
            />
            <div className="flex items-center gap-3">
                <div className={cn(
                    "p-2 rounded-xl transition-colors duration-300 flex items-center justify-center",
                    style.icon
                )}>
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <HelpCircle className="h-4 w-4" />}
                </div>
                <div className="flex flex-col">
                    <span className={cn("text-xs font-bold leading-none mb-0.5", style.text)}>Clarification</span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {status === 'done' ? 'Resolved' : status}
                    </span>
                </div>
            </div>
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className={cn("!w-2.5 !h-2.5 !border-[2px] !border-white transition-all duration-300", style.handle)}
            />
        </div>
    );
});