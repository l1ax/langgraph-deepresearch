import {observer} from 'mobx-react-lite';
import {Handle, Position, NodeProps} from '@xyflow/react';
import {FileText, Sparkles, Loader2, CheckCircle2} from 'lucide-react';
import {cn} from '@/lib/utils';

interface BriefNodeData {
    status?: 'pending' | 'running' | 'done';
}

export const BriefGenerationNodeUi = observer((props: NodeProps) => {
    const data = props.data as BriefNodeData;
    const status = data?.status ?? 'pending';

    const statusStyles = {
        pending: {
            container: 'border-slate-200 bg-white/60 shadow-sm opacity-80',
            icon: 'text-slate-400 bg-slate-100',
            text: 'text-slate-500',
            handle: '!bg-slate-400'
        },
        running: {
            container: 'border-amber-400/50 bg-white/90 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/20',
            icon: 'text-amber-600 bg-amber-50',
            text: 'text-slate-800',
            handle: '!bg-amber-500'
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
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div className="flex flex-col">
                    <span className={cn("text-xs font-bold leading-none mb-0.5", style.text)}>Brief Gen</span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {status === 'done' ? 'Completed' : status}
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