import {observer} from 'mobx-react-lite';
import {Handle, Position, NodeProps} from '@xyflow/react';
import {MessageSquare, FileText, Loader2, CheckCircle2, AlertCircle} from 'lucide-react';
import {cn} from '@/lib/utils';
import {BaseNode} from '@/stores/nodes';

interface BasicOutputNodeData {
    status?: BaseNode.NodeStatus;
    label?: string;
    subType?: string;
}

const getSubTypeConfig = (subType: string = 'chat') => {
    switch (subType) {
        case 'report_generation':
            return {
                title: 'Report Generation',
                Icon: FileText,
                theme: 'amber',
            };
        case 'chat':
        default:
            return {
                title: 'LLM Worker',
                Icon: MessageSquare,
                theme: 'blue',
            };
    }
};

export const BasicOutputNodeUi = observer((props: NodeProps) => {
    const data = props.data as BasicOutputNodeData;
    const status = data?.status ?? 'pending';
    const subType = data?.subType ?? 'chat';
    
    const config = getSubTypeConfig(subType);
    let Icon = config.Icon;
    const label = data?.label || config.title;

    // Status-based styles
    const statusStyles = {
        pending: {
            container: 'border-slate-200 bg-white/60 shadow-sm opacity-80',
            icon: 'text-slate-400 bg-slate-100',
            text: 'text-slate-500',
            ring: '',
        },
        running: {
            container: 'border-blue-400/50 bg-white/90 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]',
            icon: 'text-blue-600 bg-blue-50',
            text: 'text-slate-700',
            ring: 'ring-2 ring-blue-500/20 animate-pulse',
        },
        finished: {
            container: 'border-emerald-500/30 bg-white/90 shadow-md',
            icon: 'text-emerald-600 bg-emerald-50',
            text: 'text-slate-800',
            ring: '',
        },
        error: {
            container: 'border-rose-400/50 bg-white/90 shadow-sm',
            icon: 'text-rose-600 bg-rose-50',
            text: 'text-slate-800',
            ring: 'ring-2 ring-rose-500/20',
        },
    };

    let currentStyle = statusStyles.pending;
    if (status === 'running') {
        currentStyle = statusStyles.running;
    } else if (status === 'finished') {
        currentStyle = statusStyles.finished;
    } else if (status === 'error') {
        currentStyle = statusStyles.error;
    }

    const isRunning = status === 'running';

    return (
        <div 
            className={cn(
                "relative group rounded-2xl border transition-all duration-500 ease-out backdrop-blur-sm px-4 py-3 min-w-[140px]",
                currentStyle.container,
                currentStyle.ring
            )}
        >
            {/* Top Handle */}
            <Handle 
                type="target" 
                position={Position.Top} 
                className={cn(
                    "!w-2.5 !h-2.5 !border-[2px] !border-white !bg-slate-400 transition-colors duration-300",
                    status === 'running' && "!bg-blue-500",
                    status === 'finished' && "!bg-emerald-500",
                    "group-hover:scale-125"
                )}
            />
            
            {/* Content */}
            <div className="flex items-center gap-3">
                <div className={cn(
                    "p-2 rounded-xl transition-colors duration-300 flex items-center justify-center",
                    currentStyle.icon
                )}>
                    {isRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Icon className="h-4 w-4" />
                    )}
                </div>
                <div className="flex flex-col justify-center">
                    <span className={cn("text-xs font-bold leading-none mb-0.5", currentStyle.text)}>
                        {label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {status}
                    </span>
                </div>
            </div>

            {/* Bottom Handle */}
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className={cn(
                    "!w-2.5 !h-2.5 !border-[2px] !border-white !bg-slate-400 transition-colors duration-300",
                    status === 'running' && "!bg-blue-500",
                    status === 'finished' && "!bg-emerald-500",
                    "group-hover:scale-125"
                )}
            />
        </div>
    );
});
