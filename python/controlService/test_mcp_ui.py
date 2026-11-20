import logging
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from controlService.models import Membership, OauthAccessToken, OauthClient, OauthGrant, Role, User
from controlService.security import token_hash
from controlService.test_console_routes import World, attach, everything_stored, world

STREAM_URL = "https://voxl.example/stream?password=fakeReadOnlyPassword0001"
UI_CAPS = {"extensions": {"io.modelcontextprotocol/ui": {"mimeTypes": ["text/html;profile=mcp-app"]}}}
APP_META = {"ui": {"resourceUri": "ui://log/browserView", "visibility": ["app"]}}
MANIFEST_UI = [
    {"name": "browserView", "description": "view", "inputSchema": {"type": "object"}, "_meta": {"ui": {"resourceUri": "ui://log/browserView"}}},
    {"name": "browserViewStream", "description": "stream", "inputSchema": {"type": "object"}, "_meta": APP_META},
    {"name": "browserViewFrame", "description": "frame", "inputSchema": {"type": "object"}, "_meta": APP_META},
    {"name": "search", "description": "search", "inputSchema": {"type": "object"}},
]
REPORT_TOOL = {"name": "report", "description": "draw a view", "inputSchema": {"type": "object"}, "_meta": {"ui": {"resourceUri": "ui://log/report"}, "openai/outputTemplate": "ui://log/report"}}
RUNTIME_READ = {"name": "inboxPending", "description": "who waits", "inputSchema": {"type": "object"}}
RUNTIME_WRITE = {"name": "twitterDm", "description": "a dry-run dm", "inputSchema": {"type": "object"}}


def answer(envelope: dict) -> dict:
    tool = envelope["payload"]["tool"]
    args = envelope["payload"]["args"]
    if tool == "toolManifest" and args.get("all"):
        tools = [*MANIFEST_UI, REPORT_TOOL, RUNTIME_READ, RUNTIME_WRITE, {**RUNTIME_WRITE, "name": "twitterDmLive"}]
        return {"kind": "result", "payload": {"state": "succeeded", "result": {"tools": tools, "reads": ["browserView", "search", "report", "inboxPending", "twitterDmLive"]}}}
    if tool == "toolManifest":
        tools = MANIFEST_UI if args.get("ui") or args.get("views") else [{key: value for key, value in tool.items() if key != "_meta"} for tool in MANIFEST_UI if tool["name"] in ("browserView", "search")]
        return {"kind": "result", "payload": {"state": "succeeded", "result": {"tools": tools}}}
    if tool == "uiResourcesList":
        return {"kind": "result", "payload": {"state": "succeeded", "result": {"resources": [{"uri": "ui://log/browserView", "name": "Live browser", "mimeType": "text/html;profile=mcp-app"}, {"uri": "ui://log/report", "name": "View", "mimeType": "text/html;profile=mcp-app"}, {"uri": "log://agents", "name": "not ui"}]}}}
    if tool == "uiResourceRead":
        return {"kind": "result", "payload": {"state": "succeeded", "result": {"contents": [{"uri": args["uri"], "mimeType": "text/html;profile=mcp-app", "text": "<html>view</html>"}]}}}
    if tool == "getGuide":
        return {"kind": "result", "payload": {"state": "succeeded", "result": {"text": "PLAY MATCH " + str(args.get("ask"))}}}
    if tool == "report":
        spec = {"title": args["title"], "compiled": "require('log')", "data": {"people": [{"handle": "grace_ships"}]}} if args.get("ui") else None
        summary = {"title": args["title"], "shown": True, "rows": {"people": 1}} if args.get("ui") else None
        markdown = {"markdown": "# " + args["title"] + "\n| who | n |"} if args.get("markdown") else {}
        return {"kind": "result", "payload": {"state": "succeeded", "result": {"text": "# " + args["title"], "spec": spec, "summary": summary, **markdown}}}
    if tool == "browserViewStream":
        return {"kind": "result", "payload": {"state": "succeeded", "result": {"generation": "a" * 32, "stream": {"kind": "voxl", "url": STREAM_URL, "page": {"width": 10, "height": 10}, "window": {"left": 0, "top": 0, "width": 10, "height": 10}}}}}
    return {"kind": "result", "payload": {"state": "succeeded", "result": {"stdout": "ok"}}}


def bearer(world: World) -> str:
    with Session(world.engine, expire_on_commit=False) as db:
        owner = db.exec(select(User).where(User.email == "owner@example.com")).one()
        membership = db.exec(select(Membership).where(Membership.userId == owner.id)).one()
        client = OauthClient(clientId="clientOne", name="Claude", redirectUris=["http://127.0.0.1:1/callback"])
        db.add(client)
        db.flush()
        grant = OauthGrant(userId=owner.id, teamId=membership.teamId, clientId=client.id, resource="https://mcp.listeningkit.com/mcp", scopes=["log:read"], authzVersion=1)
        db.add(grant)
        db.flush()
        db.add(OauthAccessToken(tokenHash=token_hash("accessTokenOne"), grantId=grant.id, expiresAt=datetime.now(timezone.utc) + timedelta(hours=1)))
        db.commit()
    return "accessTokenOne"


