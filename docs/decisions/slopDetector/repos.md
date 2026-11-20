### seyedehsanhadi/sloptrim
seyedehsanhadi/sloptrim	427	2026-11-10	Apache-2.0	Python	A local detector for AI-writing patterns. Scores every prose file your agent saves. Python standard library only, no network, no model.

<div align="center">
<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/sloptrim-logo-dark.svg">
  </picture>
</h1>
**A local detector for AI-writing patterns. It scores the first 262,144 characters of extracted
prose in files saved through supported file-edit tools, and asks for the flagged
spans to be fixed. Plain text is accepted up to 512 KB, supported archives up to 4 MB.**
Python standard library only, no network, no model. Prose only, never code.
[Install](#install) &middot; [What it does](#what-it-does) &middot; [Measured](#measured) &middot; [Limits](#what-it-cannot-do) &middot; [Patterns](references/patterns.md) &middot; [Ethics](ETHICS.md)
</div>
> [!IMPORTANT]
> **This is a command-line tool and an agent plugin. There is no website and no hosted version.**
> Nothing you write is uploaded, there is no account, and no text ever leaves your machine.
> Any site offering a service under this name is unrelated to this project.
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/demo-dark.svg">
</picture>
<div align="center"><sub>A recorded session, not a mock-up. <a href="record/session_capture.py">record/session_capture.py</a> fires the real hooks with the payloads Claude Code sends and writes <a href="record/session.json">record/session.json</a>; <a href="re
---
## Install
Paste into Claude Code, Codex, Cursor, or any coding agent:
```text
Install the sloptrim plugin from https://github.com/seyedehsanhadi/sloptrim
```
Restart, then run `/sloptrim doctor`. It answers with four `[OK]` lines. They test
the local install, not whether the host delivers hook events, so save a prose file
and look for its entry in `/sloptrim show`.
<details>
<summary>Explicit commands, and installing without the marketplace</summary>
```
/plugin marketplace add seyedehsanhadi/sloptrim
/plugin install sloptrim@sloptrim
```
```bash
git clone https://github.com/seyedehsanhadi/sloptrim.git ~/.claude/skills/sloptrim
mkdir -p ~/.claude/commands
cp ~/.claude/skills/sloptrim/install/sloptrim-command.md ~/.claude/commands/sloptrim.md
```
Do not skip the `mkdir`. On a fresh machine `~/.claude/commands` does not exist yet
and the copy fails with "No such file or directory". In PowerShell the last two lines
are `New-Item -ItemType Directory -Force $HOME/.claude/commands` and `Copy-Item`.
The copy puts `/sloptrim` in the `/` menu, because Claude Code does not scan a skill
folder's own `commands/`. A marketplace install needs no such step. Either way the
router also answers to `/sloptrim:sloptrim`.
</details>
## What it does
The score is 0-100 against 71 documented patterns. 62 of them have a detector; the
other 9 need a reading and are worked during the rewrite. Of the 62, 50 can move the
score and 12 are reported as writing advice and count for nothing: most of them because
measurement showed they mark formal register rather than machine authorship, the rest
because they are typographic habits.
| | |
|---|---|
| Formats | 20, including `.docx`, `.pptx`, `.xlsx`, OpenDocument, `.epub`, `.ipynb`, LaTeX; the first 262,144 characters of extracted prose is scored |
| Runs in | Claude Code, on save. Other agents via `/sloptrim init`, which writes the contract to `AGENTS.md`, and `.cursor/rules/` |
| Needs | Node for the hooks, Python 3.9 or newer for the detector, nothing else |
| Suite | 222 Python tests and 83 hook checks, with CI configured for Linux, Windows and macOS, against Python 3.9 and 3.13 (macOS on 3.13) |
| D

### pablocaeg/sloptotal
pablocaeg/sloptotal	132	2026-11-03	MIT	Python	Open-source AI text detector and ChatGPT detector: 23 engines, one calibrated score, every number measured on a public benchmark. Self-hosted, runs on CPU.

<p align="center">
</p>
<p align="center">
</p>
<p align="center"><b>English</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a></p>
# SlopTotal
**VirusTotal for AI-generated text.** Paste text, drop in a PDF or Word file, or
give it a URL. Twenty-three independent AI detectors (neural classifiers,
statistical tests and linguistic heuristics) score it in parallel, and a
calibrated ensemble turns their votes into one verdict you can inspect engine by
engine. It runs on your own CPU, so nothing you scan leaves your machine.
It is a free, self-hosted, open-source alternative to hosted AI content
detectors such as GPTZero, Originality.ai, Copyleaks, ZeroGPT and Humalingo.
Instead of one number from one model, it shows you every model's opinion, and
it publishes how accurate that is, failures included.
<p align="center">
</p>
**Try it:** [sloptotal.com](https://sloptotal.com) · **Run it:** `docker run -p 8000:8000 ghcr.io/pablocaeg/sloptotal`
## Features
- **23 detection engines, one calibrated score.** DeBERTa and RoBERTa
  classifiers, Binoculars, Fast-DetectGPT, GLTR, perplexity and burstiness
  tests, and stock-phrase heuristics. Results stream in as each engine finishes.
- **Text, URLs and documents.** Paste text, scan a web page (main content is
  extracted automatically), or upload `.pdf`, `.docx`, `.txt` or `.md`.
- **Site check: was this website vibe-coded?** Finds the fingerprints that
  Lovable, v0, Bolt, Base44, Replit, Same and Emergent leave in the sites they deploy,
  and shows the evidence for each one. [How it works](#site-check-detect-sites-built-with-ai-app-builders)
- **Per-paragraph heat map** through the API, to see which parts read as AI.
- **Measured, not claimed.** Every accuracy number below comes with the corpus,
  the harness and the raw per-sample scores.
- **Private by default.** Self-hosted, no third-party AI APIs, no tracking,
  reports deleted after 30 days.
- **CPU-only is fine.** Auto-detects your hardware; a GPU is optional. Loaded
  models need about 8.3 GB of RAM (an estimate; see
  [docs/MODELS.md](docs/MODELS.md)).
- **JSON API and a [Chrome extension](https://github.com/pablocaeg/sloptotal-extension)**
  that marks AI-looking results in Google Search and LinkedIn.
## Measured accuracy
Most detectors publish an accuracy figure without saying what it was measured
on. SlopTotal is measured on [SlopBench](tests/eval/slopbench/): 1,626 human
texts, every one written before ChatGPT, and 1,626 AI texts on the same topics
and at the same lengths from 14 current models, across 15 kinds of writing
(news, Wikipedia, arXiv, Stack Exchange, Reddit, reviews, student essays,
non-native English, fiction and literature published 1532-1915). Every number
below is measured on kinds of writing the model was not tuned on.
| | |
|---|---|
| AUC | **0.942** |
| AI texts called "Likely AI" (55+) | 67% |
| Human texts called "Likely AI" (55+) | **1.7%** |
| Human texts flagged at all (45+) | 3.9% |
| Literature published 1532-1915 flagged | **0 of 87** |
The score bands are anchored on that human text: 45 is where the top 5% of
human writing begins, 55 the top 2%, 80 the top 0.5%. So "Likely AI" means
fewer than 2 in 100 human texts score this high.
**Other languages.** Spanish, French, German, Italian, Portuguese, Dutch,
Polish, Russian and Japanese are supported (AUC 0.91 to 0.997); Arabic and
Korean are experimental; Hindi, Turkish and Chinese are not reliable 

### eric-tramel/slop-guard
eric-tramel/slop-guard	168	2026-07-09	MIT	Python	Slop Scoring to Stop Slop

# slop-guard
A rule-based prose linter that scores text 0--100 for formulaic AI writing patterns. No LLM judge, no API calls. Purely programmatic.
The default pipeline loads 24 configurable rules backed by 200+ literal and structural heuristics. It returns a numeric score, a band label, specific violations with surrounding context, and concrete advice for each hit.
## Add to Your Agent
Both clients use the same MCP command: `uvx slop-guard`.
If you want a custom rule JSONL, append `-c /path/to/config.jsonl`.
### Claude Code
Add from the command line:
```bash
claude mcp add slop-guard -- uvx slop-guard
```
Add to your `.mcp.json`:
```json
{
  "mcpServers": {
    "slop-guard": {
      "command": "uvx",
      "args": ["slop-guard"]
    }
  }
}
```
### Codex
Add from the command line:
```bash
codex mcp add slop-guard -- uvx slop-guard
```
Add to your `~/.codex/config.toml`:
```toml
[mcp_servers.slop-guard]
command = "uvx"
args = ["slop-guard"]
```
If you want a fixed release, pin it in `args`, for example: `["slop-guard==0.5.0"]`.
## CLI
The `sg` command lints prose from the terminal. No API keys, no network calls.
### Quick start
```bash
# Run without installing
uvx --from slop-guard sg README.md
# Or install it
uv tool install slop-guard
sg README.md
```
### Usage
```
sg [OPTIONS] INPUT [INPUT ...]
```
`sg` requires at least one input. Each input can be a file path, `-` for stdin, or quoted inline prose text:
```bash
sg "This is some test text"
echo "Latency dropped from 180 ms to 95 ms." | sg -
```
Lint multiple files at once (shell-level glob expansion):
```bash
sg docs/*.md README.md
sg path/**/*.md
```
### Options
| Flag | Description |

### FeedHive/ai-slop-detector
FeedHive/ai-slop-detector	112	2026-10-12	MIT	JavaScript	120 patterns that make writing read like AI slop, with an agent skill for Claude Code and Codex.

# AI Slop Detector
120 patterns that make writing read like AI slop, in 9 categories. Each pattern has a short explanation, a bad example and a plain rewrite.
Give the list to your AI before it writes, or check a draft against it afterwards. To check a draft in your browser, paste it into the free [AI Slop Detector](https://www.feedhive.com/tools/ai-slop-detector).
The list doesn't try to tell whether a person or an AI wrote a text. People write these patterns too, and a model can be told to avoid them. A single pattern is normal in human writing; several in one paragraph is what makes a text read as slop.
## Use it with your AI
**Claude Code, Codex and other agents.** Give the agent this repository and ask it to install the skill:
```text
Install the AI Slop Detector skill from https://github.com/FeedHive/ai-slop-detector
```
Or install it yourself for Claude Code:
```sh
git clone https://github.com/FeedHive/ai-slop-detector.git
cp -r ai-slop-detector/skills/ai-slop-detector ~/.claude/skills/
```
**ChatGPT, Claude and other chat apps.** Paste this README into the chat and ask it to avoid every pattern in what it writes next. To check a draft, paste the README and the draft and ask for every pattern it finds, with the line it found it in.
**Your own tools.** [`patterns.json`](patterns.json) has the full list as structured data. Edit it and run `node scripts/build.mjs` to regenerate this README and the skill.
## Categories
| Category | Patterns |
|---|---|
| [Vocabulary](#vocabulary) | 20 |
| [Stock phrases](#stock-phrases) | 15 |
| [Sentence patterns](#sentence-patterns) | 22 |
| [Structure and rhythm](#structure-and-rhythm) | 12 |
| [Imagery and metaphor](#imagery-and-metaphor) | 6 |
| [Substance](#substance) | 12 |
| [Formatting and punctuation](#formatting-and-punctuation) | 10 |
| [Chatbot residue](#chatbot-residue) | 8 |
| [Social media and LinkedIn](#social-media-and-linkedin) | 15 |
<a id="vocabulary"></a>
## Vocabulary
Words that show up far more often in AI output than in human writing. One is a coincidence; three in a paragraph is a pattern.
<a id="v-01-delve-and-friends"></a>
### V-01 Delve and friends
delve, dive into, deep dive, unpack, explore (for "discuss").
Bad: "Let's delve into the data."  
Better: "Here is what the data shows."
<a id="v-02-tapestry-words"></a>
### V-02 Tapestry words
tapestry, landscape, realm, sphere, ecosystem, fabric (used abstractly).
Bad: "the ever-evolving landscape of marketing."  
Better: "marketing in 2026" or name the actual change.
<a id="v-03-testament-and-beacon"></a>
### V-03 Testament and beacon
testament to, beacon of, embodiment of, hallmark of.
Bad: "The launch is a testament to the team's dedication."  
Better: "The team shipped it in six weeks."
<a id="v-04-pivotal-and-crucial"></a>
### V-04 Pivotal and crucial
pivotal, crucial, vital, paramount, critical (as decoration).
Bad: "plays a pivotal role in growth."  
Better: "drives 40% of signups."
<a id="v-05-showcase-verbs"></a>
### V-05 Showcase verbs
showcase, highlight, underscore, emphasize, spotlight (as commentary verbs).
Bad: "The results underscore the importance of testing."  
Better: "Testing caught three bugs before launch."
<a id="v-06-foster-and-cultivate"></a>
### V-06 Foster and cultivate
foster, cultivate, nurture (applied to abstract things).
Bad: "fostering a culture of innovation."

### gabelul/slopbuster
gabelul/slopbuster	48	2026-07-21	MIT		Strips the AI tells out of prose, code, and academic writing. 152 patterns from real AI-vs-human analysis, two-pass rewrite, three-tier scoring. No API key — a markdown skill that runs on the model you already use.

<p align="center">
</p>
# slopbuster
Strips the AI tells out of prose, code, and academic writing.
I built this because every "humanizer" I found did the same thing: swap "delve" for "explore" and call it a day. That's find-and-replace with a marketing page.
152 patterns, built from analyzing 1,000+ AI vs human samples and peer-reviewed LLM detection research. Two passes — because removing AI patterns without adding voice produces sterile text that's equally detectable, just by a different classifier.
---
## What it does
A real run. The "before" is AI-generated marketing copy written for this demo; the "after" is slopbuster's actual output, scored with the tool's own three-tier system.
**Before — 0/10** (49 pattern points across 230 words = 213 per 1,000):
> In today's rapidly evolving e-commerce landscape, sustainable packaging has emerged as a pivotal consideration for brands seeking to remain competitive. As consumer expectations continue to shift, it's important to note that packaging **serves as** far more 
>
> Let's **delve** into why this matters. Industry **experts argue** that the environmental footprint of fulfillment operations **underscores the importance** of rethinking materials from the ground up […]
>
> Ultimately, sustainable packaging isn't just a trend — it's a **testament** to where the industry is heading. Brands that embrace this shift today will be **well-positioned to thrive in the years to come**.
**After — 8.5/10** (zero Tier 1, 2, or 3 hits):
> Packaging is the first physical thing your customer touches. That's the whole argument, and most sustainability decks bury it somewhere around slide forty.
>
> Fulfillment waste has gotten expensive enough that materials are worth rethinking — not because it photographs well for the annual report, but because shipping air costs money. Consumers do say they prefer brands with credible environmental practices. They
>
> The obstacles are the boring ones. Compostable mailers cost more per unit. Suppliers with real certification are scarce and get booked out. A material that works fine for apparel will not survive a pallet of ceramics.
>
> Start with the SKUs you ship most. You will learn more from re-boxing your top ten products than from a year of vendor presentations.
| Measured | Before | After |
|---|---|---|
| Tier 1 hits (3 pts) | 7 | 0 |
| Tier 2 hits (2 pts) | 8 | 0 |
| Tier 3 hits (1 pt) | 12 | 0 |
| Words | 230 | 173 |
**One honest caveat:** sentence-length variance — one of the three readability
metrics — did *not* discriminate here. The slop sample scored 0.59 CV, well
inside the "good" band, while being obviously machine-written. Pattern
detection did all the work. Reproduce it yourself with `--score-only`.
---
## Install
```bash
npx skills add gabelul/slopbuster
```
One command. Auto-detects your agent, symlinks the skill. Update later with `npx skills update`.
<details>
<summary>Manual install</summary>
```bash
# Claude Code
cp -r slopbuster ~/.claude/skills/
# Codex CLI
cp -r slopbuster ~/.codex/skills/
# Any other agent — copy into your agent's skill directory
cp -r slopbuster /path/to/agent/skills/
```
</details>
## Usage
```bash
/slopbuster blog-post.md                              # auto-detect mode, standard depth
/slopbuster src/ --mode code                           # scan source files for AI patterns
/slopbuster paper.md --mode academic --field biomedical # academic with section awareness
/slopbuster doc.md --depth deep --voice-sample me.md   # calib

### renefichtmueller/slop-radar
renefichtmueller/slop-radar	10	2026-10-03	MIT	TypeScript	🔍 Find AI slop in English and German text: 600+ buzzwords, 16 structural patterns and a 0-100 score. CLI, Node.js library, browser demo and Claude Code skill.

# slop-radar
**Find AI slop in English and German text.** slop-radar flags the buzzwords, filler phrases and formatting habits that make writing read like a chatbot draft, and turns them into a score from 0 to 100.
**[Try the live demo](https://slop-radar-demo.pages.dev)** in your browser. It runs the same engine and phrase database as the CLI.
slop-radar does not try to prove who wrote a text. It measures **AI-style writing**: the phrases and structures that make text generic, whether a model or a person typed them. Use it as a linter for prose.
---
## What it checks
- **437 English and 210 German phrases**: chatbot pleasantries ("I hope this helps"), stock openers ("in today's digital age"), hype ("game changer", "unlock the full potential"), filler connectors ("moreover"), significance inflation ("plays a pivotal role") 
- **16 structural patterns**: "Let me …" starters, "It's not X, it's Y" pivots, "not only … but also" contrasts, em-dash chains, emoji headers, bullet overload, bold numbered lists, passive-voice density and more.
- **Buzzword density**: a short text packed with buzzwords loses extra points.
Matching is built for everyday text, not just exact copies of the list:
| Case | Example |
|---|---|
| Case-insensitive, Unicode word boundaries | `Leverage` matches, `leveragement` does not |
| Typographic quotes | `here’s the thing` matches `here's the thing` |
| German umlaut spellings | `außergewöhnlich` and `aussergewoehnlich` match the same entry |
| German inflections | `maßgeschneiderte Lösungen`, `einer entscheidenden Rolle` |
| English plural / third person | `stakeholders`, `unlocks` |
| Loose separators | `dive, deep` matches `dive deep` |
| Longest match wins | `a myriad of` counts once, not three times |
## Score
| Score | Rating | Meaning |
|-------|--------|---------|
| 90-100 | HUMAN | Clean, natural writing |
| 70-89 | MOSTLY CLEAN | Minor AI signals |
| 50-69 | SUSPICIOUS | Multiple AI patterns found |
| 30-49 | LIKELY AI | Strong AI writing signals |
| 0-29 | PURE SLOP | Heavy buzzword and pattern use |
---
## Install
```bash
npm install -g slop-radar
```
or run it without installing:
```bash
npx slop-radar check essay.md
```
Requires Node.js 18 or newer. To work on the code, clone the repository, run `npm install` (it builds automatically) and `npm test`.
## CLI
```bash
slop-radar essay.md                  # full report (same as: slop-radar check essay.md)
slop-radar score article.txt         # score and rating only
slop-radar json draft.md             # machine-readable JSON, e.g. for CI
cat text.md | slop-radar             # read from stdin
cat text.md | slop-radar score
```
```
--lang en|de|auto    Force the language (default: auto-detect)
--help               Show help
--version            Show version
```
Colors are used only when writing to a terminal. Set `NO_COLOR=1` to turn them off, `FORCE_COLOR=1` to force them.
## Library
```typescript
import { detect, score } from "slop-radar";
const detection = detect("This transformative journey leverages cutting-edge innovation.", "en");
const result = score(detection);
console.log(result.score);   // 92
console.log(result.rating);  // "HUMAN"
console.log(detection.phraseMatches.map((m) => m.phrase));
// [ "leverage", "cutting-edge", "transformative", "journey" ]

### sam-paech/slop-forensics
sam-paech/slop-forensics	374	2025-11-01	MIT	Jupyter Notebook

# Slop Forensics Toolkit
A toolkit for generating & analyzing "slop" — over-represented lexical patterns — in LLM outputs.
### 🧬 Dataset Generation
Generate a standardised set of outputs from several models for downstream analysis.
### 🔍 Slop Profiling
Analyze a model's outputs for repetitive words, bigrams, trigrams, vocabulary complexity, and slop scores.
### 🧪 Slop List Creation  
Aggregate findings across models to build canonical slop lists of of over-represented words and phrases.
### 🌳 Phylogenetic Tree Building  
Cluster models based on slop profile similarity using parsimony (PHYLIP) or hierarchical clustering.
--- 
## Example Notebook
https://colab.research.google.com/drive/1SQfnHs4wh87yR8FZQpsCOBL5h5MMs8E6?usp=sharing
![image](https://github.com/user-attachments/assets/29a81001-a611-4bf9-b472-ff3c4697cb49)
## Table of Contents
1. [Prerequisites & Installation](#prerequisites--installation)  
2. [Project Structure](#project-structure)  
3. [Configuration / Environment Setup](#configuration--environment-setup)  
4. [Usage](#quickstart-usage)  
   - [1. Generate Dataset](#1-generate-dataset)  
   - [2. Analyze Outputs & Profile Slop](#2-analyze-outputs--profile-slop)  
   - [3. Create Slop Lists](#3-create-slop-lists)  
   - [4. Generate Phylogenetic Trees](#4-generate-phylogenetic-trees)  
5. [How it Works](#how-the-analysis-works)
6. [License](#license)  
7. [Contact](#contact)
---
## Prerequisites & Installation
1. **Python 3.7+**  
2. The required Python dependencies are listed in `requirements.txt`. Install them via:
   ```bash
   pip install -r requirements.txt
   ```
3. **PHYLIP** (optional)  
   - PHYLIP is required if you want to run the phylogenetic/parsimony analysis.  
   - On Debian/Ubuntu: 
     ```bash
     sudo apt-get install phylip
     ```
   - Or build from source.  
   - Make sure the `pars` and `consense` executables are in your `PATH` or specify `PHYLIP_PATH` in `.env`.
4. **NLTK data** (recommended):  
   We use `punkt`, `punkt_tab`, `stopwords`, and `cmudict` for parts of the analysis. Download via:
   ```python
   import nltk
   nltk.download('punkt')
   nltk.download('punkt_tab')
   nltk.download('stopwords')
   nltk.download('cmudict')
   ```
---
## Project Structure
```
slop-forensics/
  ├─ scripts/
  │   ├─ generate_dataset.py
  │   ├─ slop_profile.py
  │   ├─ create_slop_lists.py
  │   ├─ generate_phylo_trees.py
  │   └─ ...

### sam-paech/auto-antislop
sam-paech/auto-antislop	210	2026-07-29	-	Python

# Auto-Antislop
Auto-Antislop is an automated pipeline which takes a model and does the following:
1. Generates a baseline dataset on a set of prompts that you specify
2. Identifies the model's slop (over-represented words, phrases & n-grams)
3. Using [antislop-vllm](https://github.com/sam-paech/antislop-vllm) generates a preference dataset for fine-tuning
4. Fine tunes the model on the generated preference dataset using a novel trainer (FTPO: final token preference optimisation)
Paper: [https://arxiv.org/abs/2510.15061](https://arxiv.org/abs/2510.15061)
<strong>Table of Contents</strong>
- [Quickstart](#-quickstart)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [How It Works (Pipeline Flow)](#-how-it-works-pipeline-flow)
- [FTPO Explained](#-ftpo-explained)
- [Output Structure](#-output-structure)
- [Post-Finetuning: Testing the Model](#-post-finetuning-testing-the-model)
- [Submodules](#-submodules)
- [Notes & Troubleshooting](#-notes--troubleshooting)
- [Citation](#-citation)
## Quickstart
```bash
# creates a venv, installs auto-antislop and runs an end-to-end unslop of gemma-3-4b-it
git clone https://github.com/sam-paech/auto-antislop.git --recurse
conda create -n antislop python=3.11 -y
conda activate antislop
cd auto-antislop
pip install "torch==2.8.*"
pip install -r requirements.txt
pip install vllm
python main.py -c configs/gemma-3-4b-it.yaml
```
## Installation
1.  **Prerequisites:**
    *   Python 3.9+
    *   NVIDIA GPU with CUDA installed (for vLLM and finetuning).
    *   Git.
2.  **Clone the Repository (with submodules):**
    ```bash
    git clone --recurse-submodules https://github.com/your-username/auto-antislop.git
    cd auto-antislop
    ```
    If you've already cloned without submodules, run:
    ```bash
    git submodule update --init --recursive
    ```
3.  **Install Dependencies:**
    *Preferably do this in a venv! Unsloth likes to install its own required dep versions, including torch.*
    ```bash
    pip install -r requirements.txt
    ```
    *   **Note on vLLM & Torch:** `vllm` and `torch` are listed in `requirements.txt` but commented out. It's often best to install versions compatible with your specific CUDA setup.
        *   If you plan to use the `--manage-vllm` feature, install `vllm` (e.g., `pip install vllm`).
        *   Ensure PyTorch is installed with CUDA support (see [pytorch.org](https://pytorch.org/)).
4.  **NLTK Data:**
    The script will attempt to download necessary NLTK resources (`punkt`, `punkt_tab`, `stopwords`) on first run. If this fails due to network issues, you might need to download them manually:
    ```python
    import nltk
    nltk.download('punkt')
    nltk.download('punkt_tab') # For NLTK 3.9+
    nltk.download('stopwords')

### sam-paech/antislop-sampler
sam-paech/antislop-sampler	360	2026-03-05	Apache-2.0	Python

# AntiSlop Sampler
## Overview
The AntiSlop sampler uses a backtracking mechanism to go back and retry with adjusted token probabilities when it encounters a disallowed word or phrase. No more testaments or tapestries or other gpt-slop.
Try the sampler here: 
- [Backtracking visualisation notebook](https://colab.research.google.com/drive/1tHS3tHXbZ5PWOsP-Mbk8oK35y6otBZUn?usp=sharing)
- [Generate example notebook](https://colab.research.google.com/drive/1Rd3V4AN31cDytfmY9u80rzHXPD_dS6x9?usp=sharing)
### How to use the sampler
<b>With koboldcpp (new!)</b>
Koboldcpp now includes antislop phrase banning in their latest release:
https://github.com/LostRuins/koboldcpp/releases/tag/v1.76
<b>With a local chat UI (open-webui):</b>
<details>
<summary>[Click to view instructions]</summary>
### if you want to run in an isolated environment (note: open-webui requires python 3.11):
```bash
sudo apt install python3.11 python3.11-venv
python3.11 -m venv open-webui
source open-webui/bin/activate
```
### install open-webui
```bash
pip install open-webui
open-webui serve
```
### start the openai compatible antislop server:
```bash
git clone https://github.com/sam-paech/antislop-sampler.git && cd antislop-sampler
pip install fastapi uvicorn ipywidgets IPython transformers bitsandbytes accelerate
python3 run_api.py --model unsloth/Llama-3.2-3B-Instruct --slop_adjustments_file slop_phrase_prob_adjustments.json
```
### configure open-webui
- browse to http://localhost:8080
- go to admin panel --> settings --> connections
- set the OpenAI API url to http://0.0.0.0:8000/v1
- set api key to anything (it's not used)
- click save (!!)
- click the refresh icon to verify the connection; should see a success message
Now it should be all configured! Start a new chat, select the model, and give it a try.
Note: Only some of the settings in the chat controls will be active. Those are:
- stream chat response
- temperature
- top k
- top p
- min p
- max tokens
![image](https://github.com/user-attachments/assets/8bcc2906-b1e1-4be0-b01b-66cf1b18a9ad)
</details>
Here it is in action (in slow mode so you can see its backtracking & revisions):
https://github.com/user-attachments/assets/e289fb89-d40c-458b-9d98-118c06b28fba
### Disclaimers:
It's recommended that you roll your own slop list! The slop_phrase_prob_adjustments.json file is mostly auto-generated by computing over-represented words in a large LLM-generated story dataset. As such, it's not well optimised or curated. Curated lists will b
The api is very minimalist, and doesn't support concurrency. It's more geared for local use, testing & dataset generation than for production.
This is research grade code. Meaning it probably contains bugs & is a work in progress.
### 2024-10-13 Update
The main changes are:
- Switched to string matching instead of token matching (it's more robust)
- Added regex matching/banning
The new regex_bans parameter accepts a list of regex patterns. These will be evaluated during inference, and if one of them matches, we backtrack to the first token of the matched string. From there, we ban the matched continuation and continue inference.
This allows more freedom for enforcing constraints than phrase matching alone. For instance, we can prevent over-used phrasing like "not x, but y". Note that streaming is not supported when using regex bans, since we can't predict how far back we may need to b
<details>

### locuslab/llm-idiosyncrasies
locuslab/llm-idiosyncrasies	65	2025-07-21	MIT	Python	Code release for "Idiosyncrasies in Large Language Models"

# Idiosyncrasies in Large Language Models
Official code of Idiosyncrasies in Large Language Models
> [**Idiosyncrasies in Large Language Models**](https://arxiv.org/abs/2502.12150) </br>
> *[Mingjie Sun](https://eric-mingjie.github.io)\*, [Yida Yin](https://davidyyd.github.io)\*, [Zhiqiu Xu](https://oscarxzq.github.io), [J. Zico Kolter](https://zicokolter.com), [Zhuang Liu](https://liuzhuang13.github.io)* (* indicates equal contribution) <br>
> Carnegie Mellon University, UC Berkeley, University of Pennsylvania, and Princeton University<br>
>[[Paper]](https://arxiv.org/abs/2502.12150) [[Project page]](https://eric-mingjie.github.io/llm-idiosyncrasies/index.html)
```bibtex
@article{sun2025idiosyncrasies,
    title    = {Idiosyncrasies in Large Language Models}, 
    author   = {Sun, Mingjie and Yin, Yida and Xu, Zhiqiu and Kolter, J. Zico and Liu, Zhuang},
    year     = {2025},
    journal  = {arXiv preprint arXiv:2502.12150}
}
```
--- 
<p align="center">
class="center">
</p>
We study idiosyncrasies in Large Language Models (LLMs) -- unique patterns in their outputs. We consider a simple classification task: given a particular text output, a neural network is trained to predict the source LLM that generates that text.
## Results and Pre-trained Models
We provide four [LLM2vec](https://arxiv.org/abs/2404.05961) classifiers, each trained on responses generated by a specific LLM group using prompts from the UltraChat dataset. The LLM groups are:
 - chat APIs: ChatGPT, Claude, Grok, Gemini, and DeepSeek
 - instruct LLMs: Llama3.1-8b-it, Gemma2-9b-it, Qwen2.5-7b-it, and Mistral-v3-7b-it
 - base LLMs: Llama3.1-8b, Gemma2-9b, Qwen2.5-7b, and Mistral-v3-7b
 - ten models: five chat APIs + Phi-4 + four instruct LLMs
| name | accuracy | model |
|:---:|:---:|:---:|
| chat APIs classifier | 97.1 | [model](https://huggingface.co/Yida/classifier_chat) |
| instruct LLMs classifier | 95.9 | [model](https://huggingface.co/Yida/classifier_instruct) |
| base LLMs classifier | 87.6 | [model](https://huggingface.co/Yida/classifier_base) |
| ten models classifier | 91.9 | [model](https://huggingface.co/Yida/classifier_ten_models) |
## Pre-generated Responses
We host a collection of pre-generated responses using prompts from UltraChat dataset for Chat APIs, Instruct LLMs, and Base LLMs.
| | ChatGPT | Claude | Grok | Gemini | DeepSeek | Phi-4 |
| :-- | :--: | :--: | :--: | :--: | :--: | :--: |
| links | [download](https://drive.google.com/file/d/1O1dEROw21KePNMF9ewlkXkkzL8Z-5qrN/view?usp=sharing) | [download](https://drive.google.com/file/d/1sifL_hsFiSDKZgnEeahiT20wPW8NDmRG/view?usp=sharing) | [download](https://drive.google.com/file/d/1yUA-8RYYXIkS
| | Llama3.1-8b-it | Gemma2-9b-it | Qwen2.5-7b-it | Mistral-7b-v3-it |
| :-- | :--: | :--: | :--: | :--: |
| links |[download](https://drive.google.com/file/d/1JuT1UpCw6ijDIgYSa2JM1AmDcSTxrTLu/view?usp=sharing) | [download](https://drive.google.com/file/d/1gw_z-XsUHSip71qkHdoM4SnpflwcM_g_/view?usp=sharing) | [download](https://drive.google.com/file/d/1EnVOL4WhxU3-h
| | Llama3.1-8b | Gemma2-9b | Qwen2.5-7b | Mistral-7b-v3 |
| :-- | :--: | :--: | :--: | :--: |
| links |[download](https://drive.google.com/file/d/1b37J7btQ1jFhs0bwfUPpXRzxp5Yxm_eS/view?usp=sharing) | [download](https://drive.google.com/file/d/1o3TTBxOBaytFKyGf6D7T5b8iCH-0kwLu/view?usp=share_link) | [download](https://drive.google.com/file/d/1py9tJBpZaZ
## Setup
Installation instructions can be found in [INSTALL.md](INSTALL.md).
## Evaluation
We give an e

### ahans30/Binoculars
ahans30/Binoculars	439	2024-05-14	BSD-3-Clause	Python	[ICML 2024] Binoculars: Zero-Shot Detection of LLM-Generated Text

<p align="center">
</p>
We introduce Binoculars, a state-of-the-art method for detecting AI-generated text. Binoculars is a
zero-shot and domain-agnostic (requires no training data) method. It is based on a simple idea: most
decoder-only, causal language models have a huge overlap in pretraining datasets, for e.g. Common Crawl, Pile, etc.
More details about the method and results can be found in our paper **Spotting LLMs with Binoculars: Zero-Shot
Detection of Machine-Generated Text**.
## Getting Started
### Installation
To run the implementation of Binoculars, you can clone this repository and install the package using pip. This code was
developed and tested on Python This code was developed and tested with Python 3.9. To install the package, run the
following commands:
```bash
$ git clone https://github.com/ahans30/Binoculars.git
$ cd Binoculars
$ pip install -e .
```
### Usage
Please note, this implementation comes with a fixed global threshold that is used to classify the input as AI-generated
or not. This threshold is selected using _Falcon-7B_ and _Falcon-7B-Instruct_ models for scoring. If you want to
use different scoring models, you can pass it as an argument to the `Binoculars` class. Please read the paper for more
details about the Binoculars work.
To detect AI-generated text, please use the following code snippet:
```python
from binoculars import Binoculars
bino = Binoculars()
# ChatGPT (GPT-4) output when prompted with “Can you write a few sentences about a capybara that is an astrophysicist?"
sample_string = '''Dr. Capy Cosmos, a capybara unlike any other, astounded the scientific community with his 
groundbreaking research in astrophysics. With his keen sense of observation and unparalleled ability to interpret 
cosmic data, he uncovered new insights into the mysteries of black holes and the origins of the universe. As he 
peered through telescopes with his large, round eyes, fellow researchers often remarked that it seemed as if the 
stars themselves whispered their secrets directly to him. Dr. Cosmos not only became a beacon of inspiration to 
aspiring scientists but also proved that intellect and innovation can be found in the most unexpected of creatures.'''
print(bino.compute_score(sample_string))  # 0.75661373
print(bino.predict(sample_string))  # 'Most likely AI-Generated'
```
In the above code, user can also pass a `list` of `str` to `compute_score` and `predict` methods to get results for
the entire batch of samples.
### Demo
We have also made a demo available to predict AI-generated text interactively with a simple UI
using [gradio](https://github.com/gradio-app/gradio). You can run the demo using the following command:
```bash
$ python app.py
```
## Limitations
All AI-generated text detectors aim for accuracy, but none are perfect and can have multiple failure modes (e.g.,
Binoculars is more proficient in detecting English language text compared to other languages). This implementation is
for academic purposes only and should not be considered as a consumer product. We also strongly caution against using
Binoculars (or any detector) without human supervision.
## Cite our work
If you find this work useful, please cite our paper:
```bibtex
@misc{hans2024spotting,
      title={Spotting LLMs With Binoculars: Zero-Shot Detection of Machine-Generated Text}, 
      author={Abhimanyu Hans and Avi Schwarzschild and Valeriia Cherepanova and Hamid Kazemi and Aniruddha Saha and Micah Goldblum and Jonas Geiping and Tom Gold

### baoguangsheng/fast-detect-gpt
baoguangsheng/fast-detect-gpt	442	2026-02-07	MIT	Python	Code base for ICLR 2024 "Fast-DetectGPT: Efficient Zero-Shot Detection of Machine-Generated Text via Conditional Probability Curvature".

# Fast-DetectGPT
**This code is for ICLR 2024 paper "Fast-DetectGPT: Efficient Zero-Shot Detection of Machine-Generated Text via Conditional Probability Curvature"**, where we borrow or extend some code from [DetectGPT](https://github.com/eric-mitchell/detect-gpt).
[Paper](https://arxiv.org/abs/2310.05130) 
| [LocalDemo](#local-demo)
| [OnlineDemo](https://fastdetect.net/)
| [OpenReview](https://openreview.net/forum?id=Bpcgcr8E8Z)
* 1/31/2026: We find that Fast-DetectGPT with Llama3-8B/Llama3-8B-Instruct as the sampling/scoring models substantially outperforms falcon-7b/falcon-7b-instruct, especially on LRM-generated texts. We provide the demo online.
* 9/13/2025: We have recover the demo at https://fastdetect.net.
* :fire: API support is launched. Please check the [API page](https://fastdetect.net/#/apidoc) in the demo.
* :fire: Fast-DetectGPT can utilize GPT-3.5 and other proprietary models as its scoring model now via [Glimpse](https://github.com/baoguangsheng/glimpse).
* :fire: Llama3-8B/Llama3-8B-Instruct > falcon-7b/falcon-7b-instruct >> gpt-j-6B/gpt-neo-2.7B, as the sampling/scoring models.
## Brief Intro
<table class="tg"  style="padding-left: 30px;">
  <tr>
    <th class="tg-0pky">Method</th>
    <th class="tg-0pky">5-Model Generations ↑</th>
    <th class="tg-0pky">ChatGPT/GPT-4 Generations ↑</th>
    <th class="tg-0pky">Speedup ↑</th>
  </tr>
  <tr>
    <td class="tg-0pky">DetectGPT</td>
    <td class="tg-0pky">0.9554</td>
    <td class="tg-0pky">0.7225</td>
    <td class="tg-0pky">1x</td>
  </tr>
  <tr>
    <td class="tg-0pky">Fast-DetectGPT</td>
    <td class="tg-0pky">0.9887 (relative↑ <b>74.7%</b>)</td>
    <td class="tg-0pky">0.9338 (relative↑ <b>76.1%</b>)</td>
    <td class="tg-0pky"><b>340x</b></td>
  </tr>
</table>
The table shows detection accuracy (measured in AUROC) and computational speedup for machine-generated text detection. The <b>white-box setting</b> (directly using the source model) is used for detecting generations produced by five source models (5-model), wh
setting</b> (utilizing surrogate models) targets ChatGPT and GPT-4 generations. AUROC results are averaged across various datasets and source models. Speedup assessments were conducted on a Tesla A100 GPU.
## Environment
* Python3.8
* PyTorch1.10.0
* Setup the environment:
  ```bash setup.sh```
(Notes: our experiments are run on 1 GPU of Tesla A100 with 80G memory.)
## Local Demo
Please run following command locally for an interactive demo:
```
python scripts/local_infer.py
```
where the default sampling and scoring models are both gpt-neo-2.7B.
We could use gpt-j-6B as the sampling model to obtain more accurate detections:
```
python scripts/local_infer.py  --sampling_model_name gpt-j-6B
```
An example (using gpt-j-6B as the sampling model) looks like
```
Please enter your text: (Press Enter twice to start processing)
Disguised as police, they broke through a fence on Monday evening and broke into the cargo of a Swiss-bound plane to take the valuable items. The audacious heist occurred at an airport in a small European country, leaving authorities baffled and airline offici
Fast-DetectGPT criterion is 1.9299, suggesting that the text has a probability of 82% to be machine-generated.
```
## Workspace
Following folders are created for our experiments:
* ./exp_main -> experiments for 5-model generations (main.sh).
* ./exp_gpt3to4 -> experiments for GPT-3, ChatGPT, and GPT-4 generations (gpt3to4.sh).

### ssharoff/biberpy
ssharoff/biberpy	43	2026-05-24	GPL-3.0	Lex	Python version for Doug Biber's Multidimensional Analysis (MDA)

# Multilingual Python version for Biber's Multi-Dimensional Analysis (MDA)
This is a Python script for extracting Biber-like features for English, French, Russian and Spanish as well as R scripts for Multi-Dimensional Analysis.
Back in 1988 Douglas Biber developed an approach to analysing the composition of a corpus by using a set of extractable features followed by factor analysis, see his first book on the topic:
[https://books.google.co.uk/books?id=CVTPaSSYEroC]
An article-length description is available from [http://www.aclweb.org/anthology/J93-2001]
While this approach is more than 30-years old by now, his attention to designing extractable features is still important for understanding how linguistic features vary in texts of different kinds, so that that we can explain the behaviour of Large Language Mod
```
@Article{sharoff2021registerstudies,
  author = {Sharoff, Serge},
  title =  {Genre Annotation for the Web: text-external and text-internal perspectives},
  journal = {Register studies},
  year =   2021,
  volume = 3,
  issue = 1,
  doi = {https://doi.org/10.1075/rs.19015.sha}
```
[https://ssharoff.github.io/publications/2021-register.pdf]
## Biber features
The features proposed by Biber and implemented in my tagger include:
* Lexical features, such as:
  * publicVerbs = *acknowledge, admit, agree, assert, claim, complain, declare, deny...*
  * timeAdverbials  = *afterwards, again, earlier, early, eventually, formerly, immediately,...*
  * amplifiers = *absolutely, altogether, completely, enormously, entirely,...*
* Part-of-speech features, such as:
  * Nominalisations (nouns ending in *-tion, -ness, -ment*)
  * Prepositions
  * Past tense verbs
* Syntactic features, such as:
  * *be* as the main verb
  * *that* deletions
  * pied piping (as in *Which house did she buy?* where *house* moved from its expected position after *buy*)
* Text-level features, such as:
  * Average word length
  * Average sentence length
  * Type/token ratio
In our Intellitext project (2011-2012) we have implemented these features in a [Web interface to corpora](http://corpus.leeds.ac.uk/it/) in Perl, see:
```
@inproceedings{wilson10paclic,
  title={Advanced corpus solutions for humanities researchers},
  author={Wilson, James and Hartley, Anthony and Sharoff, Serge and Stephenson, Paul},
  booktitle={Proc PACLIC 24},
  pages={36--43},
  month={November},
  address={Tohoku University},
  year={2010}
}
```
[http://www.aclweb.org/anthology/Y10-1089]
Since then, I ported the feature extractor from Perl to Python to help with my research on text classification.  Also I have ported the available word lists to French and Russian, and Gonzalo Cruz has done this for Spanish, so that the Biber dimensions of vari
The arguments for the script are self-explanatory (run `python3 biber-dim.py -h`).  A typical invocation would be:
`python3 biber-dim.py -l en <brown.ol >brown.dat`
The default format for the corpus file is one line per document with lemmas and POS tags coming from a dictionary.  It is also possible to achieve better accuracy by using a JSON file with the output of a POS tagger. For example, the JSON file can be produced 
`./spacy2json.py brown.ol en_core_web_lg >brown.json`
`python3 biber-dim.py -f json -l en <brown.json >brown-json.dat`
or in a bit more complicated way from UDPipe (by converting CONLL to JSON):
`udpipe --tokenize --tag english-ewt.udpipe <brown.ol | restoredocids.py | conll2json.py >brown.json`
`python3 biber-dim.py -f json -l en <bro

### aplaceforallmystuff/the-antislop
aplaceforallmystuff/the-antislop	38	2026-10-15	MIT	Shell	A Claude Code skill that detects and fixes AI-generated writing patterns. 35+ patterns, tiered scoring, editor mode.

# The Antislop
*Detect and fix AI-generated writing patterns (slop).*
![The Antislop](docs/images/architecture-diagram.png)
A Claude Code skill that detects and **fixes** AI-generated writing patterns. More comprehensive than detection alone — it actually rewrites the problems.
## Why
AI-generated text has tells. Wikipedia's [Signs of AI Writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) documents 24 patterns. But detection alone isn't enough. You need a tool that:
1. **Detects comprehensively** — 35+ patterns across content, language, style, and structure
2. **Scores severity** — Not all patterns are equally bad (tiered system)
3. **Actually fixes problems** — Editor mode rewrites, not just flags
4. **Catches structural tells** — Staccato fragments, manufactured personality, uniformity
## Install
```bash
# In Claude Code:
/plugin marketplace add aplaceforallmystuff/marketplace
/plugin install the-antislop@aplaceforallmystuff
```
<details>
<summary>Manual install (without the marketplace)</summary>
```bash
mkdir -p ~/.claude/skills
git clone https://github.com/aplaceforallmystuff/the-antislop.git ~/.claude/skills/the-antislop
```
</details>
## Use cases
- Use it when a draft "sounds like AI" and you want the specific tells named and fixed.
- Use it as a final pass before publishing any AI-assisted content.
- Use it to humanize AI-generated text — cut Tier 1 phrases, break up staccato fragments, vary sentence rhythm.
- Use it to check a draft against the Horoscope Test before it goes out under your byline.
- Use it to audit without editing — request "audit only" when you just want the slop score.
## How it works
1. **Run the Horoscope Test** — Could anyone have written this for anyone?
2. **Scan for patterns** — 45+ known AI tells across 6 categories
3. **Calculate slop score** — Tiered severity with quantifiable scoring
4. **Apply fixes** — Editor mode rewrites problems, not just flags them
5. **Report changes** — Before/after for every fix applied
## The Horoscope Test
> "Could anyone have written this, for anyone?"
If yes, it's slop. Like a horoscope — technically applicable to everyone, resonant with no one.
## Detection Categories
### Tier 1: Remove Immediately
- delve, game-changer, revolutionary, leverage, unlock potential
- "it's worth noting," "in today's digital landscape"
- moreover, furthermore, cutting-edge
### Tier 2: Suspicious When Repeated
- here's the thing, at the end of the day, the bottom line
- paired adjectives ("comprehensive and thorough")
- template openings ("In this post, we'll cover...")
### Tier 3: Watch for Clusters
- transition words (however, firstly, moving forward)
- corporate buzzwords (robust, seamless, scalable)
### Structural Patterns (Often Missed)
- **Staccato fragments:** "Short. Punchy. Exhausting."
- **Sentence uniformity:** Every sentence 10-15 words
- **Comparator sentences:** "This isn't X. It's Y."
- **Manufactured personality:** Fake developer snark
- **Self-promotional framing:** Author's achievements as headline
## Scoring System
| Pattern Type | Points |
|--------------|--------|
| Tier 1 phrase | +3 |
