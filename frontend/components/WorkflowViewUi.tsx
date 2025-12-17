'use client';

import {WorkflowViews} from '@/stores/views/workflowViews';
import {ReactFlow, Controls, Background, BackgroundVariant, ConnectionLineType, Panel} from '@xyflow/react';
import {observer} from 'mobx-react-lite';
import {nodeTypes} from './nodeUi';
import {useEffect} from 'react';
import { cn } from '@/lib/utils';

interface IProps {
    store: WorkflowViews;
}

const defaultEdgeOptions = {
    type: 'smoothstep',
    animated: true,
    style: {
        stroke: '#94a3b8', // Slate-400
        strokeWidth: 2,
    },
};

export const WorkflowViewUi: React.FC<IProps> = observer(props => {
    const {store} = props;

    // Auto-fit view when nodes change (e.g. new node added)
    useEffect(() => {
        if (store.reactflowInstance && store.graph.reactFlowNodes.length > 0) {
            // Use a small delay to allow ReactFlow to render the new node position
            const timer = setTimeout(() => {
                 store.reactflowInstance?.fitView({ padding: 0.3, duration: 800 });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [store.graph.reactFlowNodes.length, store.reactflowInstance]);

    return (
        <div className="w-full h-full bg-slate-50/50 dark:bg-slate-950/50 relative overflow-hidden group">
             {/* Decorative Ambient Gradient */}
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/30 via-transparent to-indigo-50/30 pointer-events-none" />
             
            <ReactFlow
                nodes={store.graph.reactFlowNodes}
                edges={store.graph.reactFlowEdges}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
                fitViewOptions={{ padding: 0.3, maxZoom: 1.2, minZoom: 0.5 }}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={true}
                elementsSelectable={true}
                panOnScroll={true}
                onInit={(r) => {
                    store.onInit(r);
                    // Wait for the panel transition (300ms) to complete before centering
                    setTimeout(() => {
                        console.log('Delayed fitView execution');
                        r.fitView({ padding: 0.3 });
                    }, 300);
                }}
                onNodesChange={store.onNodesChange}
                minZoom={0.2}
                maxZoom={2}
            >
                <Panel position="bottom-right" className="mb-6 mr-6 transition-transform duration-300 group-hover:scale-100 scale-95 opacity-0 group-hover:opacity-100">
                    <Controls 
                        showInteractive={false}
                        className={cn(
                            "!bg-white/70 dark:!bg-black/60",
                            "!backdrop-blur-xl",
                            "!border-white/20 dark:!border-white/10", 
                            "!shadow-lg", 
                            "!rounded-2xl overflow-hidden",
                            "[&>button]:!border-slate-100/50 dark:[&>button]:!border-white/5", 
                            "[&>button]:!text-slate-600 dark:[&>button]:!text-slate-300", 
                            "hover:[&>button]:!bg-white/50 dark:hover:[&>button]:!bg-white/10",
                            "!p-1.5 !gap-1 !m-0"
                        )}
                    />
                </Panel>
                <Background 
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1.5}
                    color="currentColor"
                    className="opacity-[0.15] text-slate-400 dark:text-slate-600"
                />
            </ReactFlow>
        </div>
    );
});