def rpc(world: World, token: str, method: str, params: dict | None = None, session: str | None = None):
    headers = {"Authorization": f"Bearer {token}", **({"Mcp-Session-Id": session} if session else {})}
    world.app.cookies.clear()
    return world.app.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}}, headers=headers)


def initialize(world: World, token: str, capabilities: dict) -> str:
    response = rpc(world, token, "initialize", {"protocolVersion": "2025-06-18", "capabilities": capabilities})
    assert response.status_code == 200
    return response.headers["Mcp-Session-Id"]


def test_a_client_that_declares_nothing_still_gets_every_card_and_resource(world: World) -> None:
    link = attach(world, answer)
    token = bearer(world)
    response = rpc(world, token, "initialize", {"protocolVersion": "2025-06-18", "capabilities": {}})
    assert response.json()["result"]["capabilities"]["extensions"]["io.modelcontextprotocol/ui"]["mimeTypes"] == ["text/html;profile=mcp-app"]
    session = response.headers["Mcp-Session-Id"]
    tools = {tool["name"]: tool for tool in rpc(world, token, "tools/list", session=session).json()["result"]["tools"]}
    assert tools["browserView"]["_meta"]["ui"]["resourceUri"] == "ui://log/browserView"
    assert tools["report"]["_meta"]["ui"]["resourceUri"] == "ui://log/report"
    assert tools["browserViewStream"]["_meta"]["ui"]["visibility"] == ["app"] and "browserViewFrame" in tools
    manifest = next(envelope for envelope in link.sent if envelope["payload"]["tool"] == "toolManifest")
    assert manifest["payload"]["args"]["all"] is True and manifest["payload"]["args"]["ui"] is True
    resources = rpc(world, token, "resources/list", session=session).json()["result"]["resources"]
    assert [item["uri"] for item in resources] == ["ui://log/browserView", "ui://log/report"]
    read = rpc(world, token, "resources/read", {"uri": "ui://log/report"}, session=session).json()["result"]
    assert read["contents"][0]["mimeType"] == "text/html;profile=mcp-app"
    called = rpc(world, token, "tools/call", {"name": "browserViewStream", "arguments": {"account": "a", "generation": "b"}}, session=session).json()["result"]
    assert called["structuredContent"]["stream"]["kind"] == "voxl"


def test_the_tool_list_is_the_runtime_registry_of_reads(world: World) -> None:
    link = attach(world, answer)
    token = bearer(world)
    session = initialize(world, token, {})
    names = [tool["name"] for tool in rpc(world, token, "tools/list", session=session).json()["result"]["tools"]]
    assert names[0] == "accountsList"
    assert "inboxPending" in names and "twitterDm" not in names and "twitterDmLive" not in names
    called = rpc(world, token, "tools/call", {"name": "inboxPending", "arguments": {}}, session=session).json()["result"]
    assert called["content"][0]["text"] == "ok" and not called.get("isError")
    refused = rpc(world, token, "tools/call", {"name": "twitterDm", "arguments": {}}, session=session).json()["result"]
    assert refused["isError"] and "not a registered tool" in refused["content"][0]["text"]
    live = rpc(world, token, "tools/call", {"name": "twitterDmLive", "arguments": {}}, session=session).json()["result"]
    assert live["isError"] and live["content"][0]["text"].startswith("forbidden")
    assert not any(envelope["payload"]["tool"] in ("twitterDm", "twitterDmLive") for envelope in link.sent)


def test_a_call_before_any_list_learns_the_registry_first(world: World) -> None:
    link = attach(world, answer)
    token = bearer(world)
    session = initialize(world, token, {})
    called = rpc(world, token, "tools/call", {"name": "inboxPending", "arguments": {}}, session=session).json()["result"]
    assert not called.get("isError")
    assert [envelope["payload"]["tool"] for envelope in link.sent] == ["toolManifest", "inboxPending"]


def test_an_older_runtime_without_the_registry_gets_the_named_list(world: World) -> None:
    def older(envelope: dict) -> dict:
        if envelope["payload"]["tool"] == "toolManifest" and envelope["payload"]["args"].get("all"):
            return {"kind": "result", "payload": {"state": "succeeded", "result": {"tools": []}}}
        return answer(envelope)

    link = attach(world, older)
    token = bearer(world)
    session = initialize(world, token, {})
    names = [tool["name"] for tool in rpc(world, token, "tools/list", session=session).json()["result"]["tools"]]
    assert "browserView" in names and "inboxPending" not in names
    asked = [envelope["payload"]["args"] for envelope in link.sent if envelope["payload"]["tool"] == "toolManifest"]
    assert asked[0]["all"] is True and "all" not in asked[1]


