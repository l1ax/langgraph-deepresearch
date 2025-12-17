import {observer} from 'mobx-react-lite';
import {Handle, Position, NodeProps} from '@xyflow/react';
import {Search, ScanSearch, Loader2, Check, ExternalLink} from 'lucide-react';
import {cn} from '@/lib/utils';
import {BaseNode} from '@/stores/nodes';

interface ResearcherNodeData {
    status?: BaseNode.NodeStatus;
    label?: string;
}

export const ResearcherNodeUi = observer((props: NodeProps) => {
    const data = props.data as ResearcherNodeData;
    const status = data?.status ?? 'pending';
    const label = data?.label || 'Researcher';

    const isRunning = status === 'running';

    // Premium Styles Map
    const styles = {
        pending: {
            container: 'glass-card opacity-80 hover:opacity-100',
            iconBg: 'bg-slate-100 dark:bg-slate-800',
            iconColor: 'text-slate-400 dark:text-slate-500',
            textColor: 'text-slate-500 dark:text-slate-400',
            handle: '!bg-slate-300 dark:!bg-slate-600',
            badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        },
        running: {
            container: 'glass-card !border-blue-400/50 !shadow-[var(--shadow-glow-blue)] ring-1 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10',
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600 dark:text-blue-400',
            textColor: 'text-slate-800 dark:text-slate-200',
            handle: '!bg-blue-500',
            badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
        },
        finished: {
            container: 'glass-card !border-emerald-500/30 bg-white/80 dark:bg-slate-900/80',
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-500',
            textColor: 'text-slate-800 dark:text-slate-200',
            handle: '!bg-emerald-500',
            badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        },
        error: {
            container: 'glass-card !border-rose-400/50 bg-rose-50/30 dark:bg-rose-900/10',
            iconBg: 'bg-rose-50 dark:bg-rose-900/20',
            iconColor: 'text-rose-600 dark:text-rose-500',
            textColor: 'text-slate-800 dark:text-slate-200',
            handle: '!bg-rose-500',
            badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
        },
    };

    const style = styles[status] || styles.pending;

    return (
        <div 
            className={cn(
                "relative group rounded-2xl min-w-[200px] transition-all duration-500 ease-out p-3",
                style.container
            )}
        >
            <Handle 
                type="target" 
                position={Position.Left} 
                className={cn(
                    "!w-3 !h-3 !border-[3px] !border-white dark:!border-slate-900 rounded-full transition-all duration-300", 
                    style.handle
                )}
            />
            
            <div className="flex items-start gap-3">
                <div className={cn(
                    "p-2.5 rounded-xl transition-colors duration-300 flex items-center justify-center shrink-0",
                    style.iconBg
                )}>
                    {isRunning ? (
                        <Loader2 className={cn("h-5 w-5 animate-spin", style.iconColor)} />
                    ) : status === 'finished' ? (
                        <Check className={cn("h-5 w-5", style.iconColor)} />
                    ) : (
                        <ScanSearch className={cn("h-5 w-5", style.iconColor)} />
                    )}
                </div>
                
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-sm font-bold leading-tight truncate px-0.5", style.textColor)}>
                            {label}
                        </span>
                        {/* Status Badge */}
                        <div className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider tabular-nums ml-2", style.badge)}>
                            {status === 'finished' ? 'DONE' : status}
                        </div>
                    </div>
                    
                    {/* Progress Bar (Visual only for now) */}
                    {isRunning && (
                        <div className="h-1 w-full bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full bg-blue-500 rounded-full w-2/3 animate-[progress_2s_ease-in-out_infinite]" />
                        </div>
                    )}
                </div>
            </div>

            <Handle 
                type="source" 
                position={Position.Right} 
                className={cn(
                    "!w-3 !h-3 !border-[3px] !border-white dark:!border-slate-900 rounded-full transition-all duration-300", 
                    style.handle
                )}
            />
        </div>
    );
});
