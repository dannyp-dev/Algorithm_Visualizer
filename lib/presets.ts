import type { AlgorithmDefinition } from '@/lib/types';

const bubbleSortSource = `def run(input_data, emit):
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
`;

const breadthFirstSearchSource = `def run(input_data, emit):
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
`;

const dijkstraSource = `def run(input_data, emit):
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
`;

export const algorithmPresets: AlgorithmDefinition[] = [
  {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    summary: 'Adjacent comparisons gradually settle the largest values.',
    family: 'array',
    source: bubbleSortSource,
    input: { values: [42, 17, 8, 33, 26, 5, 19] },
    complexity: { time: 'O(n²)', space: 'O(1)' },
    origin: 'preset',
  },
  {
    id: 'breadth-first-search',
    name: 'Breadth-First Search',
    summary: 'A queue explores a graph one distance layer at a time.',
    family: 'graph',
    source: breadthFirstSearchSource,
    input: {
      nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
      edges: [
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
        ['B', 'E'],
        ['C', 'F'],
        ['E', 'F'],
      ],
      start: 'A',
    },
    complexity: { time: 'O(V + E)', space: 'O(V)' },
    origin: 'preset',
  },
  {
    id: 'dijkstra-shortest-path',
    name: 'Dijkstra’s Algorithm',
    summary: 'Greedy edge relaxation finds shortest paths from one source.',
    family: 'graph',
    source: dijkstraSource,
    input: {
      nodes: ['A', 'B', 'C', 'D', 'E'],
      edges: [
        ['A', 'B', 4],
        ['A', 'C', 2],
        ['B', 'C', 1],
        ['B', 'D', 5],
        ['C', 'D', 8],
        ['C', 'E', 10],
        ['D', 'E', 2],
      ],
      start: 'A',
    },
    complexity: { time: 'O(V²)', space: 'O(V + E)' },
    origin: 'preset',
  },
];

export const initialAlgorithm = algorithmPresets[0];
