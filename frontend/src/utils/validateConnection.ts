import { Connection, Edge, Node } from 'reactflow'

import {
  CONDITION_FALSE_HANDLE,
  CONDITION_TRUE_HANDLE,
  CONTINUATION_HANDLE,
  FlowNodeData,
  getFlowNodeLoopParent,
} from './dslParser'

export type ConnectionValidationResult = {
  valid: boolean
  reason?: string
}

const invalid = (reason: string): ConnectionValidationResult => ({
  valid: false,
  reason,
})

const incomingCount = (nodeId: string, edgeList: Edge[]) =>
  edgeList.filter((edge) => edge.target === nodeId).length

const outgoingCount = (nodeId: string, edgeList: Edge[]) =>
  edgeList.filter((edge) => edge.source === nodeId).length

const isCyclicConnection = (sourceId: string, targetId: string, edgeList: Edge[]) => {
  const adjacency: Record<string, string[]> = {}

  edgeList.forEach((edge) => {
    if (!adjacency[edge.source]) adjacency[edge.source] = []
    adjacency[edge.source].push(edge.target)
  })

  if (!adjacency[sourceId]) adjacency[sourceId] = []
  adjacency[sourceId].push(targetId)

  const visited: Record<string, number> = {}

  const dfs = (nodeId: string): boolean => {
    if (visited[nodeId] === 1) return true
    if (visited[nodeId] === 2) return false

    visited[nodeId] = 1

    for (const nextNodeId of adjacency[nodeId] ?? []) {
      if (dfs(nextNodeId)) return true
    }

    visited[nodeId] = 2
    return false
  }

  return dfs(sourceId)
}

export const validateConnection = (
  connection: Connection,
  nodes: Node<FlowNodeData>[],
  edges: Edge[]
): ConnectionValidationResult => {
  if (!connection.source || !connection.target) {
    return { valid: false }
  }

  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)

  if (!sourceNode || !targetNode) {
    return { valid: false }
  }

  if (targetNode.type === 'start') {
    return invalid('Start node cannot be a target')
  }

  if (sourceNode.type === 'start') {
    if (connection.sourceHandle !== CONTINUATION_HANDLE) {
      return invalid(`Start nodes must connect using the ${CONTINUATION_HANDLE} handle`)
    }

    if (outgoingCount(sourceNode.id, edges) >= 1) {
      return invalid('Start node can have only one exit')
    }
  }

  if (sourceNode.type === 'action') {
    if (connection.sourceHandle !== CONTINUATION_HANDLE) {
      return invalid(`Action nodes must connect using the ${CONTINUATION_HANDLE} handle`)
    }

    if (outgoingCount(sourceNode.id, edges) >= 1) {
      return invalid('Action node can have only one outgoing connection')
    }
  }

  if (targetNode.type === 'action' && incomingCount(targetNode.id, edges) >= 1) {
    return invalid('Action node can have only one incoming connection')
  }

  if (sourceNode.type === 'condition') {
    const handle = connection.sourceHandle

    if (
      !handle ||
      (handle !== CONDITION_TRUE_HANDLE &&
        handle !== CONDITION_FALSE_HANDLE &&
        handle !== CONTINUATION_HANDLE)
    ) {
      return invalid(
        `Condition nodes must connect using the ${CONDITION_TRUE_HANDLE} / ${CONDITION_FALSE_HANDLE} / ${CONTINUATION_HANDLE} handles`
      )
    }

    const alreadyConnected = edges.some(
      (edge) => edge.source === sourceNode.id && (edge.sourceHandle ?? CONTINUATION_HANDLE) === handle
    )

    if (alreadyConnected) {
      if (handle === CONTINUATION_HANDLE) {
        return invalid('Condition continuation already connected')
      }

      return invalid(`Condition ${handle} branch already connected`)
    }
  }

  if (sourceNode.type === 'loop') {
    if (connection.sourceHandle !== CONTINUATION_HANDLE) {
      return invalid(`Loop nodes must connect using the ${CONTINUATION_HANDLE} handle`)
    }

    if (incomingCount(connection.target, edges) > 0) {
      return invalid('Loop children must be internal and cannot have existing incoming edges')
    }
  }

  const targetLoopParent = getFlowNodeLoopParent(targetNode.data)
  const sourceLoopParent = getFlowNodeLoopParent(sourceNode.data)

  if (targetLoopParent && targetLoopParent !== sourceLoopParent) {
    return invalid('Cannot connect across different loop scopes')
  }

  if (isCyclicConnection(connection.source, connection.target, edges)) {
    return invalid('Connection would create a cycle — not allowed')
  }

  return { valid: true }
}