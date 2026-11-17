import { AskButton, Badge, Card, Empty, FollowUps, Grid, Page, Row, Stack, Stat, Table, Time, fmt } from "log";

const where = (r) => `${r.platform}${r.kind === "group" ? " group" : ""}`;

function People({ rows, ask }) {
  return (
    <Table
      rows={rows}
      columns={[
        { key: "who", title: "Who", render: (r) => <strong>{r.who}</strong> },
        { key: "platform", title: "Platform", width: 120, render: (r) => <Stack gap={0}><Badge>{where(r)}</Badge><span className="sb-stat-hint">{r.account}</span></Stack> },
        { key: "said", title: "What they said", render: (r) => <span className="sb-stat-hint">{r.said}</span> },
        { key: "at", title: "When", width: 72, render: (r) => <span style={{ whiteSpace: "nowrap" }}><Time value={r.at} /></span> },
        { key: "ask", title: "", width: 110, render: (r) => <AskButton prompt={`${ask} ${r.who} on ${where(r)} (account ${r.account})`}>{ask.split(" ")[0]}</AskButton> },
      ]}
    />
  );
}

export default function App({ data, title, subtitle }) {
  const report = Object.values(data)[0];
  return (
    <Page title={title} subtitle={subtitle}>
      <Grid min={140}>
        <Stat label="Waiting on you" value={fmt(report.waiting.length)} hint="their message is the last one" />
        <Stat label="Opened, no reply" value={fmt(report.followUps.length)} hint="they read yours and went quiet" />
        {report.byPlatform.map((p) => <Stat key={p.platform} label={p.platform} value={fmt(p.waiting)} hint={`${p.followUps} opened, no reply`} />)}
      </Grid>
      <Card title="Waiting on you" pad={false}>
        {report.waiting.length ? <People rows={report.waiting} ask="Draft a reply to" /> : <Empty>Nobody is waiting on you in this window.</Empty>}
      </Card>
      {report.followUps.length ? (
        <Card title="They opened it and didn't answer" pad={false}>
          <People rows={report.followUps} ask="Follow up with" />
        </Card>
      ) : null}
      <FollowUps prompts={["Which of these is a deal or money?", "Reply to everyone waiting on X", "Who has been waiting longest?"]} />
    </Page>
  );
}
