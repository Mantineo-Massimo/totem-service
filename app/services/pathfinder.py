import heapq

def dijkstra(graph, start_node, end_node, nodes):
    distances = {node: float('infinity') for node in nodes}
    distances[start_node] = 0
    previous_nodes = {node: None for node in nodes}
    priority_queue = [(0, start_node)]
    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)
        if current_distance > distances[current_node]: continue
        if current_node == end_node: break
        for neighbor, weight in graph.get(current_node, []):
            distance = current_distance + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous_nodes[neighbor] = current_node
                heapq.heappush(priority_queue, (distance, neighbor))
    path = []
    current = end_node
    while current is not None:
        path.append(current)
        current = previous_nodes.get(current)
    path.reverse()
    if path and path[0] == start_node: return path
    return None