def test_an_mcp_apps_client_gets_the_widget_its_app_tools_and_the_meta(world: World) -> None:
    link = attach(world, answer)
    token = bearer(world)
    session = initialize(world, token, UI_CAPS)
    tools = {tool["name"]: tool for tool in rpc(world, token, "tools/list", session=session).json()["result"]["tools"]}
    assert tools["browserView"]["_meta"]["ui"]["resourceUri"] == "ui://log/browserView"
    assert tools["browserViewStream"]["_meta"]["ui"]["visibility"] == ["app"]
    manifest = next(envelope for envelope in link.sent if envelope["payload"]["tool"] == "toolManifest")
    assert manifest["payload"]["args"]["ui"] is True
    read = rpc(world, token, "resources/read", {"uri": "ui://log/browserView"}, session=session).json()["result"]
    assert read["contents"][0]["mimeType"] == "text/html;profile=mcp-app"
    assert rpc(world, token, "resources/read", {"uri": "log://agents"}, session=session).json()["error"]["code"] == -32002


def test_the_stream_url_reaches_the_view_but_never_the_control_db_or_logs(world: World, caplog) -> None:
    attach(world, answer)
    token = bearer(world)
    session = initialize(world, token, UI_CAPS)
    with caplog.at_level(logging.DEBUG):
        result = rpc(world, token, "tools/call", {"name": "browserViewStream", "arguments": {"account": "fakeSeller", "generation": "a" * 32}}, session=session).json()["result"]
    assert result["structuredContent"]["stream"]["url"] == STREAM_URL
    assert STREAM_URL not in result["content"][0]["text"]
    assert STREAM_URL not in everything_stored(world)
    assert "fakeReadOnlyPassword0001" not in caplog.text


def test_app_tools_cannot_be_run_as_team_operations(world: World) -> None:
    attach(world, answer)
    from controlService.security import csrf_token
    from controlService.settings import CSRF_HEADER, SESSION_COOKIE
    world.app.cookies.set(SESSION_COOKIE, world.tokens["owner"])
    response = world.app.post(f"/api/v1/teams/{world.teamId}/operations", json={"operationId": "00000000-0000-4000-8000-000000000002", "tool": "browserViewStream", "args": {}}, headers={CSRF_HEADER: csrf_token("sessionSecret", world.tokens["owner"])})
    assert response.status_code == 400


def test_a_report_carries_its_view_to_every_client_and_markdown_to_those_that_declare_nothing(world: World) -> None:
    link = attach(world, answer)
    token = bearer(world)
    session = initialize(world, token, UI_CAPS)
    drawn = rpc(world, token, "tools/call", {"name": "report", "arguments": {"title": "Fake report", "blocks": []}}, session=session).json()["result"]
    assert drawn["structuredContent"] == {"title": "Fake report", "shown": True, "rows": {"people": 1}}
    assert drawn["_meta"]["log/view"]["data"]["people"][0]["handle"] == "grace_ships"
    assert drawn["content"][0]["text"] == "# Fake report"
    sent = [envelope["payload"]["args"] for envelope in link.sent if envelope["payload"]["tool"] == "report"]
    assert sent[0]["ui"] is True and "markdown" not in sent[0]
    plain = initialize(world, token, {})
    text = rpc(world, token, "tools/call", {"name": "report", "arguments": {"title": "Fake report", "blocks": []}}, session=plain).json()["result"]
    assert text["_meta"]["log/view"]["compiled"] == "require('log')"
    assert text["structuredContent"]["shown"] is True
    assert text["content"][0]["text"].startswith("# Fake report\n| who")
    sent = [envelope["payload"]["args"] for envelope in link.sent if envelope["payload"]["tool"] == "report"]
    assert sent[1]["ui"] is True and sent[1]["markdown"] is True


def test_get_guide_is_relayed_as_plain_text_and_the_instructions_say_to_route(world: World) -> None:
    attach(world, answer)
    token = bearer(world)
    response = rpc(world, token, "initialize", {"protocolVersion": "2025-06-18", "capabilities": {}})
    assert "getGuide({ ask:" in response.json()["result"]["instructions"]
    session = response.headers["Mcp-Session-Id"]
    result = rpc(world, token, "tools/call", {"name": "getGuide", "arguments": {"ask": "show me my dms"}}, session=session).json()["result"]
    assert result["content"][0]["text"] == "PLAY MATCH show me my dms"
