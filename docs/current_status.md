# Current Status

## 1. 目前工作目標

目前 frontend 正在進行「流程編輯器資料模型收斂」重構，核心方向是：

- React Flow 節點的業務資料統一放到 `node.data.params`
- `node.data` 本身只保留偏 UI / 編輯器狀態欄位，例如：`label`、`highlighted`、`loopParent`
- Inspector、節點 renderer、ChatPanel、DSL parser、FlowEditor、executionEngine 的資料流都要對齊這個模型

這份文件是之後每個小功能完成後的 checkpoint。**新開對話時，請先讀這份文件，再繼續下一個原子任務。**

---

## 2. 本輪已完成的架構收斂

### 2.1 統一的節點資料模型

檔案：`frontend/src/utils/dslParser.ts`

已建立並導出下列型別 / helper：

- `FlowNodeType`
- `FlowNodeParams`
- `FlowNodeData`
- `getFlowNodeParams()`
- `createFlowNodeData()`

目前約定：

- `node.data.label`：節點顯示名稱
- `node.data.highlighted`：執行高亮狀態
- `node.data.loopParent`：loop scope 關聯
- `node.data.params`：節點業務參數（action / target / condition / iterations 等）

### 2.2 DSL → Flow 的轉換已統一映射到 `data.params`

檔案：`frontend/src/utils/dslParser.ts`

新增 `dslExecutableToParams()`，讓 `dslToFlow()` 在建立 React Flow node 時，統一把 DSL 欄位映射進 `data.params`。

目前行為：

- action 節點：寫入 `params.action`、`params.target`
- condition 節點：寫入 `params.condition`
- loop 節點：寫入 `params.condition`、`params.iterations`

### 2.3 Flow → DSL 的輸出改為從 `node.data.params` 讀值

檔案：`frontend/src/utils/dslParser.ts`

`flowToDSL()` 已改為從 `node.data.params` 組 DSL，輸出的 DSL 比之前更乾淨，不再重複把 `params` 內的資料再塞回 DSL node。

### 2.4 Store 已統一負責節點資料同步

檔案：`frontend/src/store/flowStore.ts`

已新增：

- `mergeNodeData()`
- `mergeNodeParams()`
- `updateNodeParams(id, params)`

目前規則：

- Inspector 不再自己手動同步 `selectedNode`
- 所有節點更新後，都由 store 透過 `syncSelectedNode()` 回填目前選中節點
- 若是業務欄位更新，優先走 `updateNodeParams()`

### 2.5 Inspector 三個 editor 都已切到統一參數接口

檔案：

- `frontend/src/components/InspectorPanel/ActionEditor.tsx`
- `frontend/src/components/InspectorPanel/ConditionEditor.tsx`
- `frontend/src/components/InspectorPanel/LoopEditor.tsx`

目前規則：

- `ActionEditor` / `ConditionEditor` / `LoopEditor` 的讀值都使用 `getFlowNodeParams(selected.data)`
- Inspector editor 的寫值統一使用 `updateNodeParams(selected.id, patch)`
- 對 `unknown` 值做明確 narrowing，避免 strict TS 報錯

### 2.6 Node renderer 已補齊型別 narrowing

檔案：

- `frontend/src/nodes/ActionNode.tsx`
- `frontend/src/nodes/ConditionNode.tsx`
- `frontend/src/nodes/LoopNode.tsx`

目前 renderer 不會直接把 `unknown` 值渲染到 React tree，而是先做：

- `typeof value === 'string'`
- `Number(value)`
- `Number.isFinite(...)`

### 2.7 FlowEditor 建立新節點時已走統一工廠

檔案：`frontend/src/components/FlowEditor/FlowEditor.tsx`

目前初始節點與新增節點都使用 `createFlowNodeData(type)`，避免新節點出現不一致的 `data` 結構。

### 2.8 ChatPanel 的 DSL builder 已整理

檔案：`frontend/src/components/ChatPanel/ChatPanel.tsx`

已新增 helper：

- `wrapStart`
- `createActionNode`
- `createLoopNode`
- `createConditionNode`
- `extractSegment`
- `describeGeneratedDsl`

