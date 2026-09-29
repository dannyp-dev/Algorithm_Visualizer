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

const aStarGridSource = `import heapq


def run(input_data, emit):
    rows = int(input_data["rows"])
    columns = int(input_data["columns"])
    walls = {tuple(cell) for cell in input_data["walls"]}
    start = tuple(input_data["start"])
    goal = tuple(input_data["goal"])
    open_heap = [(heuristic(start, goal), 0, start)]
    open_cells = {start}
    closed = set()
    came_from = {}
    g_score = {start: 0}

    emit(16, "Seed the open set", {
        "current": start, "open_set": sorted(open_cells),
        "closed_set": [], "goal": goal
    }, grid_state(rows, columns, walls, open_cells, closed, start, goal))

    while open_heap:
        _, current_cost, current = heapq.heappop(open_heap)
        if current in closed:
            continue
        open_cells.discard(current)

        emit(27, "Choose the lowest estimated-cost cell", {
            "current": current, "g_score": current_cost,
            "open_set": sorted(open_cells), "closed_set": sorted(closed)
        }, grid_state(
            rows, columns, walls, open_cells, closed, start, goal, current
        ))

        if current == goal:
            path = reconstruct_path(came_from, current)
            emit(36, "Shortest path reconstructed", {
                "path": path, "cost": len(path) - 1,
                "open_set": sorted(open_cells),
                "closed_set": sorted(closed)
            }, grid_state(
                rows, columns, walls, open_cells, closed,
                start, goal, current, path
            ), "Follow parent links from the goal back to the start.")
            return

        closed.add(current)
        for neighbor in neighbors(current, rows, columns):
            if neighbor in walls or neighbor in closed:
                continue
            tentative_cost = current_cost + 1
            if tentative_cost < g_score.get(neighbor, float("inf")):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_cost
                estimate = tentative_cost + heuristic(neighbor, goal)
                heapq.heappush(open_heap, (estimate, tentative_cost, neighbor))
                open_cells.add(neighbor)
                emit(57, "Update a better route into the open set", {
                    "current": current, "neighbor": neighbor,
                    "g_score": tentative_cost, "f_score": estimate,
                    "open_set": sorted(open_cells),
                    "closed_set": sorted(closed)
                }, grid_state(
                    rows, columns, walls, open_cells, closed,
                    start, goal, neighbor
                ))

    emit(67, "No path reaches the goal", {
        "open_set": [], "closed_set": sorted(closed)
    }, grid_state(rows, columns, walls, set(), closed, start, goal),
       "The open set is empty, so every reachable option was exhausted.")


def heuristic(cell, goal):
    return abs(cell[0] - goal[0]) + abs(cell[1] - goal[1])


def neighbors(cell, rows, columns):
    row, column = cell
    candidates = [
        (row - 1, column), (row + 1, column),
        (row, column - 1), (row, column + 1)
    ]
    return [
        candidate for candidate in candidates
        if 0 <= candidate[0] < rows and 0 <= candidate[1] < columns
    ]


def reconstruct_path(came_from, current):
    path = [current]
    while current in came_from:
        current = came_from[current]
        path.append(current)
    path.reverse()
    return path


def grid_state(
    rows, columns, walls, open_cells, closed, start, goal,
    current=None, path=None
):
    path_cells = set(path or [])
    cells = []
    for row in range(rows):
        grid_row = []
        for column in range(columns):
            cell = (row, column)
            if cell == start:
                token = "S"
            elif cell == goal:
                token = "G"
            elif cell in walls:
                token = "■"
            elif cell in path_cells:
                token = "◆"
            elif cell == current:
                token = "◎"
            elif cell in open_cells:
                token = "○"
            elif cell in closed:
                token = "×"
            else:
                token = "·"
            grid_row.append(token)
        cells.append(grid_row)

    active = list(path_cells) if path_cells else ([current] if current else [])
    settled = [cell for cell in closed if cell not in path_cells]
    return {
        "kind": "grid",
        "cells": cells,
        "rowLabels": [str(index) for index in range(rows)],
        "columnLabels": [str(index) for index in range(columns)],
        "activeCells": active,
        "settledCells": settled
    }
`;

const binarySearchTreeSource = `def run(input_data, emit):
    values = list(input_data["values"])
    nodes = []

    def tree_state(active=None):
        return {
            "kind": "tree",
            "nodes": [
                {
                    "id": "n" + str(index),
                    "label": str(node["value"]),
                    "parentId": None if node["parent"] is None else "n" + str(node["parent"]),
                    "depth": node["depth"],
                    "order": node["order"],
                    "status": "active" if index == active else "complete"
                }
                for index, node in enumerate(nodes)
            ]
        }

    for value in values:
        if not nodes:
            nodes.append({"value": value, "parent": None, "depth": 0,
                          "order": 1, "left": None, "right": None})
            emit(25, "Insert the root", {"value": value}, tree_state(0))
            continue

        current_index = 0
        while True:
            current = nodes[current_index]
            emit(31, "Compare with the current node", {
                "value": value, "current": current["value"]
            }, tree_state(current_index))
            direction = "left" if value < current["value"] else "right"
            child_index = current[direction]
            if child_index is None:
                new_index = len(nodes)
                nodes.append({"value": value, "parent": current_index,
                              "depth": current["depth"] + 1,
                              "order": current["order"] * 2 + (direction == "right"),
                              "left": None, "right": None})
                current[direction] = new_index
                emit(43, "Insert as the " + direction + " child", {
                    "value": value, "parent": current["value"], "side": direction
                }, tree_state(new_index))
                break
            current_index = child_index

    emit(49, "Insertion complete", {"inserted": values}, tree_state())
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
  {
    id: 'a-star-grid-pathfinding',
    name: 'A* Grid Pathfinding',
    summary:
      'A heuristic prioritizes the most promising cells and reconstructs the shortest path.',
    family: 'grid',
    source: aStarGridSource,
    input: {
      rows: 7,
      columns: 7,
      walls: [
        [0, 3],
        [1, 1],
        [1, 3],
        [2, 3],
        [2, 5],
        [3, 1],
        [3, 5],
        [4, 1],
        [4, 3],
        [4, 5],
        [5, 3],
        [5, 5],
      ],
      start: [0, 0],
      goal: [6, 6],
    },
    complexity: { time: 'O(RC log(RC))', space: 'O(RC)' },
    origin: 'preset',
  },
  {
    id: 'binary-search-tree-insertion',
    name: 'Binary Search Tree Insertion',
    summary: 'Each value follows comparisons until it finds an open child position.',
    family: 'tree',
    source: binarySearchTreeSource,
    input: { values: [8, 3, 10, 1, 6, 14, 4] },
    complexity: { time: 'O(nh)', space: 'O(n)' },
    origin: 'preset',
  },
];

export const initialAlgorithm = algorithmPresets[0];
