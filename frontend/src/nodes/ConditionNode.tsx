import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import {
  CONDITION_FALSE_HANDLE,
  CONDITION_TRUE_HANDLE,
  CONTINUATION_HANDLE,
  getFlowNodeHighlighted,
  getFlowNodeParams,
  type FlowNodeData,
} from '../utils/dslParser'

const ConditionNode: React.FC<NodeProps<FlowNodeData>> = ({ data }) => {
  const highlighted = getFlowNodeHighlighted(data)
  const params = getFlowNodeParams(data)
  const condition = typeof params.condition === 'string' ? params.condition : 'if...'
  
  return (
    <div className="node-highlight" style={{ 
      padding: '12px 16px', 
      borderRadius: 12, 
      background: highlighted ? '#c084fc' : '#a855f7',
      color: '#fff',
      boxShadow: highlighted ? '0 0 20px rgba(168, 85, 247, 0.6)' : '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: 140,
      position: 'relative',
      transition: 'all 200ms ease'
    }}>
      <Handle className="node-target-handle" type="target" position={Position.Top} id="in" style={{ background: '#fff', width: 12, height: 12 }} />
      <div style={{ fontWeight: 700, fontSize: 14 }}>❓ If</div>
      <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>{condition}</div>
      <Handle type="source" position={Position.Right} id={CONDITION_TRUE_HANDLE} style={{ background: '#22c55e', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Left} id={CONDITION_FALSE_HANDLE} style={{ background: '#ef4444', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Bottom} id={CONTINUATION_HANDLE} style={{ background: '#fff', width: 12, height: 12 }} />
      <div style={{ position: 'absolute', right: -32, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#22c55e', fontWeight: 600 }}>✓</div>
      <div style={{ position: 'absolute', left: -32, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#ef4444', fontWeight: 600 }}>✗</div>
    </div>
  )
}

export default ConditionNode