目前自然語言規則已簡化為較乾淨的 DSL 建構方式，不再在多處重複手寫 `params` 結構。

### 2.9 executionEngine 已兼容新的 loop 欄位位置

檔案：`frontend/src/utils/executionEngine.ts`

`getLoopIterations()` 目前會優先讀：

1. `node.iterations`
2. `node.params?.iterations`（相容舊資料）

### 2.10 Vite 型別宣告已補齊

檔案：`frontend/src/vite-env.d.ts`

已加入：

```ts
/// <reference types="vite/client" />
```

用來解掉 CSS side-effect import 相關型別問題。

### 2.11 Checkpoint 文件流程已落地

本輪已正式建立 checkpoint 機制，並處理了文件路徑衝突：

- 原本專案根目錄的 `docs` 其實是單一檔案
- 已依照決策將它改名為 `docs_legacy.md`
- 已建立真正的 `docs/` 資料夾
- 已新增 `docs/current_status.md` 作為後續 checkpoint 文件

### 2.12 frontend 已固化 typecheck 指令

檔案：`frontend/package.json`

已新增：

- `typecheck`: `tsc --noEmit`

目前規則：

- 後續每個原子任務完成後，都可以固定使用 `npm run typecheck` 做 frontend 型別檢查
- 型別驗證入口從原本手動執行 `tsc --noEmit`，收斂為 package script，方便 checkpoint 流程一致化

### 2.13 FlowEditor 的 loop scope 存取已收斂到 helper

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/components/FlowEditor/FlowEditor.tsx`

本輪先針對 `FlowEditor` / `Stage` / `Toolbar` 做最小盤點，結果如下：

- `Stage` / `Toolbar` 沒有直接讀寫 `node.data` 的業務欄位
- `FlowEditor` 也沒有直接讀寫 `action` / `target` / `condition` / `iterations`
- `FlowEditor` 剩餘的直接存取點是 `loopParent`，而它屬於 UI / loop scope 狀態，不是業務參數

已新增 helper：

- `getFlowNodeLoopParent()`
- `setFlowNodeLoopParent()`

目前規則：

- `FlowEditor` 判斷 loop scope 時，不再直接使用 `(node.data as any)?.loopParent`
- `FlowEditor` 回寫 loop scope 時，也改成透過 helper 產生一致的 `FlowNodeData`
- 這一輪盤點已確認 `FlowEditor` / `Stage` / `Toolbar` 周邊沒有殘留直接讀寫 `node.data` 業務欄位的使用點

### 2.14 StartNode 的 highlighted 存取已收斂到 typed helper

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/nodes/StartNode.tsx`

本輪先從 node renderer 中最小的 `as any` 使用點開始處理，結果如下：

- `dslParser.ts` 新增 `getFlowNodeHighlighted()`
- `StartNode` 改成使用 `NodeProps<FlowNodeData>`
- `StartNode` 不再直接使用 `(data as any)?.highlighted`
- `highlighted` 改由 typed helper 統一讀取

目前規則：

- 如果 renderer 只是要讀取 `node.data` 上的 UI 狀態欄位，優先透過 typed helper 存取
- `StartNode` 已成為後續清理 `ActionNode` / `ConditionNode` / `LoopNode` 類似存取點的最小範例

### 2.15 ActionNode 的 highlighted / params 存取已改成 typed data 存取

檔案：

- `frontend/src/nodes/ActionNode.tsx`

本輪延續 `StartNode` 的做法，先處理 node renderer 中另一個最小的 `as any` 使用點，結果如下：

- `ActionNode` 改成使用 `NodeProps<FlowNodeData>`
- `highlighted` 改成透過 `getFlowNodeHighlighted()` 讀取
- `params` 改成直接透過 `getFlowNodeParams(data)` 讀取
- 已移除 `ActionNode` 內 `(data as any)?.highlighted` 與 `getFlowNodeParams(data as any)`

目前規則：

- node renderer 若已切到 `NodeProps<FlowNodeData>`，就不再需要用 `as any` 讀取 `highlighted` / `params`
- `ActionNode` 現在與 `StartNode` 一樣，成為後續收斂 `ConditionNode` / `LoopNode` 的對齊範例

