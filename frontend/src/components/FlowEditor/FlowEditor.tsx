import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
  NodeMouseHandler,
  OnConnectEnd,
  OnConnectStart,
} from 'reactflow'
import 'reactflow/dist/style.css'
import '../../styles/flow.css'

import StartNode from '../../nodes/StartNode'
import ActionNode from '../../nodes/ActionNode'
import LoopNode from '../../nodes/LoopNode'
import ConditionNode from '../../nodes/ConditionNode'
import Toolbar from '../Toolbar/Toolbar'
import { useFlowStore } from '../../store/flowStore'
import {
  createFlowNodeData,
  flowToDSL,
  getFlowNodeLoopParent,
  setFlowNodeLoopParent,
  toDSL,
  type FlowNodeData,
} from '../../utils/dslParser'
import { simulateDSLExecution } from '../../utils/executionEngine'
import { validateConnection } from '../../utils/validateConnection'

const nodeTypes = {
  start: StartNode,
  action: ActionNode,
  loop: LoopNode,
  condition: ConditionNode,
}

let idCounter = 1
const getId = (prefix: string) => `${prefix}_${idCounter++}`

type FlowEditorNode = Node<FlowNodeData>

type ConnectionPreviewState = {
  active: boolean
  sourceId?: string
  sourceHandle?: string
  targetId?: string
  valid: boolean | null
  reason?: string
}

const createEmptyConnectionPreview = (): ConnectionPreviewState => ({
  active: false,
  valid: null,
})

const initialNodes: FlowEditorNode[] = [
  {
    id: 'start_1',
    type: 'start',
    position: { x: 250, y: 100 },
    data: createFlowNodeData('start'),
  },
]

