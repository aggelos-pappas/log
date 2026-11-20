# Research: frontier-model writing conventions

Read on 2026-11-20 from arXiv and GitHub.

## Papers

- **Idiosyncrasies in Large Language Models** (arXiv 2502.12150, code locuslab/llm-idiosyncrasies, MIT). Fine-tuning text embedding models on LLM outputs classifies the source among ChatGPT, Claude, Grok, Gemini and DeepSeek at 97.1%; the signal sits in word-level distributions and survives rewriting, translation and summarising.
- **Antislop** (arXiv 2510.15061; sam-paech/slop-forensics MIT, auto-antislop, antislop-sampler Apache-2.0). Profiles a model's over-represented words, bigrams and trigrams against a human baseline; some patterns are over 1,000x more frequent in model output than in human text.
- **SlopBench** (arXiv 2609.33905, Sep 2026). 18 models, 112 tasks incl. social posts and workplace chat, 19,928 outputs. Four checkable behaviours: length against the brief, opener repetition across a model's samples of one task, paragraph rhythm, fixed lexical constructions against pre-ChatGPT human corpora.
- **Measuring AI "Slop" in Text** (arXiv 2509.19163). Binary slop judgements are somewhat subjective; they correlate with coherence and relevance; fully automated measurement is open.
- **The Last Fingerprint** (arXiv 2603.27006). The em dash is markdown leaking into prose: told to avoid markdown, 12 models from 5 providers drop headers, bullets and bold, but em dashes persist.
- **Interpretable Stylistic Variation in Human and LLM Writing** (arXiv 2604.14111). Biber lexicogrammatical features separate 11 LLMs from humans across 8 genres; the differences hold even when prompted to sound human or given human text to continue.
- **Human Variability vs Machine Consistency** (arXiv 2412.03025). 250 linguistic features: model texts vary much less than human texts.
- **How Short Is Too Short?** (arXiv 2611.10901, Nov 2026). Detector false positives rise as text gets shorter; calibrate thresholds per length band with conformal p-values and abstain where the detector cannot be informative; holds 5% false positives from 10 to 200 tokens.
- **When Detection Fails** (arXiv 2506.09975). 505,159 AI social posts: detectors that work under research assumptions fail on fine-tuned or unseen models.
- **Binoculars** (ahans30/Binoculars, BSD-3) and **Fast-DetectGPT** (baoguangsheng/fast-detect-gpt, MIT): zero-shot detection from a language model's perplexity; need a causal LM (billions of parameters in the papers); weak on short text per 2611.10901.

## Running projects (GitHub, 2026-11-20)

The full README extracts are in `repos.md`.