### 2.16 ConditionNode 的 highlighted / params 存取已改成 typed data 存取

檔案：

- `frontend/src/nodes/ConditionNode.tsx`

本輪延續前兩個 renderer 的收斂方式，繼續處理另一個最小的 `as any` 使用點，結果如下：

- `ConditionNode` 改成使用 `NodeProps<FlowNodeData>`
- `highlighted` 改成透過 `getFlowNodeHighlighted()` 讀取
- `params` 改成直接透過 `getFlowNodeParams(data)` 讀取
- 已移除 `ConditionNode` 內 `(data as any)?.highlighted` 與 `getFlowNodeParams(data as any)`

目前規則：

- `ConditionNode` 現在與 `StartNode`、`ActionNode` 使用相同的 typed renderer 讀值模式
- 後續若要清理其餘 renderer，可直接延用 `NodeProps<FlowNodeData>` + typed helper / typed data 存取的模板

### 2.17 LoopNode 的 highlighted / params 存取已改成 typed data 存取

檔案：

- `frontend/src/nodes/LoopNode.tsx`

本輪延續前三個 renderer 的收斂方式，完成最後一個 node renderer 內最小的 `as any` 使用點清理，結果如下：

- `LoopNode` 改成使用 `NodeProps<FlowNodeData>`
- `highlighted` 改成透過 `getFlowNodeHighlighted()` 讀取
- `params` 改成直接透過 `getFlowNodeParams(data)` 讀取
- 已移除 `LoopNode` 內 `(data as any)?.highlighted` 與 `getFlowNodeParams(data as any)`

目前規則：

- 四個 node renderer (`StartNode` / `ActionNode` / `ConditionNode` / `LoopNode`) 現在都已對齊到相同的 typed data 存取模式
- 後續清理剩餘 `as any` 時，可把重點轉移到 InspectorPanel 與 `flowStore`

### 2.18 ActionEditor 的 params 讀值已改成 typed data 存取

檔案：

- `frontend/src/components/InspectorPanel/ActionEditor.tsx`

本輪開始把 InspectorPanel 內剩餘最小的 `selected.data as any` 使用點逐一收斂，先處理 `ActionEditor`，結果如下：

- `ActionEditor` 的 `useEffect` 讀值改成直接使用 `getFlowNodeParams(selected.data)`
- 已移除 `ActionEditor` 內 `getFlowNodeParams(selected.data as any)`
- 本輪完成後重新執行 `npm run typecheck`，確認型別檢查仍然通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，剩餘使用點為 `ConditionEditor`、`LoopEditor` 與 `flowStore`

目前規則：

- InspectorPanel 若只是從 `selected.data` 讀取節點業務參數，優先直接傳入 `getFlowNodeParams(selected.data)`
- InspectorPanel 的 `selected.data as any` 清理可依 editor 分開做，維持每輪只處理一個最小原子任務

### 2.19 ConditionEditor 的 params 讀值已改成 typed data 存取

檔案：

- `frontend/src/components/InspectorPanel/ConditionEditor.tsx`

本輪延續 `ActionEditor` 的做法，繼續處理 InspectorPanel 中另一個最小的 `selected.data as any` 使用點，結果如下：

- `ConditionEditor` 的 `useEffect` 讀值改成直接使用 `getFlowNodeParams(selected.data)`
- 已移除 `ConditionEditor` 內 `getFlowNodeParams(selected.data as any)`
- 本輪完成後重新執行 `npm run typecheck`，確認型別檢查仍然通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，剩餘使用點為 `LoopEditor` 與 `flowStore`

目前規則：

- InspectorPanel 若只是從 `selected.data` 讀取節點業務參數，優先直接傳入 `getFlowNodeParams(selected.data)`
- InspectorPanel 目前只剩 `LoopEditor` 還有最後一個同型態的 `selected.data as any` 使用點

### 2.20 LoopEditor 的 params 讀值已改成 typed data 存取

檔案：

- `frontend/src/components/InspectorPanel/LoopEditor.tsx`

本輪延續 `ActionEditor` / `ConditionEditor` 的做法，完成 InspectorPanel 內最後一個 `selected.data as any` 使用點清理，結果如下：

