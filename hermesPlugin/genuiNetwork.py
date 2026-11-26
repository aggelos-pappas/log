import json
from pathlib import Path

SPEC_FILE = Path(__file__).with_name("genuiNetwork.json")
TEXT_LIMIT = 3500
KINDS = ("direct", "shared", "mention", "reply", "quote", "reacted")


def load_spec(path=SPEC_FILE):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _line(value, limit):
    return isinstance(value, str) and 0 < len(value.strip()) <= limit


def _num(value):
    return not isinstance(value, bool) and isinstance(value, (int, float)) and value >= 0


def _check_room(room, path, keys, limits, problems):
    if not isinstance(room, dict):
        return [(path, "not an object")]
    for key in room:
        if key not in keys["room"]:
            problems.append((f"{path}.{key}", "not a field of a map room"))
    if not _line(room.get("key"), limits["id"]):
        problems.append((f"{path}.key", "needs a short key"))
    if not _line(room.get("name"), limits["label"]):
        problems.append((f"{path}.name", "needs a room name"))
    if room.get("server") is not None and not isinstance(room["server"], str):
        problems.append((f"{path}.server", "text or null"))
    if room.get("at") is not None and not isinstance(room["at"], str):
        problems.append((f"{path}.at", "text or null"))
    if not isinstance(room.get("members", []), list) or len(room.get("members", [])) > 4:
        problems.append((f"{path}.members", "at most 4 handles"))
    return problems


def _check_fact(fact, path, problems):
    if not isinstance(fact, dict):
        return [(path, "not an object")]
    for key in ("slot", "text", "quote", "at"):
        if not _line(fact.get(key), 260):
            problems.append((f"{path}.{key}", "needs text"))
    return problems


