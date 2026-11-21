# discordCdnCgiChallengePlatformHBJsdOneshot

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/cdn-cgi/challenge-platform/h/b/jsd/oneshot` |
| Sends | — |
| Reads | — |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 9 time(s) in 9 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /login | 6 | 200 | 54–142 ms | 2386–22597 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 52–57 ms | 12878–14609 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 64 ms | 14384 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 67 ms

Sent:

```json
"P815gPIb-gT6akRHVEHHyUuk0s3faZPpCnbRIZsB4N1HvkYwEvuU3$NU7aOqoTFacXxNBAJTknsJ5VxMuGgSvFmbHrq2YQ9SwhKNek7320ROFLqf3c8N-3pl-k98b097kMXy1+j8TarOP88Q0X4ShWT$ByH3hwNKvqTMn8KaQwKTwxPZfvmNY4tvZ6mhyz4zES$$z3f0bukGFgZy87+NrEUOzGWu0VfwO7qCnRhCHcTIc0MwMo+fV+MStubkL-KOcXtPwgTjTCSLaTW+3hCidItJn4XuS4mbQG7wlWITNBgf6eii3Vv22BgNKXCpakp55wUCEcOlWizj08tWlPIKskJF3rHdnlvy0NfcaBFGN52a8qkm5620ENfvKq9cBYjT-X+tWximmuor$Rke… (14619 chars)"
```

Answered:

```json
null
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 57 ms

Sent:

```json
"mUdHFi+YDgmyL0j2urb7QLtJZ26qrUabw6VNCNjZv5J$HgMh6re3M$6qHDbMV1WYX9JWO0T1x1lgfKxq5hcB8hghEZaaSt8Gb38VuJbk57qa5Szs0xtZCs8cS1GCks+uj62S8D72QVeYBdbCkfTlVuyYFxZzTXYKttWE9wjA8HHxLJIsP23hBDj-7FcDK3v9VymFTWDFba1EGbvxIsjflJs8+-5aKI0ruvdw8yILKdtipqhNQELDGrYu$nK8vcUlfhrQT2KNNlzjbLI8e$p0DCq22XIXY689OdKBVCGmEAvBlFdk50ppJCAZFlo+jhlrUBFqw6$7cZfnpoA7nbFX131NL+-sMPgHk1uvvm8XM6D-Ykjpy$pAubXjUmI0aa32U8Ej4qsP9Z3TZA4h… (14632 chars)"
```

Answered:

```json
null
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 200, 64 ms

Sent:

```json
"oTsC$+vZYPQO3+qiL-Uyr5RnDD5IMqGFZclXEdWQAqFcWgcIK7un8X6rot06+IQSqflKL0eo+f-F6Egoam-Xbx0cNj6T4JYOL5HVSf5sSrmI4$O1tksIYPdWqOOcYP1bs-CrA2R5eaEcO3Cq$0aY-UmZO5RNitRv5u-nUzN4JT6UUmlWgdGCJTV1M4cCfN$N4M5IiSAVa+fJzWVZywsGAT0Rz-A2x5Oo3$1CDYv6N8nfJVZhXGLIzNCZccVRazD+leWQAsyENP6M2jqILpqRhU2JyZx1faHpmXJDJex-flGWzP4amUbVvaqHvNadfy3l-bXhmVnH-haWk6Fd2jzrkuU564yUvr1mYeWX9zfZq953pXSDYu1llfv+WF80LFFSOjC3SvwIgwVrLAm3… (14638 chars)"
```

Answered:

```json
null
```

<!-- facts:end -->

## What it does

Cloudflare's background browser check on discord.com. The page posts one encoded reading of the browser when the login page loads, and Cloudflare answers with no body.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It fires by itself while the account's browser sits on the login page; the owner signs in and the session is saved when the browser closes.

## What can go wrong

It answered 200 in the one run that has it. If Cloudflare instead puts a challenge page in front of the login form, that is a stop for the owner to clear in the window; log retries nothing (rule 94).
