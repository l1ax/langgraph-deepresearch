import {observer} from 'mobx-react-lite';
import {Handle, Position, NodeProps} from '@xyflow/react';
import {User, Circle} from 'lucide-react';
import {cn} from '@/lib/utils';

export const UserNodeUi = observer((props: NodeProps) => {
    return (
        <div 
            className={cn(
                "relative group rounded-2xl border transition-all duration-500 ease-out backdrop-blur-sm px-4 py-3 min-w-[140px]",
                "border-sky-500/30 bg-white/80 shadow-[0_4px_20px_-8px_rgba(14,165,233,0.3)]", // Base style specific for User node
                "hover:shadow-[0_8px_25px_-8px_rgba(14,165,233,0.4)] hover:scale-[1.02]"
            )}
        >
            {/* Handles */}
            <Handle 
                type="target" 
                position={Position.Top} 
                className="!w-2.5 !h-2.5 !border-[2px] !border-white !bg-sky-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            
            {/* Content */}
            <div className="flex items-center gap-3">
                <div className={cn(
                    "p-2 rounded-xl transition-all duration-300 flex items-center justify-center shadow-sm",
                    "bg-sky-100/50 text-sky-600 group-hover:bg-sky-100 group-hover:text-sky-700"
                )}>
                    <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col justify-center">
                    <span className="text-sm font-bold text-slate-700 mb-0.5 leading-none">
                        User Input
                    </span>
                    <span className="text-[10px] text-sky-500/80 font-medium uppercase tracking-wider flex items-center gap-1">
                        <Circle className="w-1.5 h-1.5 fill-current animate-pulse" />
                        Trigger
                    </span>
                </div>
            </div>

            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="!w-2.5 !h-2.5 !border-[2px] !border-white !bg-sky-400 transition-all duration-300 group-hover:scale-125"
            />
        </div>
    );
});