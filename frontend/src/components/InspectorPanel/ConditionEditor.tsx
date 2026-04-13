import React, { useEffect, useState } from 'react'
import { useFlowStore } from '../../store/flowStore'
import { getFlowNodeParams } from '../../utils/dslParser'

const ConditionEditor: React.FC = () => {
  const selected = useFlowStore((s) => s.selectedNode)
  const updateNodeParams = useFlowStore((s) => s.updateNodeParams)

  const [cond, setCond] = useState('')

  useEffect(() => {
    if (!selected) return
    const params = getFlowNodeParams(selected.data)
    setCond(typeof params.condition === 'string' ? params.condition : '')
  }, [selected])

  const onCondChange = (val: string) => {
    setCond(val)
    if (!selected) return
    // sanitize: remove if(...) wrapper
    let sanitized = val.trim()
    if (sanitized.startsWith('if(') && sanitized.endsWith(')')) {
      sanitized = sanitized.slice(3, -1)
    }
    updateNodeParams(selected.id, { condition: sanitized })
  }


  if (!selected) return null

  return (
    <div style={{ padding: 8, background: '#fff', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
      <h4 style={{ margin: 0, marginBottom: 8 }}>Condition</h4>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#333' }}>条件表达式</label>
        <input value={cond} onChange={(e) => onCondChange(e.target.value)} placeholder="e.g. health > 50" style={{ marginTop: 6, padding: 6, width: '100%' }} />
        <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>只填写布尔表达式，例如 <em>gold &lt; 1000</em>，不要包含 <em>if(…)</em></div>
      </div>
    </div>
  )
}

export default ConditionEditor
