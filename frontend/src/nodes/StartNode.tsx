import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { getFlowNodeHighlighted, type FlowNodeData } from '../utils/dslParser'

const StartNode: React.FC<NodeProps<FlowNodeData>> = ({ data }) => {
  const highlighted = getFlowNodeHighlighted(data)
  return (
    <div className="node-highlight" style={{ 
      padding: '12px 16px', 
      borderRadius: 12, 
      background: highlighted ? '#4ade80' : '#22c55e',
      color: '#fff',
      boxShadow: highlighted ? '0 0 20px rgba(34, 197, 94, 0.6)' : '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: 120,
      transition: 'all 200ms ease'
    }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>🚀 Start</div>
      <Handle type="source" position={Position.Bottom} id="out" style={{ background: '#fff', width: 12, height: 12 }} />
    </div>
  )
}

export default StartNode
