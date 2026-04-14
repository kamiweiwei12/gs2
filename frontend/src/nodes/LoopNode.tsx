import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import {
  CONTINUATION_HANDLE,
  LOOP_BODY_HANDLE,
  TARGET_HANDLE,
  getFlowNodeHighlighted,
  getFlowNodeParams,
  type FlowNodeData,
} from '../utils/dslParser'

const LoopNode: React.FC<NodeProps<FlowNodeData>> = ({ data }) => {
  const highlighted = getFlowNodeHighlighted(data)
  const params = getFlowNodeParams(data)
  const condition = typeof params.condition === 'string' ? params.condition : 'repeat'
  const parsedIterations = typeof params.iterations === 'number' ? params.iterations : Number(params.iterations)
  const iterations = Number.isFinite(parsedIterations) ? parsedIterations : 3
  
  return (
    <div className="node-highlight" style={{ 
      padding: '12px 16px', 
      borderRadius: 12, 
      background: highlighted ? '#fbbf24' : '#f59e0b',
      color: '#fff',
      boxShadow: highlighted ? '0 0 20px rgba(245, 158, 11, 0.6)' : '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: 140,
      transition: 'all 200ms ease'
    }}>
      <Handle className="node-target-handle" type="target" position={Position.Top} id={TARGET_HANDLE} style={{ background: '#fff', width: 12, height: 12 }} />
      <div style={{ fontWeight: 700, fontSize: 14 }}>🔁 Loop</div>
      <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>{condition || `×${iterations}`}</div>
      <Handle type="source" position={Position.Right} id={LOOP_BODY_HANDLE} style={{ background: '#fff', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Bottom} id={CONTINUATION_HANDLE} style={{ background: '#fff', width: 12, height: 12 }} />
    </div>
  )
}

export default LoopNode