- `LoopEditor` 的 `useEffect` 讀值改成直接使用 `getFlowNodeParams(selected.data)`
- 已移除 `LoopEditor` 內 `getFlowNodeParams(selected.data as any)`
- 本輪完成後重新執行 `npm run typecheck`，確認型別檢查仍然通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，剩餘使用點只剩 `flowStore`

目前規則：

- InspectorPanel 三個 editor 現在都已完成 `selected.data as any` → typed data 存取收斂
- 後續剩餘的 `as any` 清理重點可集中到 `flowStore` 內的資料合併邏輯

### 2.21 flowStore 的 highlighted UI state 合併已收斂到 typed helper

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/store/flowStore.ts`

本輪開始處理 `flowStore` 內剩餘較小的 `as any` 使用點，先收斂 execution highlight 的 UI state 合併邏輯，結果如下：

- `dslParser.ts` 新增 `setFlowNodeHighlighted()` helper
- `flowStore` 的 `setHighlightedNode()` 改成透過 `setFlowNodeHighlighted(node.data, highlighted)` 回寫資料
- 已移除 `setHighlightedNode()` 內 `(node.data as any)` 的直接展開
- 本輪完成後重新執行 `npm run typecheck`，確認型別檢查仍然通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，剩餘使用點只剩 `flowStore.ts` 的 `mergeNodeParams()`

目前規則：

- 若只是更新 `node.data` 上的 UI 狀態欄位，優先透過 typed helper 產生一致的 `FlowNodeData`
- `flowStore` 目前只剩 `mergeNodeParams()` 內最後一個 `params` 合併的 `as any` 待清理

### 2.22 flowStore 的 params 合併已改成 typed helper 存取

檔案：

- `frontend/src/store/flowStore.ts`

本輪延續 `flowStore` 的收斂方式，處理 `mergeNodeParams()` 內最後一個 `params` 合併 `as any`，結果如下：

- `flowStore` 改成透過 `getFlowNodeParams(node.data)` 讀取既有 `params`
- 已移除 `mergeNodeParams()` 內最後一個 `(node.data as any)?.params`
- 本輪完成後重新執行 `npm run typecheck`，確認型別檢查仍然通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，結果為 0 筆

目前規則：

- 若只是合併節點業務參數，優先透過 `getFlowNodeParams()` 讀取既有 `params`
- `mergeNodeParams()` 不再直接以 `any` 方式從 `node.data` 讀取 `params`
- 目前 `frontend/src/**/*.ts*` 已無 `as any` 使用點

### 2.23 FlowEditor 的拖曳連線預覽已加入即時合法 / 不合法高亮

檔案：

- `frontend/src/components/FlowEditor/FlowEditor.tsx`
- `frontend/src/utils/validateConnection.ts`
- `frontend/src/nodes/StartNode.tsx`
- `frontend/src/nodes/ActionNode.tsx`
- `frontend/src/nodes/ConditionNode.tsx`
- `frontend/src/nodes/LoopNode.tsx`
- `frontend/src/styles/flow.css`

本輪以一個最小 atomic task 實作 React Flow 拖曳連線時的即時驗證回饋，結果如下：

- 已把 `FlowEditor` 既有連線規則抽成 `validateConnection()` 共用 validator
- `onConnect`、`isValidConnection` 與拖曳中的 preview 都改成共用同一套驗證結果，避免預覽與實際建立 edge 規則不一致
- `FlowEditor` 新增 local `connectionPreview` state，只保存暫時的 UI preview 狀態，不寫回 `node.data`、不改 store 資料模型
- 拖曳 source handle 時，hover 到合法 target node / handle 會套用 `connection-preview-valid` 綠色高亮
- hover 到不合法 target node / handle 會套用 `connection-preview-invalid` 紅色高亮
- 放開拖曳、取消拖曳、連線失敗或移出 target node 時，preview highlight 會清除
- node renderer 只補上最小的 className（`node-highlight` / `node-target-handle`），未改 DSL / execution logic，也維持業務資料仍集中於 `node.data.params` 的約定

目前規則：

- business data 仍放在 `node.data.params`
- connection preview / hover feedback 屬於暫時 UI state，維持在 `FlowEditor` local state，不污染 store
- 連線規則若後續需要調整，優先修改 `validateConnection()`，避免 `onConnect`、`isValidConnection` 與 preview 分別維護不同版本

### 2.24 FlowEditor 的 invalid connection preview 已補上即時 reason 文案

檔案：

- `frontend/src/components/FlowEditor/FlowEditor.tsx`

本輪延續上一個 connection preview atomic task，只補一個最小 UX 細節，結果如下：

- 拖曳連線中若 hover 到不合法 target，除了紅色高亮外，右上角也會即時顯示簡短 invalid reason 文案
- preview reason 直接重用 `validateConnection()` 回傳的 `reason`，避免拖曳中的提示與實際落下時的錯誤訊息不一致
- 這段文案只在 `connectionPreview.active && valid === false` 時顯示，拖曳結束、移出 target 或取消拖曳時會一起清除
- 實作仍維持 local UI state，沒有新增 store 欄位，也沒有改 DSL / execution logic / business data model

目前規則：

- preview 的說明文案屬於暫時 UI feedback，應跟隨 `connectionPreview` 一起建立與清除
- invalid preview message 與落下後的 invalid toast 優先共用同一個 validator reason，避免兩套文案來源分叉

### 2.25 FlowEditor 的 invalid feedback overlay 已統一 preview / submit 顯示規則

檔案：

- `frontend/src/components/FlowEditor/FlowEditor.tsx`

本輪延續上一個 UX 一致性檢查，只做最小顯示收斂，結果如下：

- `FlowEditor` 新增單一的 `activeInvalidFeedback` 計算值，統一決定目前畫面上要顯示的 invalid feedback 文案
- 拖曳中的 invalid preview reason 與 `onConnect` 失敗後的 invalid message，現在共用同一個右上角 overlay 呈現，不再分成兩種位置 / 色階 / icon 樣式
- 若拖曳失敗後同時存在 submit invalid message，會優先顯示 submit 後的訊息；preview state 清掉後 UI 不會出現雙層錯誤框疊加
- 實作仍維持 local UI state，沒有新增 store 欄位，也沒有改 DSL / execution logic / business data model

目前規則：

- invalid feedback UI 應優先由單一計算後的訊息來源驅動，避免 preview 與 submit 後提示各自維護不同樣式
- submit 後的 invalid message 優先級高於拖曳中的 preview reason，避免同時顯示兩個錯誤提示

### 2.26 Condition node 的 continuation handle 語義已明確化

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/utils/validateConnection.ts`
- `frontend/src/nodes/ConditionNode.tsx`

