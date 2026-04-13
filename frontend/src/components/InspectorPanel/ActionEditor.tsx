import React, { useEffect, useState } from 'react'
import { useFlowStore } from '../../store/flowStore'
import { getFlowNodeParams } from '../../utils/dslParser'

const ActionEditor: React.FC = () => {
  const selected = useFlowStore((s) => s.selectedNode)
  const updateNodeParams = useFlowStore((s) => s.updateNodeParams)

  const [actionType, setActionType] = useState('tap')
  const [target, setTarget] = useState('')

  useEffect(() => {
    if (!selected) return
    const params = getFlowNodeParams(selected.data)
    setActionType(typeof params.action === 'string' ? params.action : 'tap')
    setTarget(typeof params.target === 'string' ? params.target : '')
  }, [selected])

  const onActionTypeChange = (val: string) => {
    setActionType(val)
    if (!selected) return
    updateNodeParams(selected.id, { action: val })
  }

  const onTargetChange = (val: string) => {
    setTarget(val)
    if (!selected) return
    updateNodeParams(selected.id, { target: val })
  }

  if (!selected) return null

  return (
    <div style={{ padding: 8, background: '#fff', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
      <h4 style={{ margin: 0, marginBottom: 8 }}>Action</h4>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#333' }}>动作类型</label>
        <select value={actionType} onChange={(e) => onActionTypeChange(e.target.value)} style={{ marginTop: 6, padding: 6, width: '100%' }}>
          <option value="tap">tap</option>
          <option value="swipe">swipe</option>
          <option value="wait">wait</option>
        </select>
      </div>
      <div style={{ marginBottom: 6 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#333' }}>目标</label>
        <input value={target} onChange={(e) => onTargetChange(e.target.value)} placeholder="e.g. plus_button" style={{ marginTop: 6, padding: 6, width: '100%' }} />
        <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>目标可以是语义名称或选择器，例如 <em>plus_button</em> 或 <em>btn_add</em></div>
      </div>
    </div>
  )
}

export default ActionEditor
