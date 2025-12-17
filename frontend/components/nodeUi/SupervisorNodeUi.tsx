import {observer} from 'mobx-react-lite';
import {Handle, Position, NodeProps} from '@xyflow/react';
import {Crown, Sparkles, Activity, CheckCircle2} from 'lucide-react';
import {cn} from '@/lib/utils';
import {BaseNode} from '@/stores/nodes';

interface SupervisorNodeData {
    status?: BaseNode.NodeStatus;
    label?: string;
}

export const SupervisorNodeUi = observer((props: NodeProps) => {
    const data = props.data as SupervisorNodeData;
    const status = data?.status ?? 'pending';
    const label = data?.label || 'Supervisor';

    // Node dimensions from ReactFlow
    const { width, height } = props;

    const isRunning = status === 'running';
    const isFinished = status === 'finished';
    const isError = status === 'error';

    return (
        <div 
            className={cn(
                "relative rounded-3xl border transition-all duration-500 ease-out backdrop-blur-xl overflow-hidden",
                // Base & Pending (Glass)
                "bg-white/60 dark:bg-black/60 border-white/40 dark:border-white/10 shadow-sm",
                // Running (Active Jewel)
                isRunning && "border-indigo-400/50 bg-indigo-50/40 dark:bg-indigo-900/20 shadow-[0_0_50px_-10px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500/30",
                // Finished
                isFinished && "border-slate-300/60 bg-slate-50/40",
                // Error
                isError && "border-destructive/30 bg-destructive/5"
            )}
            style={{
                width: width ? `${width}px` : 'auto',
                height: height ? `${height}px` : 'auto',
            }}
        >
            {/* Top Handle */}
            <Handle 
                type="target" 
                position={Position.Top} 
                className={cn(
                    "!w-3 !h-3 !border-[2px] !border-white transition-all duration-300 z-50 rounded-full",
                    "!bg-slate-300",
                    isRunning && "!bg-indigo-500 !w-4 !h-4 shadow-[0_0_10px_rgba(99,102,241,0.6)]",
                    isFinished && "!bg-emerald-500"
                )}
            />
            
            {/* Header Area */}
            <div className={cn(
                "flex items-center gap-3 px-5 py-4 border-b transition-colors duration-300",
                "border-white/20 dark:border-white/5",
                isRunning && "bg-indigo-500/5",
            )}>
                <div className={cn(
                    "p-2 rounded-xl shadow-sm transition-all duration-500",
                    "bg-white text-slate-400 border border-slate-100",
                    isRunning && "bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-transparent shadow-lg shadow-indigo-500/30 scale-110",
                    isFinished && "bg-emerald-500 text-white shadow-emerald-200",
                    isError && "bg-rose-500 text-white"
                )}>
                    {isRunning ? <Activity className="h-4 w-4 animate-pulse" /> : <Crown className="h-4 w-4" />}
                </div>
                
                <div className="flex flex-col">
                    <span className={cn(
                        "text-sm font-bold tracking-tight transition-colors duration-300",
                        "text-slate-600 dark:text-slate-300",
                        isRunning && "text-indigo-600 dark:text-indigo-400",
                        isFinished && "text-slate-800"
                    )}>
                        {label}
                    </span>
                    {isRunning && (
                        <span className="text-[10px] uppercase font-bold text-indigo-400 animate-pulse tracking-wider">
                            Active
                        </span>
                    )}
                </div>
                
                <div className="flex-1" />
                
                {/* Status Badge */}
                {isFinished && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            </div>

            {/* Subgraph Container Area */}
            <div className={cn(
                "relative w-full flex-1 transition-colors duration-500",
                "bg-slate-50/10 dark:bg-black/20",
                isRunning && "bg-gradient-to-b from-indigo-500/5 to-transparent"
            )}>
                {/* Optional decorative background pattern could go here */}
            </div>

            {/* Bottom Handle */}
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className={cn(
                    "!w-3 !h-3 !border-[2px] !border-white transition-all duration-300 z-50 rounded-full",
                    "!bg-slate-300",
                    isRunning && "!bg-indigo-500 !w-4 !h-4 shadow-[0_0_10px_rgba(99,102,241,0.6)]",
                    isFinished && "!bg-emerald-500"
                )}
            />
        </div>
    );
});