本輪依照「先做語義 contract 清楚化，再做最小 UI 配合」的節奏，先補齊 condition 節點 continuation edge 的明確 handle 約定，結果如下：

- `ConditionNode` 新增底部 `out` source handle，condition 節點不再只有 `true` / `false` 兩個分支出口
- `dslParser.ts` 新增 `createContinuationEdge()`，讓 DSL → Flow 建立的順序 / continuation 邊統一寫入 `sourceHandle: 'out'`
- `validateConnection()` 對 condition 節點改為接受 `true` / `false` / `out` 三種 source handle
- condition 的 `out` continuation 與 `true` / `false` 分支一樣，現在都會檢查「同一個 source handle 只能連一次」
- `flowToDSL()` 仍保留 `!edge.sourceHandle || edge.sourceHandle === 'out'` 視為 continuation 的相容讀法，避免舊資料立即失效

目前規則：

- continuation edge 的語義 contract 收斂為顯式 `sourceHandle: 'out'`
- condition 節點現在有三種合法輸出：`true`、`false`、`out`
- validator / renderer / DSL conversion 對 condition continuation handle 已對齊，但 Flow → DSL 仍保留對舊的 `undefined` handle 邊的相容讀取
- 本輪 UI 手動驗證路徑應為：建立 `Condition -> Action`，分別從 `true` / `false` / `out` 拖曳，確認 `out` 可作為 continuation，且同一個 handle 不能重複連線

### 2.27 Start / Action / Loop node 的 continuation handle contract 已在 validator 顯式化

