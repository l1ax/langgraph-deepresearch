import {WorkflowViews} from '@/stores/views/workflowViews';
import {ReactFlow, Controls, Background, BackgroundVariant, ConnectionLineType} from '@xyflow/react';
import {observer} from 'mobx-react-lite';
import {nodeTypes} from './nodeUi';

interface IProps {
    store: WorkflowViews;
}

const defaultEdgeOptions = {
    type: 'smoothstep',
    animated: true,
    style: {
        stroke: '#94a3b8',
        strokeWidth: 2,
    },
};

export const WorkflowViewUi: React.FC<IProps> = observer(props => {
    const {store} = props;

    console.log(store.reactFlowEdges);

    return (
        <div className="w-full h-full bg-background">
            <ReactFlow
                nodes={store.reactFlowNodes}
                edges={store.reactFlowEdges}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
                fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                panOnScroll={true}
            >
                <Controls 
                    showInteractive={false}
                    className="!bg-background !border-border/50 !shadow-sm"
                />
                <Background 
                    variant={BackgroundVariant.Dots}
                    gap={16}
                    size={1}
                    color="#d1d5db"
                />
            </ReactFlow>
        </div>
    );
});