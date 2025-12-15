import {observer} from 'mobx-react-lite';
import {Handle, Position, NodeProps} from '@xyflow/react';
import {User} from 'lucide-react';

export const UserNodeUi = observer((props: NodeProps) => {
    return (
        <div className="relative px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5 shadow-sm min-w-[140px]">
            <Handle 
                type="target" 
                position={Position.Top} 
                className="!w-2 !h-2 !bg-primary/50 !border-0"
            />
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground/80">用户输入</span>
            </div>
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="!w-2 !h-2 !bg-primary/50 !border-0"
            />
        </div>
    );
});