檔案：

- `frontend/src/utils/validateConnection.ts`

本輪延續上一個「先補語義 contract，再做最小配套」的節奏，只收斂 `start` / `action` / `loop` 這三種單一路徑節點的 continuation source handle 規則，結果如下：

- `validateConnection()` 現在會要求 `start` / `action` / `loop` 節點只能透過 `sourceHandle: 'out'` 建立連線
- 原本的單一出口限制仍保留：`start` / `action` 仍只能有一條 outgoing connection
- `loop` 節點原本的 child target 限制仍保留：target 若已有 incoming edge 仍會被擋下
- 目前內建節點的 source handle contract 已更完整閉合：`start` / `action` / `loop` 使用 `out`，`condition` 使用 `true` / `false` / `out`
- 本輪沒有改 store、execution logic、`node.data.params`、FlowEditor 架構，也沒有調整 DSL 格式

目前規則：

- 對於單一路徑 continuation 節點，validator 不應只靠 outgoing count 判斷，還要顯式檢查 `sourceHandle === 'out'`
- `start` / `action` / `loop` 的 continuation edge contract 現在由 renderer handle、DSL 建邊與 validator 三方共同約束
- `condition` 維持三出口語義，未與單一路徑節點共用模糊的 fallback 規則
- 本輪 UI 手動驗證路徑應為：在 FlowEditor 內分別建立 `Start -> Action`、`Action -> Loop`、`Loop -> Action`，確認從底部 `out` handle 拖曳可成功連線，且既有單一出口 / loop child 限制仍照常生效

### 2.28 Flow → DSL 的 continuation edge 判定已收斂到單一 helper

檔案：

- `frontend/src/utils/dslParser.ts`

本輪延續 continuation handle contract 的語義收斂，只處理 `flowToDSL()` 內 continuation edge 的判定入口，結果如下：

- `dslParser.ts` 新增 `isContinuationEdge()` helper，集中判定 edge 是否屬於 continuation
- `flowToDSL()` 內原本分散的 `!edge.sourceHandle || edge.sourceHandle === 'out'` 判定，現在改成統一使用 `isContinuationEdge()`
- `buildSequence()` 與 start node 的 first child 解析，現在共用同一個 continuation 判定來源，避免同義條件在多處分叉
- helper 仍保留對舊資料 `undefined sourceHandle` 的相容讀法，沒有改動 DSL 格式、store 架構、execution logic 或 `node.data.params` 約定
- 本輪沒有 UI 行為改動，因此不需要新增手動驗證路徑

目前規則：

- Flow → DSL 若要判定 continuation edge，優先透過 `isContinuationEdge()`，不要在多處重寫 `!edge.sourceHandle || edge.sourceHandle === 'out'`
- validator 端維持顯式 `sourceHandle: 'out'` 的新資料契約；Flow → DSL 端則透過 helper 集中保留舊 `undefined` handle 的相容讀取
- continuation edge 的相容規則現在已從 scattered inline condition 收斂為單一 helper，後續若要收緊或調整相容策略，只需改一個入口

### 2.29 source handle 命名來源已收斂到共用常數

檔案：

- `frontend/src/utils/dslParser.ts`
- `frontend/src/utils/validateConnection.ts`
- `frontend/src/nodes/ConditionNode.tsx`

本輪延續 continuation / branch handle contract 的收斂方式，只做最小命名來源一致化，結果如下：

- `dslParser.ts` 已導出 `CONTINUATION_HANDLE`、`CONDITION_TRUE_HANDLE`、`CONDITION_FALSE_HANDLE`
- `dslParser.ts` 內 continuation edge 建立、condition branch edge 建立，以及 `flowToDSL()` 的 handle 判定都改為共用上述常數
- `validateConnection.ts` 內 `start` / `action` / `loop` / `condition` 的 handle 驗證與 condition continuation fallback，都改為使用共用常數
- `ConditionNode` 的 `true` / `false` / `out` source handle `id` 已改為共用常數，讓 renderer / validator / DSL helper 的命名來源一致
- 本輪完成後重新執行 `npm run typecheck`、`npm run build`，確認皆通過
- 重新盤點 `frontend/src/**/*.ts*` 的 `as any` 後，結果仍為 0 筆

