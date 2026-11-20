# Research: labelling conversations, sales stages, and linking people

Read on 2026-11-20 from arXiv. Each entry says what the work does, what it found, and what it means for log.

## Labelling with small local models

- **SetFit: Efficient Few-Shot Learning Without Prompts** (arXiv 2209.11055). Fine-tunes a small sentence-embedding model on a few labelled pairs (contrastive), then a classification head. Comparable accuracy to much larger models with orders of magnitude fewer parameters, no prompts. For log: the labeller can be the MiniLM log already ships, trained on a handful of examples per label, running on the CPU in milliseconds.
- **Knowledge Distillation in Automated Annotation** (arXiv 2406.17633). Across 14 classification tasks, small classifiers fine-tuned on GPT-4 labels perform close to ones fine-tuned on human labels. For log: a large model labels the 540 chats once and the small one learns from it.
- **Feeding LLM Annotations to BERT Classifiers at Your Own Risk** (arXiv 2504.15432). Training only on LLM labels lowers accuracy, raises instability across runs and plateaus early; entropy filtering and ensembles help only partly. For log: keep the owner's own labels as ground truth and drop teacher labels it was unsure of.
- **Prompt Candidates, then Distill (CanDist)** (arXiv 2506.03857). Let the large model give every label it is unsure between, then distil to a small model; better than forcing one label on hard samples.
- **LLM on a Budget: Active Knowledge Distillation** (arXiv 2511.11574). Ask the expensive teacher only about samples the student is unsure of (uncertainty sampling with randomised accept/reject), at a fraction of the cost.
- **GLiClass** (arXiv 2508.07662). A small, fast zero-shot classifier that takes many labels at once. For log: a day-one labeller before any training.
- **APE: active learning for few-shot examples** (arXiv 2408.04637). Pick the most ambiguous examples for a person to label, then use them as the examples.

## Sales stages and what to do next

- **Learning When to Quit in Sales Conversations** (arXiv 2511.01181). A language-model agent learnt when to stop a conversation from a retrospectively inferred optimal stopping policy: 54% less time on failed calls, nearly all sales kept (a large European telecom).
- **Rethinking Sales Lead Scoring with LLM-based Hierarchical Preference Ranking** (arXiv 2606.04387). Rule scorecards fail on multi-stage funnels; ranking leads by priority from the conversation text plus structured fields beats them.
- **Towards Personalized Conversational Sales Agents (CSALES)** (arXiv 2504.08754). The agent infers the buyer's profile during the conversation and picks its next move from it; higher recommendation and persuasion success.
- **AI-Salesman** (arXiv 2511.12133). A script library gives turn-by-turn strategy; plain LLMs are strategically brittle and make things up over many turns.
- **Selling in the Wild (Javo)** (arXiv 2610.25461). A sales agent fine-tuned on 4.6M real commercial conversations: +21.6% conversion over a frontier model with the same tools in a 14.8M-visitor field trial, and on par with human associates. Learning from real conversations that closed beats a stronger general model.
- **How Much Does Persuasion Strategy Matter?** (arXiv 2604.19783). Over 10,600 persuader turns: guilt lowers giving by about 23 points; reciprocity is the strongest positive; the other person's sentiment and interest predict the outcome.

## Linking one person's accounts

- **User Identity Linkage on Social Networks: A Review** (arXiv 2409.08966). Linkage uses profile, content and network signals together; no single one is enough.
- **Digital Stylometry: Linking Profiles Across Social Networks** (arXiv 1605.05166). Writing style plus activity times matched 31% of 5,612 users across Twitter and Facebook from text alone: useful evidence, never proof.
- **Entity Resolution in Practice** (arXiv 2607.26298). No one matcher wins everywhere; precision needs hard rule vetoes and recall needs wider candidate search; one false link can chain unrelated records together, so every merge across groups must be re-verified.
- **Structured multi-step reasoning for entity matching** (arXiv 2511.22832). An LLM that lists matching and differing tokens, then the attributes that decide, then the verdict, matches more reliably than one prompt.
- **In-context clustering for entity resolution** (arXiv 2506.02509). Clustering records in context with an LLM is cheaper than pairwise prompts.

## What the research says to do, in order

1. Split "who" from "where" and let the owner define the stages; label 30-40 chats himself, chosen by active learning.
2. A large model (SubQ) labels every chat, giving candidate labels when unsure; the unsure ones go to the owner.
3. Train a small local labeller (SetFit on the shipped MiniLM) on his labels plus the confident teacher labels; it runs on every new message. A zero-shot classifier covers day one.
4. Add writing style, activity times and in-chat mentions ("my insta is …") as new comparisons in Fellegi-Sunter linking, keep hard vetoes, never chain links without re-checking, and the owner still says yes.
5. Later: learn which moves moved people forward from conversations that reached a deal (Javo, CSALES, when-to-quit).