const FlowEditor: React.FC = () => {
  const storeNodes = useFlowStore((s) => s.nodes)
  const storeEdges = useFlowStore((s) => s.edges)
  const storeSetNodes = useFlowStore((s) => s.setNodes)
  const storeSetEdges = useFlowStore((s) => s.setEdges)
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode)
  const isRunning = useFlowStore((s) => s.isRunning)
  const setIsRunning = useFlowStore((s) => s.setIsRunning)
  const setStageEvent = useFlowStore((s) => s.setStageEvent)
  const setRunLog = useFlowStore((s) => s.setRunLog)
  const appendRunLog = useFlowStore((s) => s.appendRunLog)
  const highlightSingleNode = useFlowStore((s) => s.highlightSingleNode)
  const clearNodeHighlights = useFlowStore((s) => s.clearNodeHighlights)
  const resetExecutionState = useFlowStore((s) => s.resetExecutionState)

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>(
    (storeNodes.length ? storeNodes : initialNodes) as FlowEditorNode[]
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges || [])
  const rfInstanceRef = useRef<any>(null)
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null)
  const [toolbarStatus, setToolbarStatus] = useState<string | null>(null)
  const [connectionPreview, setConnectionPreview] = useState<ConnectionPreviewState>(
    createEmptyConnectionPreview()
  )
  const invalidTimer = useRef<number | null>(null)
  const toolbarTimerRef = useRef<number | null>(null)
  const activeRunIdRef = useRef(0)
  const stopRequestedRef = useRef(false)

  useEffect(() => {
    const max = nodes.reduce((m, n) => {
      const parts = n.id.split('_')
      const num = Number(parts[1]) || 0
      return Math.max(m, num)
    }, 0)
    idCounter = Math.max(idCounter, max + 1)
  }, [nodes])

  // sync store -> local
  const applyingStoreRef = useRef(false)
  useEffect(() => {
    if (Array.isArray(storeNodes) && storeNodes.length === 0 && Array.isArray(nodes) && nodes.length > 0) return
    if (storeNodes === nodes) return
    applyingStoreRef.current = true
    setNodes(storeNodes as FlowEditorNode[])
    const t = window.setTimeout(() => {
      applyingStoreRef.current = false
    }, 0)
    return () => window.clearTimeout(t)
  }, [storeNodes])

  useEffect(() => {
    if (storeEdges === edges) return
    setEdges(storeEdges || [])
  }, [storeEdges])

  // sync local -> store
  useEffect(() => {
    const currentStoreNodes = useFlowStore.getState().nodes
    if (nodes === currentStoreNodes) return
    if (applyingStoreRef.current) return
    storeSetNodes(nodes)
  }, [nodes, storeSetNodes])

  useEffect(() => {
    const currentStoreEdges = useFlowStore.getState().edges
    if (edges === currentStoreEdges) return
    storeSetEdges(edges)
  }, [edges, storeSetEdges])

  const memoNodeTypes = React.useMemo(() => nodeTypes, [])

  const computeLoopParents = useCallback((nodesList: FlowEditorNode[], edgeList: Edge[]) => {
    const adj: Record<string, string[]> = {}
    edgeList.forEach((e) => {
      if (!adj[e.source]) adj[e.source] = []
      adj[e.source].push(e.target)
    })
    const loopNodes = nodesList.filter((n) => n.type === 'loop').map((n) => n.id)
    const mapping: Record<string, string | undefined> = {}
    for (const loopId of loopNodes) {
      const visited = new Set<string>()
      const q = (adj[loopId] || []).slice()
      while (q.length) {
        const cur = q.shift()!
        if (visited.has(cur)) continue
        visited.add(cur)
        ;(adj[cur] || []).forEach((x) => q.push(x))
      }
      visited.delete(loopId)
      visited.forEach((nid) => {
        if (!mapping[nid]) mapping[nid] = loopId
        else mapping[nid] = mapping[nid]
      })
    }
    return mapping
  }, [])

  const resetConnectionPreview = useCallback(() => {
    setConnectionPreview(createEmptyConnectionPreview())
  }, [])

  const getConnectionValidation = useCallback(
    (connection: Connection) => validateConnection(connection, nodes, edges),
    [nodes, edges]
  )

  const isValidConnection = useCallback(
    (candidate: Edge | Connection) => {
      const connection: Connection = {
        source: candidate.source ?? null,
        target: candidate.target ?? null,
        sourceHandle: candidate.sourceHandle ?? null,
        targetHandle: candidate.targetHandle ?? null,
      }

      return getConnectionValidation(connection).valid
    },
    [getConnectionValidation]
  )

  const previewNodes = React.useMemo(
    () =>
      nodes.map((node) => {
        const previewClassName =
          connectionPreview.active && connectionPreview.targetId === node.id
            ? connectionPreview.valid === true
              ? 'connection-preview-valid'
              : connectionPreview.valid === false
                ? 'connection-preview-invalid'
                : ''
            : ''

        if (!previewClassName) return node

        return {
          ...node,
          className: [node.className, previewClassName].filter(Boolean).join(' '),
        }
      }),
    [connectionPreview.active, connectionPreview.targetId, connectionPreview.valid, nodes]
  )

  const previewInvalidMessage = React.useMemo(() => {
    if (!connectionPreview.active || connectionPreview.valid !== false) return null
    if (!connectionPreview.targetId || !connectionPreview.reason) return null

    return connectionPreview.reason
  }, [connectionPreview.active, connectionPreview.reason, connectionPreview.targetId, connectionPreview.valid])

  const activeInvalidFeedback = React.useMemo(() => {
    if (invalidMessage) return invalidMessage

    return previewInvalidMessage
  }, [invalidMessage, previewInvalidMessage])

  const onConnect = useCallback(
    (connection: Connection) => {
      const showInvalid = (msg: string) => {
        setInvalidMessage(msg)
        if (invalidTimer.current) window.clearTimeout(invalidTimer.current)
        invalidTimer.current = window.setTimeout(() => setInvalidMessage(null), 1400)
      }

      const result = getConnectionValidation(connection)

      if (!result.valid) {
        showInvalid(result.reason ?? 'Invalid connection')
        resetConnectionPreview()
        return
      }

      const newEdges = addEdge({ ...connection, animated: false }, edges)
      setEdges(newEdges)

      const mapping = computeLoopParents(nodes, newEdges)
      setNodes((nds) => nds.map((n) => ({ ...n, data: setFlowNodeLoopParent(n.data, mapping[n.id]) })))
      resetConnectionPreview()
    },
    [computeLoopParents, edges, getConnectionValidation, nodes, resetConnectionPreview, setEdges, setNodes]
  )

  const onConnectStart = useCallback<OnConnectStart>(
    (_, params) => {
      setInvalidMessage(null)
      if (invalidTimer.current) {
        window.clearTimeout(invalidTimer.current)
        invalidTimer.current = null
      }

      if (params.handleType !== 'source' || !params.nodeId) {
        resetConnectionPreview()
        return
      }

      setConnectionPreview({
        active: true,
        sourceId: params.nodeId,
        sourceHandle: typeof params.handleId === 'string' ? params.handleId : undefined,
        valid: null,
      })
    },
    [resetConnectionPreview]
  )

  const onConnectEnd = useCallback<OnConnectEnd>(() => {
    resetConnectionPreview()
  }, [resetConnectionPreview])

  const onNodeMouseEnter = useCallback<NodeMouseHandler>(
    (_, node) => {
      if (!connectionPreview.active || !connectionPreview.sourceId) return

      const result = getConnectionValidation({
        source: connectionPreview.sourceId,
        sourceHandle: connectionPreview.sourceHandle ?? null,
        target: node.id,
        targetHandle: null,
      })

      setConnectionPreview((current) => {
        if (!current.active || !current.sourceId) return current

        return {
          ...current,
          targetId: node.id,
          valid: result.valid,
          reason: result.reason,
        }
      })
    },
    [connectionPreview.active, connectionPreview.sourceHandle, connectionPreview.sourceId, getConnectionValidation]
  )

  const onNodeMouseLeave = useCallback<NodeMouseHandler>((_, node) => {
    setConnectionPreview((current) => {
      if (!current.active || current.targetId !== node.id) return current

      return {
        ...current,
        targetId: undefined,
        valid: null,
        reason: undefined,
      }
    })
  }, [])

  const addNewNode = (type: keyof typeof nodeTypes) => {
    const newNode: FlowEditorNode = {
      id: getId(type),
      type,
      position: { x: 250 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: createFlowNodeData(type),
    }
    setNodes((nds) => nds.concat(newNode))
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          rfInstanceRef.current?.fitView?.()
        } catch (e) {
          // swallow
        }
      })
    })
  }

  useEffect(() => {
    const mapping = computeLoopParents(nodes, edges)
    let changed = false
    const updated = nodes.map((n) => {
      const oldParent = getFlowNodeLoopParent(n.data)
      const newParent = mapping[n.id]
      if (oldParent !== newParent) {
        changed = true
        return { ...n, data: setFlowNodeLoopParent(n.data, newParent) }
      }
      return n
    })
    if (changed) {
      setNodes(updated)
    }
  }, [edges, nodes, computeLoopParents, setNodes])

  const setTransientToolbarStatus = useCallback((message: string) => {
    setToolbarStatus(message)
    if (toolbarTimerRef.current) window.clearTimeout(toolbarTimerRef.current)
    toolbarTimerRef.current = window.setTimeout(() => setToolbarStatus(null), 1800)
  }, [])

  useEffect(() => {
    return () => {
      if (toolbarTimerRef.current) window.clearTimeout(toolbarTimerRef.current)
      if (invalidTimer.current) window.clearTimeout(invalidTimer.current)
    }
  }, [])

  const handleStop = useCallback(
    (message = '执行已停止') => {
      activeRunIdRef.current += 1
      stopRequestedRef.current = true
      resetExecutionState()
      setTransientToolbarStatus(message)
      appendRunLog(`🛑 ${message}`)
    },
    [appendRunLog, resetExecutionState, setTransientToolbarStatus]
  )

  const handleRun = useCallback(async () => {
    if (!nodes.length) {
      setTransientToolbarStatus('请先创建至少一个节点')
      return
    }

    const document = flowToDSL(nodes, edges)
    if (!document.length || document.every((item) => item.children.length === 0)) {
      setTransientToolbarStatus('流程为空，请先连线或用 AI 生成积木')
      return
    }

    const runId = activeRunIdRef.current + 1
    activeRunIdRef.current = runId
    stopRequestedRef.current = false

    clearNodeHighlights()
    setRunLog([])
    setIsRunning(true)
    setStageEvent({ kind: 'start', label: '准备执行', detail: '正在初始化模拟器' })
    appendRunLog('🧠 已开始模拟执行')

    const result = await simulateDSLExecution(document, {
      stepDelayMs: 700,
      onNodeEnter: (nodeId) => {
        if (activeRunIdRef.current !== runId) return
        highlightSingleNode(nodeId)
      },
      onNodeExit: (nodeId) => {
        if (activeRunIdRef.current !== runId) return
        const currentExecutionId = useFlowStore.getState().executionNodeId
        if (currentExecutionId === nodeId) {
          clearNodeHighlights()
        }
      },
      onStageEvent: (event) => {
        if (activeRunIdRef.current !== runId) return
        setStageEvent(event)
      },
      onLog: (entry) => {
        if (activeRunIdRef.current !== runId) return
        appendRunLog(entry)
      },
      shouldStop: () => stopRequestedRef.current || activeRunIdRef.current !== runId,
    })

    if (activeRunIdRef.current !== runId) return

    if (result === 'completed') {
      clearNodeHighlights()
      setIsRunning(false)
      setStageEvent({ kind: 'finish', label: '执行完成', detail: '你可以继续编辑或导出 DSL' })
      setTransientToolbarStatus('模拟执行完成')
      return
    }

    resetExecutionState()
  }, [appendRunLog, clearNodeHighlights, edges, highlightSingleNode, nodes, resetExecutionState, setIsRunning, setRunLog, setStageEvent, setTransientToolbarStatus])

  const handleExport = useCallback(async () => {
    const dslText = toDSL(nodes, edges)

    try {
      await navigator.clipboard.writeText(dslText)
      appendRunLog('📋 DSL 已复制到剪贴板')
      setTransientToolbarStatus('DSL 已复制')
    } catch (error) {
      window.alert(dslText)
      appendRunLog('📄 DSL 已弹窗展示')
      setTransientToolbarStatus('浏览器不允许剪贴板，已弹窗展示 DSL')
    }
  }, [appendRunLog, edges, nodes, setTransientToolbarStatus])

  const handleClear = useCallback(() => {
    stopRequestedRef.current = true
    activeRunIdRef.current += 1
    setSelectedNode(null)
    setNodes(initialNodes)
    setEdges([])
    resetExecutionState()
    setRunLog([])
    setTransientToolbarStatus('画布已重置')
  }, [resetExecutionState, setEdges, setNodes, setRunLog, setSelectedNode, setTransientToolbarStatus])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ 
        padding: 12, 
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <button 
          onClick={() => addNewNode('start')}
          style={{ 
            padding: '6px 12px', 
            background: '#22c55e',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Start
        </button>
        <button 
          onClick={() => addNewNode('action')}
          style={{ 
            padding: '6px 12px', 
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Action
        </button>
        <button 
          onClick={() => addNewNode('loop')}
          style={{ 
            padding: '6px 12px', 
            background: '#f59e0b',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Loop
        </button>
        <button 
          onClick={() => addNewNode('condition')}
          style={{ 
            padding: '6px 12px', 
            background: '#a855f7',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Condition
        </button>

        <Toolbar
          isRunning={isRunning}
          statusText={toolbarStatus}
          onRun={handleRun}
          onStop={() => handleStop()}
          onExport={handleExport}
          onClear={handleClear}
        />

        <div style={{ fontSize: 13, color: '#666' }}>
          节点数: <strong>{nodes.length}</strong>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        {activeInvalidFeedback && (
          <div style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 12,
            background: 'rgba(153, 27, 27, 0.94)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid rgba(248, 113, 113, 0.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: 13,
            fontWeight: 600,
            maxWidth: 320,
          }}>
            ⚠️ {activeInvalidFeedback}
          </div>
        )}
        <ReactFlow
          nodes={previewNodes}
          edges={edges}
          onInit={(inst) => (rfInstanceRef.current = inst)}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          isValidConnection={isValidConnection}
          nodeTypes={memoNodeTypes}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onNodeClick={(e, node) => setSelectedNode(node)}
          onPaneClick={() => setSelectedNode(null)}
          fitView
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'start': return '#22c55e'
                case 'action': return '#3b82f6'
                case 'loop': return '#f59e0b'
                case 'condition': return '#a855f7'
                default: return '#999'
              }
            }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}

export default FlowEditor