目前規則：

- 若程式碼需要引用 continuation / branch handle，優先從 `dslParser.ts` 導入共用常數，不要再直接散落寫 `'out'` / `'true'` / `'false'`
- source handle contract 現在除了規則一致外，命名來源也已一致；後續若要調整 handle 命名，應優先從共用常數出發

---

## 3. 目前已確認解掉的問題

### 已解決

- 節點業務資料來源分散
- Inspector / `selectedNode` / `nodes[]` 更新邏輯重複
- `unknown` / `Record<string, unknown>` 導致的 strict TS narrowing 問題
- `flowStore.ts` 內最後一個 `params` 合併 `as any` 殘留點
- Vite/CSS 型別宣告缺失
- FlowEditor 拖曳連線時缺少合法 / 不合法 target 的即時視覺回饋
- FlowEditor 拖曳到不合法 target 時，缺少同步的即時原因提示
- FlowEditor 拖曳中的 invalid preview 與落下後的 invalid 提示樣式 / 位置不一致
- Condition 節點 continuation edge 原本缺少顯式 source handle 契約，導致 renderer / validator / DSL conversion 的語義不夠清楚
- Start / Action / Loop 節點 continuation edge 原本只在 renderer / DSL 邊隱含使用 `out` handle，但 validator 尚未把這個 source handle contract 顯式化
- Flow → DSL 內 continuation edge 的相容判定原本分散在多處 inline condition，後續調整時容易出現規則分叉
- source handle 的命名來源原本仍散落硬編碼 `'out'` / `'true'` / `'false'`，後續若調整契約名稱容易漏改

### 已驗證

- `npm run build` 成功
- `npm run typecheck` 成功
- `tsc --noEmit` 成功（以 `frontend/node_modules/.bin/tsc.cmd --noEmit` 驗證）
- `FlowEditor` loop scope helper 收斂後，`npm run typecheck` 再次成功
- `StartNode` highlighted helper 收斂後，`npm run typecheck` 再次成功
- `ActionNode` typed data 存取收斂後，`npm run typecheck` 再次成功
- `ConditionNode` typed data 存取收斂後，`npm run typecheck` 再次成功
- `LoopNode` typed data 存取收斂後，`npm run typecheck` 再次成功
- `ActionEditor` typed data 存取收斂後，`npm run typecheck` 再次成功
- `ConditionEditor` typed data 存取收斂後，`npm run typecheck` 再次成功
- `LoopEditor` typed data 存取收斂後，`npm run typecheck` 再次成功
- `flowStore` highlighted helper 收斂後，`npm run typecheck` 再次成功
- `flowStore` `mergeNodeParams()` helper 收斂後，`npm run typecheck` 再次成功
- 重新盤點 `frontend/src/**/*.ts*` 後，`as any` 搜尋結果為 0 筆
- FlowEditor connection preview 驗證回饋接入共用 validator 後，`npm run typecheck` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- FlowEditor invalid preview reason 文案補強後，`npm run typecheck` 再次成功
- FlowEditor invalid feedback overlay 收斂後，`npm run typecheck` 再次成功
- Condition continuation handle contract 收斂後，`npm run typecheck` 再次成功
- Condition continuation handle contract 收斂後，`npm run build` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- Start / Action / Loop continuation handle contract 收斂後，`npm run typecheck` 再次成功
- Start / Action / Loop continuation handle contract 收斂後，`npm run build` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- Flow → DSL continuation helper 收斂後，`npm run typecheck` 再次成功
- Flow → DSL continuation helper 收斂後，`npm run build` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- source handle 共用常數收斂後，`npm run typecheck` 再次成功
- source handle 共用常數收斂後，`npm run build` 再次成功
- 本輪完成後再次搜尋 `frontend/src/**/*.ts*`，`as any` 仍為 0 筆
- Vite production build 可產出 `dist/` 結果
- 開發伺服器可啟動（原本 5173 被占用，實際跑在 5174）

---

## 4. 目前重要檔案

