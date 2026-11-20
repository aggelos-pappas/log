# Research: writing like one person from their own messages

Read on 2026-11-20 from arXiv and GitHub. Each entry says what the work does, what it found, and what it means for log.

## Retrieval with author features and contrastive examples

**Improving RAG for Personalization with Author Features and Contrastive Examples** (Yazan, Verberne, Situmeang; arXiv 2504.08745, March 2025; code: github.com/myazann/AP-Bots).
- Adds to the retrieved past samples a few sentences of the author's measured features (the words they use most, named entities, dependency patterns, sentiment), and **contrastive examples**: texts by other authors, so the model sees what makes this author different.
- "A single sentence providing which words an author utilizes the most combined with contrastive examples can improve the RAG performance by 15%" over baseline RAG, training-free.
- For log: the voice index already holds his replies, his word pairs are his most-used words, and other people's lines in his chats plus the AI-tells list are ready-made contrastive examples.

## In-context imitation of everyday writers is hard

**Catch Me If You Can? Not Yet: LLMs Still Struggle to Imitate the Implicit Writing Styles of Everyday Authors** (Wang, Park et al., Stony Brook; arXiv 2509.14543, September 2025).
- Over 40,000 generations per model and 400+ real authors, judged by an ensemble: authorship attribution, authorship verification, style matching and AI detection.
- LLMs approximate structured styles (news, email) from a few samples but **struggle with informal writing (forums, blogs)**; more demonstrations help only so far.
- For log: DMs are the hard case. Few-shot alone won't close the gap; retrieval of the closest real replies, his measured features, and a check that grades by authorship are needed together. Their ensemble of four metrics is a defined version of what the gate does by feel.

## Training-free authorship checks

**How Well Do LLMs Imitate Human Writing Style?** (Jemama, Kumar; arXiv 2509.24930, IEEE UEMCON 2025; code: github.com/rajeshjnu2006/writing-style-uemcon2025).
- A fast, training-free framework for authorship verification and style-imitation analysis.
- For log: a defined authorship score can replace stacked thresholds, calibrated on his own held-out messages.

## Style as a vector inside a small model

**Personalized Text Generation with Contrastive Activation Steering (StyleVector)** (arXiv 2503.05213, March 2025).
- Represents a user's style as a vector in the model's activation space (his texts against generic texts) and adds it during generation. No retrieval, no training; 8% relative improvement, 1700× less storage than per-user fine-tuning.
- Limitation they name: one vector can mix several style traits and some content.

**From Profiles to Steering Vectors: GLASS** (Chen et al.; arXiv 2607.21620, June 2026; code: github.com/zzFestinaLente/GLASS).
- Sparse-autoencoder global style prior plus local contrastive vectors per kind of situation; beats retrieval-, fine-tuning- and steering-based baselines on LaMP and LongLaMP, training-free.

**On the Limits of Steering Vectors for Preference-Aligned Generation** (arXiv 2607.01802).
- Steering vectors generalise unevenly across traits, tasks and combinations of traits.

**Training-Free Token-Level Steering for LLM Personalized Co-Writing (SteerWriter)** (arXiv 2608.06069).
- Token-level steering as an alternative where retrieval can't steer fine-grained wording.

For log: steering needs access to a model's activations (llama.cpp control vectors or a Python runtime), so it is a second step after retrieval.

## Critique and refine

**Iterative Critique-Refine Framework for Enhancing LLM Personalization (PerFine)** (arXiv 2510.24469).
- Training-free: generate, critique against the user's profile, refine, repeat. Retrieval-only outputs "drift in tone, topic, or style"; profile-grounded feedback pulls them back.
- For log: a failed draft should come back with the fix (which words, his nearest phrasing), and one automatic refine round should run before the agent sees a fail.

## On-device retrieval

**MeMemo: On-device Retrieval Augmentation for Private and Personalized Text Generation** (arXiv 2407.01972). Dense retrieval (HNSW) entirely on the client, so personal text never leaves the device. log already keeps embeddings in `log.db` (REQ-VOICE-11).

## Benchmarks and surveys

- **LaMP** (arXiv 2304.11406): the standard benchmark for personalized generation, with retrieval-augmented baselines.
- **A Survey of Personalization: From RAG to Agent** (arXiv 2504.10147).

## Open source

- **WeClone** (github.com/xming521/WeClone, 18.4k stars, AGPL-3.0, pushed 2026-11-16): two modes. A fine-tuned clone (Qwen2.5-7B with LoRA, about 16 GB NVIDIA VRAM) and an in-development "agent clone" with no training, where a large model drives replies from the person's portrait, memories and speaking style.
- **Mirrai** (github.com/Ch1rpys/Mirrai, 1.3k stars): persona distillation from chat logs.

## What the research says to do, in order

1. Ground the draft in his real replies to the most similar messages (in that chat first, then everywhere), plus a short line of his measured features, plus a few contrastive "not him" lines. (2504.08745)
2. Produce several options, not one. Rank them by a single defined authorship score calibrated on his own held-out messages. (2509.14543, 2509.24930)
3. On a fail, return the fix and refine once automatically. (2510.24469)
4. Only then consider steering a small local model with a style vector. (2503.05213, 2607.21620, 2607.01802)
