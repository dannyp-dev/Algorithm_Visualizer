(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,61846,e=>{"use strict";let s;var t=e.i(43476),a=e.i(71645);let i=[{id:"bubble-sort",name:"Bubble Sort",summary:"Adjacent comparisons gradually settle the largest values.",family:"array",source:`def run(input_data, emit):
    values = list(input_data["values"])
    settled = []
    emit(1, "Initialize the array", {"n": len(values)}, {
        "kind": "array", "values": values, "settled": settled
    })

    for end in range(len(values) - 1, 0, -1):
        swapped = False
        for index in range(end):
            emit(8, "Compare adjacent values", {
                "index": index, "left": values[index], "right": values[index + 1]
            }, {
                "kind": "array", "values": values,
                "comparing": [index, index + 1], "settled": settled
            })
            if values[index] > values[index + 1]:
                values[index], values[index + 1] = values[index + 1], values[index]
                swapped = True
                emit(16, "Swap the out-of-order pair", {"index": index}, {
                    "kind": "array", "values": values,
                    "active": [index, index + 1], "settled": settled
                })
        settled = list(range(end, len(values)))
        emit(22, "Lock the largest remaining value", {"end": end}, {
            "kind": "array", "values": values, "settled": settled
        })
        if not swapped:
            break

    emit(28, "Array sorted", {"result": values}, {
        "kind": "array", "values": values,
        "settled": list(range(len(values)))
    })
`,input:{values:[42,17,8,33,26,5,19]},complexity:{time:"O(n²)",space:"O(1)"},origin:"preset"},{id:"breadth-first-search",name:"Breadth-First Search",summary:"A queue explores a graph one distance layer at a time.",family:"graph",source:`def run(input_data, emit):
    nodes = input_data["nodes"]
    edges = input_data["edges"]
    start = input_data["start"]
    adjacency = {node: [] for node in nodes}
    for source, target in edges:
        adjacency[source].append(target)
        adjacency[target].append(source)

    queue = [start]
    visited = {start}
    emit(10, "Seed the frontier", {"queue": queue, "visited": list(visited)},
         graph_state(nodes, edges, queue, visited, start))

    while queue:
        current = queue.pop(0)
        emit(15, "Visit the next node", {
            "current": current, "queue": queue, "visited": list(visited)
        }, graph_state(nodes, edges, queue, visited, current))

        for neighbor in adjacency[current]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
                emit(23, "Discover a neighbor", {
                    "current": current, "neighbor": neighbor,
                    "queue": queue, "visited": list(visited)
                }, graph_state(nodes, edges, queue, visited, neighbor))

    emit(30, "Traversal complete", {"visited": list(visited)},
         graph_state(nodes, edges, [], visited, None))


def graph_state(nodes, edges, queue, visited, active):
    return {
        "kind": "graph",
        "nodes": [
            {
                "id": node,
                "status": "active" if node == active else
                          "queued" if node in queue else
                          "visited" if node in visited else "idle"
            }
            for node in nodes
        ],
        "edges": [
            {"source": source, "target": target}
            for source, target in edges
        ]
    }
`,input:{nodes:["A","B","C","D","E","F"],edges:[["A","B"],["A","C"],["B","D"],["B","E"],["C","F"],["E","F"]],start:"A"},complexity:{time:"O(V + E)",space:"O(V)"},origin:"preset"},{id:"dijkstra-shortest-path",name:"Dijkstra’s Algorithm",summary:"Greedy edge relaxation finds shortest paths from one source.",family:"graph",source:`def run(input_data, emit):
    nodes = input_data["nodes"]
    edges = input_data["edges"]
    start = input_data["start"]
    adjacency = {node: [] for node in nodes}
    for source, target, weight in edges:
        adjacency[source].append((target, weight))
        adjacency[target].append((source, weight))

    distances = {node: float("inf") for node in nodes}
    distances[start] = 0
    unvisited = set(nodes)

    while unvisited:
        current = min(unvisited, key=lambda node: distances[node])
        if distances[current] == float("inf"):
            break
        emit(16, "Choose the nearest unvisited node", {
            "current": current, "distances": readable(distances)
        }, graph_state(nodes, edges, distances, unvisited, current))
        unvisited.remove(current)

        for neighbor, weight in adjacency[current]:
            candidate = distances[current] + weight
            if neighbor in unvisited and candidate < distances[neighbor]:
                distances[neighbor] = candidate
                emit(25, "Relax an edge", {
                    "from": current, "to": neighbor, "candidate": candidate,
                    "distances": readable(distances)
                }, graph_state(nodes, edges, distances, unvisited, neighbor))

    emit(32, "Shortest paths resolved", {"distances": readable(distances)},
         graph_state(nodes, edges, distances, set(), None))


def readable(distances):
    return {
        node: ("∞" if value == float("inf") else value)
        for node, value in distances.items()
    }


def graph_state(nodes, edges, distances, unvisited, active):
    return {
        "kind": "graph",
        "nodes": [
            {
                "id": node,
                "value": "∞" if distances[node] == float("inf") else distances[node],
                "status": "active" if node == active else
                          "idle" if node in unvisited else "complete"
            }
            for node in nodes
        ],
        "edges": [
            {"source": source, "target": target, "weight": weight}
            for source, target, weight in edges
        ]
    }
`,input:{nodes:["A","B","C","D","E"],edges:[["A","B",4],["A","C",2],["B","C",1],["B","D",5],["C","D",8],["C","E",10],["D","E",2]],start:"A"},complexity:{time:"O(V²)",space:"O(V + E)"},origin:"preset"}],n=i[0],r=e=>{let s,t=new Set,a=(e,a)=>{let i="function"==typeof e?e(s):e;if(!Object.is(i,s)){let e=s;s=(null!=a?a:"object"!=typeof i||null===i)?i:Object.assign({},s,i),t.forEach(t=>t(s,e))}},i=()=>s,n={setState:a,getState:i,getInitialState:()=>r,subscribe:e=>(t.add(e),()=>t.delete(e))},r=s=e(a,i,n);return n},d=e=>{let s=e?r(e):r,t=e=>(function(e,s=e=>e){let t=a.default.useSyncExternalStore(e.subscribe,a.default.useCallback(()=>s(e.getState()),[e,s]),a.default.useCallback(()=>s(e.getInitialState()),[e,s]));return a.default.useDebugValue(t),t})(s,e);return Object.assign(t,s),t},l=(s=(e,s)=>({algorithm:n,source:n.source,inputText:JSON.stringify(n.input,null,2),frames:[],frameIndex:0,runtimeStatus:"idle",runtimeMessage:"Ready to execute",isPlaying:!1,playbackSpeed:1,setAlgorithm:s=>e({algorithm:s,source:s.source,inputText:JSON.stringify(s.input,null,2),frames:[],frameIndex:0,runtimeStatus:"idle",runtimeMessage:"Ready to execute",isPlaying:!1}),setSource:s=>e({source:s}),setInputText:s=>e({inputText:s}),setRuntime:(s,t="")=>e({runtimeStatus:s,runtimeMessage:t}),setExecution:({frames:s,durationMs:t})=>e({frames:s,frameIndex:0,runtimeStatus:"ready",runtimeMessage:`${s.length} snapshots \xb7 ${Math.round(t)} ms`,isPlaying:!1}),setFrameIndex:t=>{e({frameIndex:Math.max(0,Math.min(t,Math.max(0,s().frames.length-1)))})},stepForward:()=>s().setFrameIndex(s().frameIndex+1),stepBackward:()=>s().setFrameIndex(s().frameIndex-1),setPlaying:s=>e({isPlaying:s}),setPlaybackSpeed:s=>e({playbackSpeed:s}),parseInput:()=>JSON.parse(s().inputText)}))?d(s):d;e.s(["default",0,function(){let[e,s]=(0,a.useState)(!1),n=l(e=>e.algorithm),r=l(e=>e.inputText),d=l(e=>e.setInputText),c=l(e=>e.setAlgorithm),o=l(e=>e.runtimeStatus),u=l(e=>e.runtimeMessage),h=(0,a.useMemo)(()=>"idle"===o?"Runtime cold":"loading"===o?"Loading Python":"running"===o?"Executing":"ready"===o?"Trace ready":"Runtime error",[o]);return(0,t.jsxs)("main",{className:"studio-shell",children:[(0,t.jsxs)("header",{className:"topbar",children:[(0,t.jsxs)("button",{className:"brand-lockup",type:"button",onClick:()=>s(e=>!e),"aria-expanded":e,children:[(0,t.jsx)("span",{className:"brand-mark",children:"A∴"}),(0,t.jsxs)("span",{children:[(0,t.jsx)("strong",{children:"Algorithm Studio"}),(0,t.jsx)("small",{children:"Code → state → structure"})]})]}),(0,t.jsxs)("div",{className:"algorithm-heading",children:[(0,t.jsxs)("span",{className:"eyebrow",children:[n.family," / python"]}),(0,t.jsx)("strong",{children:n.name})]}),(0,t.jsxs)("div",{className:"runtime-cluster","aria-live":"polite",children:[(0,t.jsx)("span",{className:`runtime-dot runtime-dot-${o}`}),(0,t.jsxs)("span",{children:[(0,t.jsx)("strong",{children:h}),(0,t.jsx)("small",{children:u})]})]}),(0,t.jsx)("button",{className:"button button-quiet",type:"button",onClick:()=>s(e=>!e),children:"Examples"}),(0,t.jsx)("button",{className:"button button-primary",type:"button",children:"Run algorithm"})]}),e&&(0,t.jsxs)("section",{className:"library-popover","aria-label":"Algorithm library",children:[(0,t.jsx)("p",{className:"eyebrow",children:"Algorithm library"}),(0,t.jsx)("div",{className:"library-list",children:i.map(e=>(0,t.jsxs)("button",{type:"button",className:e.id===n.id?"is-selected":"",onClick:()=>{c(e),s(!1)},children:[(0,t.jsxs)("span",{children:[(0,t.jsx)("strong",{children:e.name}),(0,t.jsx)("small",{children:e.summary})]}),(0,t.jsxs)("span",{className:"complexity",children:[e.complexity.time," / ",e.complexity.space]})]},e.id))})]}),(0,t.jsxs)("section",{className:"workspace-grid",children:[(0,t.jsxs)("article",{className:"workspace-panel editor-panel",children:[(0,t.jsxs)("div",{className:"panel-header",children:[(0,t.jsx)("span",{children:"01 / Source"}),(0,t.jsx)("span",{children:"Python 3.13 · WASM"})]}),(0,t.jsxs)("div",{className:"editor-placeholder",children:[(0,t.jsx)("div",{className:"line-numbers","aria-hidden":"true",children:Array.from({length:18},(e,s)=>(0,t.jsx)("span",{children:s+1},s))}),(0,t.jsx)("pre",{children:n.source})]})]}),(0,t.jsxs)("article",{className:"workspace-panel stage-panel",children:[(0,t.jsxs)("div",{className:"panel-header",children:[(0,t.jsx)("span",{children:"02 / Structure"}),(0,t.jsx)("span",{children:"D3 viewport"})]}),(0,t.jsxs)("div",{className:"stage-placeholder",children:[(0,t.jsx)("div",{className:"orbit orbit-one"}),(0,t.jsx)("div",{className:"orbit orbit-two"}),(0,t.jsxs)("div",{className:"stage-copy",children:[(0,t.jsx)("span",{className:"stage-index",children:"00"}),(0,t.jsx)("p",{children:"Run the algorithm to assemble its execution trace."}),(0,t.jsx)("small",{children:"Every emitted snapshot becomes a reversible frame."})]})]})]}),(0,t.jsxs)("aside",{className:"workspace-panel inspector-panel",children:[(0,t.jsxs)("div",{className:"panel-header",children:[(0,t.jsx)("span",{children:"03 / State"}),(0,t.jsx)("span",{children:"Live"})]}),(0,t.jsxs)("div",{className:"inspector-content",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"eyebrow",children:"Current operation"}),(0,t.jsx)("h2",{children:"Awaiting execution"}),(0,t.jsxs)("p",{children:["The worker will capture variables and visual state every time the algorithm calls ",(0,t.jsx)("code",{children:"emit()"}),"."]})]}),(0,t.jsxs)("dl",{children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("dt",{children:"Time"}),(0,t.jsx)("dd",{children:n.complexity.time})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("dt",{children:"Space"}),(0,t.jsx)("dd",{children:n.complexity.space})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("dt",{children:"Frames"}),(0,t.jsx)("dd",{children:"—"})]})]})]})]})]}),(0,t.jsxs)("section",{className:"input-drawer",children:[(0,t.jsxs)("div",{className:"panel-header",children:[(0,t.jsx)("span",{children:"Input / JSON"}),(0,t.jsx)("span",{children:"Editable"})]}),(0,t.jsx)("textarea",{value:r,onChange:e=>d(e.target.value),"aria-label":"Algorithm input as JSON",spellCheck:!1})]}),(0,t.jsxs)("footer",{className:"transport-shell",children:[(0,t.jsxs)("div",{className:"transport-controls",children:[(0,t.jsx)("button",{type:"button","aria-label":"Return to first frame",children:"↤"}),(0,t.jsx)("button",{type:"button","aria-label":"Previous frame",children:"←"}),(0,t.jsx)("button",{className:"transport-play",type:"button","aria-label":"Play",children:"▶"}),(0,t.jsx)("button",{type:"button","aria-label":"Next frame",children:"→"}),(0,t.jsx)("span",{children:"00 / 00"})]}),(0,t.jsx)("div",{className:"timeline-track","aria-hidden":"true",children:(0,t.jsx)("span",{})}),(0,t.jsxs)("div",{className:"technology-line",children:[(0,t.jsx)("span",{children:"Next.js"}),(0,t.jsx)("span",{children:"Monaco"}),(0,t.jsx)("span",{children:"Pyodide"}),(0,t.jsx)("span",{children:"Zustand"}),(0,t.jsx)("span",{children:"D3"}),(0,t.jsx)("span",{children:"Gemini"})]})]})]})}],61846)}]);