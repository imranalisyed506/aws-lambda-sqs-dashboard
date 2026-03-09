# LLM Provider Configuration

## Overview

This system supports multiple LLM providers, giving you flexibility to choose based on cost, performance, and privacy requirements.

## Supported Providers

### Ollama (Local)

**Pros**: Free, private, no API limits
**Cons**: Requires GPU, slower than cloud options

```bash
LLM_PROVIDER=ollama
LLM_MODEL=llama2
OLLAMA_BASE_URL=http://localhost:11434
```

**Popular Models**:
- `llama2` - General purpose
- `mistral` - Fast and efficient
- `codellama` - Code understanding
- `mixtral` - High quality responses

### OpenRouter

**Pros**: Access to 100+ models, pay-per-use
**Cons**: Costs vary by model

```bash
LLM_PROVIDER=openrouter
LLM_MODEL=anthropic/claude-3-opus
OPENROUTER_API_KEY=sk-or-v1-...
```

**Recommended Models**:
- `anthropic/claude-3-opus` - Highest quality
- `meta-llama/llama-3-70b` - Great balance
- `mistralai/mistral-7b` - Cost-effective

### Groq

**Pros**: Extremely fast inference, free tier
**Cons**: Limited model selection

```bash
LLM_PROVIDER=groq
LLM_MODEL=mixtral-8x7b-32768
GROQ_API_KEY=gsk_...
```

**Available Models**:
- `mixtral-8x7b-32768` - Best overall
- `llama2-70b-4096` - High quality
- `gemma-7b-it` - Fast responses

### Together AI

**Pros**: Good pricing, multiple open models
**Cons**: Moderate speed

```bash
LLM_PROVIDER=together
LLM_MODEL=mistralai/Mixtral-8x7B-Instruct-v0.1
TOGETHER_API_KEY=...
```

### OpenAI

**Pros**: Most reliable, best quality
**Cons**: Higher cost, privacy concerns

```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo-preview
OPENAI_API_KEY=sk-...
```

## Model Selection Strategy

### For Development
Use **Ollama** with `mistral` - free and fast enough

### For Production (Budget-Conscious)
Use **Groq** with `mixtral-8x7b-32768` - great performance/cost ratio

### For Production (Quality-First)
Use **OpenRouter** with `anthropic/claude-3-opus` - best responses

### For Production (Speed-First)
Use **Groq** with any model - sub-second response times

## Custom Models

Set `LLM_ALLOW_CUSTOM_MODEL=true` to bypass validation and use any model ID:

```bash
LLM_ALLOW_CUSTOM_MODEL=true
LLM_MODEL=my-custom-fine-tuned-model
```

## Embedding Providers

Separate configuration for converting text to vectors:

```bash
EMBEDDING_PROVIDER=openai  # or ollama
OPENAI_API_KEY=sk-...  # if using openai
```

## API Rate Limits

| Provider | Free Tier | Rate Limit |
|----------|-----------|------------|
| Ollama | Unlimited | Hardware dependent |
| Groq | 14,400 req/day | 30 req/min |
| Together | $25 credit | 10 req/sec |
| OpenRouter | Pay-per-use | Model dependent |
| OpenAI | Pay-per-use | Tier-based |

## Troubleshooting

**Error: "Model not supported"**
- Enable `LLM_ALLOW_CUSTOM_MODEL=true`
- Or check model name spelling

**Error: "Rate limit exceeded"**
- Wait for rate limit reset
- Upgrade to paid tier
- Switch to local Ollama

**Error: "API key invalid"**
- Verify API key in .env file
- Check key hasn't expired
- Ensure no spaces in key value