- `frontend/src/utils/dslParser.ts`
- `frontend/src/utils/validateConnection.ts`
- `frontend/src/store/flowStore.ts`
- `frontend/src/components/FlowEditor/FlowEditor.tsx`
- `frontend/src/components/ChatPanel/ChatPanel.tsx`
- `frontend/src/utils/executionEngine.ts`
- `frontend/src/components/InspectorPanel/ActionEditor.tsx`
- `frontend/src/components/InspectorPanel/ConditionEditor.tsx`
- `frontend/src/components/InspectorPanel/LoopEditor.tsx`
- `frontend/src/nodes/ActionNode.tsx`
- `frontend/src/nodes/ConditionNode.tsx`
- `frontend/src/nodes/LoopNode.tsx`
- `frontend/src/nodes/StartNode.tsx`
- `frontend/src/styles/flow.css`
- `frontend/src/vite-env.d.ts`

---

## 5. 後續工作方式（固定遵守）

### 階段式 / 原子化工作法

之後請不要一次塞很多功能，改成以下節奏：

1. 先選一個小功能 / 小修正
2. 只做那一個原子任務
3. 完成後更新本文件
4. 再決定下一個小步驟

### Checkpoint 更新規則

每完成一個小功能後，請至少更新：

- 本輪做了什麼
- 改到哪些檔案
- 架構上新增了什麼規則 / 約定
- 驗證方式與結果
- 下一個建議原子任務

### 新對話規則

未來如果重開新對話，請先讀：

- `docs/current_status.md`

再開始後續分析與實作，避免上下文遺失。

---

## 6. 下一個建議原子任務

最合理的下一步是：

1. 把 `frontend/src/nodes/StartNode.tsx`、`ActionNode.tsx`、`LoopNode.tsx` 內的 `id="out"` 改成共用 `CONTINUATION_HANDLE`
2. 順手盤點是否還有 UI renderer / editor 端殘留硬編碼 handle 名稱，維持這一輪只做命名來源收斂、不改行為
3. 完成後執行 `npm run typecheck`、`npm run build`，並確認 `frontend/src/**/*.ts*` 仍維持無 `as any`
4. 更新 checkpoint，記錄 continuation handle 的共用常數已從 DSL / validator / condition renderer 擴展到其餘單一路徑 renderer

---

## 7. 本次 checkpoint 摘要

目前 frontend 的流程編輯器資料模型已大致完成第一輪收斂：**業務資料集中到 `node.data.params`，UI 狀態保留在 `node.data` 本體**。Inspector、FlowEditor、ChatPanel、DSL parser、executionEngine 已完成第一輪對齊，且 build、`tsc --noEmit`、`npm run typecheck` 都已成功；最新三輪先把 `start` / `action` / `loop` 的 continuation edge 顯式 `out` handle 契約補進 validator，再把 `flowToDSL()` 內 continuation edge 的相容判定收斂到單一 `isContinuationEdge()` helper，最後進一步導出 `CONTINUATION_HANDLE` / `CONDITION_TRUE_HANDLE` / `CONDITION_FALSE_HANDLE` 共用常數，讓 source handle contract 不只規則一致，連命名來源也更集中。

此外，`FlowEditor` / `Stage` / `Toolbar` 周邊的盤點也已完成：目前沒有直接讀寫 `node.data` 業務欄位的殘留點。四個 node renderer、InspectorPanel 三個 editor，以及 `flowStore.ts` 內最後一個 `params` 合併 `as any` 都已清理完成；目前 `frontend/src/**/*.ts*` 已沒有 `as any` 使用點。最新幾輪也已補上 FlowEditor 的拖曳連線即時驗證回饋：合法 target 會顯示綠色高亮、不合法 target 會顯示紅色高亮，拖曳到不合法 target 時右上角會顯示 validator reason，且這個 preview reason 與實際 `onConnect` 失敗後的錯誤提示現在已統一為同一個 overlay 呈現；preview 狀態會在拖曳結束時清除，同時維持 DSL / execution logic 與既有資料模型不變。本輪完成後再次驗證 `npm run typecheck`、`npm run build` 與 `as any` 搜尋，結果皆維持正常，且沒有新增 UI state 或 store 分叉。