import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { CONTINUATION_HANDLE, getFlowNodeHighlighted, getFlowNodeParams, type FlowNodeData } from '../utils/dslParser'

const ActionNode: React.FC<NodeProps<FlowNodeData>> = ({ data }) => {
  const highlighted = getFlowNodeHighlighted(data)
  const params = getFlowNodeParams(data)
  const target = typeof params.target === 'string' ? params.target : 'action'
  const action = typeof params.action === 'string' ? params.action : 'tap'
  
  return (
    <div className="node-highlight" style={{ 
      padding: '12px 16px', 
      borderRadius: 12, 
      background: highlighted ? '#60a5fa' : '#3b82f6',
      color: '#fff',
      boxShadow: highlighted ? '0 0 20px rgba(59, 130, 246, 0.6)' : '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: 140,
      transition: 'all 200ms ease'
    }}>
      <Handle className="node-target-handle" type="target" position={Position.Top} id="in" style={{ background: '#fff', width: 12, height: 12 }} />
      <div style={{ fontWeight: 700, fontSize: 14 }}>🎯 {action}</div>
      <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>{target}</div>
      <Handle type="source" position={Position.Bottom} id={CONTINUATION_HANDLE} style={{ background: '#fff', width: 12, height: 12 }} />
    </div>
  )
}

export default ActionNode
