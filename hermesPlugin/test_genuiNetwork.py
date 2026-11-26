import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import genuiNetwork

MACHINE = {"type": "stateMachine", "title": "Where you are with @someone", "view": "person",
           "states": [{"id": "new", "label": "New", "explain": "Where every relationship starts.", "visited": True},
                      {"id": "engaged", "label": "Engaged with you", "explain": "They replied in a channel.", "current": True}],
           "transitions": [{"id": "reply", "from": "new", "to": "engaged", "event": "they replied", "by": "them"}]}


def block():
    return {
        "type": "networkMap", "title": "Your network, drawn", "summary": "2 people · 1 connection",
        "view": "overview", "platform": "all", "cursor": 0, "nextCursor": None, "total": 2,
        "rings": [{"id": 1, "label": "engaged with you", "tone": "orange", "count": 1, "nodes": ["discord:42"]}],
        "nodes": [{
            "key": "discord:42", "handle": "@grace_ships", "initials": "GS", "platform": "discord",
            "platforms": ["discord", "twitter"], "ring": 1, "tone": "orange",
            "why": "Ring 1 — engaged; they replied in #hermes-agent",
            "rooms": [{"key": "room:1", "name": "Nous Research · #hermes-agent", "server": "Nous Research",
                       "kind": "channel", "platform": "discord", "meaning": "You both wrote here",
                       "at": "2026-11-20T00:00:00.000Z", "members": ["the-owner"]}],
            "facts": [{"slot": "open", "text": "pair on the relate hackathon", "quote": "want to pair on the relate hackathon?", "at": "2026-11-20"}],
            "next": {"text": "Answer their DM", "tool": "discordSend"},
            "lanes": [{"platform": "discord", "state": "Engaged with you"}],
            "quiet": False, "talk": False, "at": 1763000000000, "machine": json.loads(json.dumps(MACHINE)),
        }],
        "edges": [{"a": "owner", "b": "discord:42", "kind": "direct", "room": "Direct chat", "at": "2026-11-20T00:00:00.000Z"}],
        "rooms": [], "path": [{"key": "owner", "handle": "You"}, {"key": "discord:42", "handle": "@grace_ships", "room": "Direct chat"}],
    }


class NetworkValidator(unittest.TestCase):
    def test_real_block_validates(self):
        self.assertEqual(genuiNetwork.check_network(block(), "block"), [])

    def test_text_fallback_names_the_person_room_fact_and_route(self):
        text = genuiNetwork.text_network(block())
        self.assertIn("**Your network, drawn**", text)
        self.assertIn("@grace_ships", text)
        self.assertIn("#hermes-agent", text)
        self.assertIn("pair on the relate hackathon", text)
        self.assertIn("Route: You → @grace_ships", text)

    def test_an_edge_to_an_unknown_node_is_refused(self):
        bad = block()
        bad["edges"].append({"a": "discord:42", "b": "discord:999", "kind": "reply", "room": "reply", "at": None})
        problems = dict(genuiNetwork.check_network(bad, "block"))
        self.assertTrue(any("no node has this key" in why for why in problems.values()))

    def test_a_guessed_edge_kind_is_refused(self):
        bad = block()
        bad["edges"][0]["kind"] = "guessed"
        problems = dict(genuiNetwork.check_network(bad, "block"))
        self.assertIn("block.edges.0.kind", problems)

    def test_a_node_without_its_machine_is_refused(self):
        bad = block()
        del bad["nodes"][0]["machine"]
        problems = dict(genuiNetwork.check_network(bad, "block"))
        self.assertIn("block.nodes.0.machine", problems)


if __name__ == "__main__":
    unittest.main()