def check_network(block, path, spec=None, machine_checker=None):
    spec = spec or load_spec()
    limits = spec["limits"]
    keys = spec["keys"]
    problems = []
    if not isinstance(block, dict):
        return [(path, "not an object")]
    for key in block:
        if key not in ("type", "title", "summary", "view", "platform", "cursor", "nextCursor", "total", "rings", "nodes", "edges", "rooms", "path", "target"):
            problems.append((f"{path}.{key}", "not a field of a networkMap block"))
    if block.get("type") != "networkMap":
        problems.append((f"{path}.type", "must be networkMap"))
    if block.get("view") is not None and block["view"] not in spec["views"]:
        problems.append((f"{path}.view", " | ".join(spec["views"])))
    if block.get("platform") is not None and block["platform"] not in spec["platforms"]:
        problems.append((f"{path}.platform", " | ".join(spec["platforms"])))
    for key in ("cursor", "total"):
        if not _num(block.get(key)):
            problems.append((f"{path}.{key}", "a number of 0 or more"))
    if block.get("nextCursor") is not None and not _num(block["nextCursor"]):
        problems.append((f"{path}.nextCursor", "a number or null"))

    nodes = block.get("nodes")
    if not isinstance(nodes, list) or len(nodes) > limits["nodes"]:
        return problems + [(f"{path}.nodes", f"needs a list of at most {limits['nodes']} nodes")]
    node_keys = set()
    for i, node in enumerate(nodes):
        here = f"{path}.nodes.{i}"
        if not isinstance(node, dict):
            problems.append((here, "not an object"))
            continue
        for key in node:
            if key not in keys["node"]:
                problems.append((f"{here}.{key}", "not a field of a map node"))
        for key, limit in (("key", limits["id"]), ("handle", limits["label"]), ("initials", 4), ("platform", limits["platform"]), ("why", limits["why"])):
            if not _line(node.get(key), limit):
                problems.append((f"{here}.{key}", f"needs text of at most {limit} characters"))
        if not isinstance(node.get("ring"), int) or node["ring"] < 1 or node["ring"] > 4:
            problems.append((f"{here}.ring", "1 to 4"))
        if node.get("tone") not in spec["tones"]:
            problems.append((f"{here}.tone", " | ".join(spec["tones"])))
        if not isinstance(node.get("platforms", []), list):
            problems.append((f"{here}.platforms", "a list of platforms"))
        if node.get("key") in node_keys:
            problems.append((f"{here}.key", "node keys repeat"))
        node_keys.add(node.get("key"))
        for j, room in enumerate(node.get("rooms", [])):
            _check_room(room, f"{here}.rooms.{j}", keys, limits, problems)
        for j, fact in enumerate(node.get("facts", [])):
            _check_fact(fact, f"{here}.facts.{j}", problems)
        if len(node.get("facts", [])) > limits["facts"]:
            problems.append((f"{here}.facts", f"at most {limits['facts']} facts"))
        if node.get("next") is not None:
            nxt = node["next"]
            if not isinstance(nxt, dict) or not _line(nxt.get("text"), limits["text"]) or not _line(nxt.get("tool"), limits["platform"]):
                problems.append((f"{here}.next", "needs {text, tool}"))
        machine = node.get("machine")
        if not isinstance(machine, dict):
            problems.append((f"{here}.machine", "needs a stateMachine block"))
        elif machine_checker is not None:
            problems += machine_checker(machine, f"{here}.machine")

    edges = block.get("edges", [])
    if not isinstance(edges, list) or len(edges) > limits["edges"]:
        problems.append((f"{path}.edges", f"at most {limits['edges']} edges"))
    else:
        for i, edge in enumerate(edges):
            here = f"{path}.edges.{i}"
            if not isinstance(edge, dict):
                problems.append((here, "not an object"))
                continue
            for key in edge:
                if key not in keys["edge"]:
                    problems.append((f"{here}.{key}", "not a field of a map edge"))
            if edge.get("kind") not in KINDS:
                problems.append((f"{here}.kind", " | ".join(KINDS)))
            for end in ("a", "b"):
                if not _line(edge.get(end), limits["id"]):
                    problems.append((f"{here}.{end}", "needs a node key"))
                elif edge[end] != "owner" and edge[end] not in node_keys:
                    problems.append((f"{here}.{end}", "no node has this key"))

    rings = block.get("rings", [])
    if not isinstance(rings, list) or len(rings) > 4:
        problems.append((f"{path}.rings", "at most 4 rings"))
    else:
        for i, ring in enumerate(rings):
            here = f"{path}.rings.{i}"
            if not isinstance(ring, dict) or any(key not in keys["ring"] for key in ring):
                problems.append((here, "a ring of {id, label, tone, count, nodes}"))
                continue
            if not _num(ring.get("count")):
                problems.append((f"{here}.count", "a number of 0 or more"))
            for key in ring.get("nodes", []):
                if key not in node_keys:
                    problems.append((f"{here}.nodes", f'no node has key "{key}"'))
                    break
    return problems


def text_network(block):
    lines = []
    if block.get("title"):
        lines.append(f"**{block['title']}**")
    if block.get("summary"):
        lines.append(str(block["summary"]))
    nodes = {n.get("key"): n for n in block.get("nodes", []) if isinstance(n, dict)}
    for ring in block.get("rings", []):
        if not isinstance(ring, dict):
            continue
        lines.append(f"Ring {ring.get('id')} — {ring.get('label', '')}: {ring.get('count', 0)}")
        for key in ring.get("nodes", []):
            node = nodes.get(key)
            if not node:
                continue
            place = node["rooms"][0]["name"] if node.get("rooms") else "no shared room yet"
            fact = f" · {node['facts'][0]['text']}" if node.get("facts") else " · no lasting fact yet"
            nxt = f" · next: {node['next']['text']} with {node['next']['tool']}" if node.get("next") else ""
            lines.append(f"@{str(node.get('handle', '')).lstrip('@')} — {place}{fact}{nxt}")
    path = block.get("path", [])
    if len(path) > 1:
        lines.append("Route: " + " → ".join(str(step.get("handle", "")) for step in path if isinstance(step, dict)))
    if block.get("nextCursor") is not None:
        lines.append("More people are available through the cursor.")
    return "\n".join(lines)[:TEXT_LIMIT]


def register_network(genui, path=SPEC_FILE, machine_checker=None):
    spec = load_spec(path)
    return genui.register_block(spec["kind"], lambda block, where: check_network(block, where, spec, machine_checker), text_network, spec["catalog"])
