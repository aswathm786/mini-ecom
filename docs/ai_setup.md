# AI Assistant Setup Guide

This guide explains how to set up the AI assistant feature using Google Gemini, OpenAI, Anthropic, OpenRouter, or your own local LLM gateway.

---

## Overview

The Handmade Harmony AI stack now covers:

- **Shopping assistant** – floating chat widget with streaming replies and history per visitor
- **Semantic search** – rewrites fuzzy queries and suggests filters on the fly
- **Product discovery boosts** – AI-generated summaries, highlights, comparisons, FAQs and recommendations on PDP + home
- **Order help** – customer account page “Ask AI” panel for shipment / reorder questions
- **Admin copilots** – description generator, support reply aide, analytics insights, email composer

Data sources available to the model:

- Product catalog (names, descriptions, categories, SEO metadata)
- Inventory snapshots
- User context (cart, wishlist placeholder, recent orders)
- Sales aggregates (when supplied via admin UI)

---

## Prerequisites

- Google / OpenAI / Anthropic account (you can prioritize any provider)
- Internet connectivity for outbound HTTPS calls
- API key(s) stored securely via env vars or runtime settings

Supported providers & env keys:

| Provider   | Env Key                | Default Model          |
|------------|------------------------|------------------------|
| Gemini     | `GEMINI_API_KEY`       | `gemini-1.5-pro`       |
| OpenAI     | `OPENAI_API_KEY`       | `gpt-4o-mini`          |
| Anthropic  | `ANTHROPIC_API_KEY`    | `claude-3-haiku`       |
| OpenRouter | `OPENROUTER_API_KEY`   | `OPENROUTER_MODEL`     |
| Local LLM  | `LOCAL_LLM_URL` (+ optional `LOCAL_LLM_API_KEY`) | `LOCAL_LLM_MODEL` |

`AI_DEFAULT_PROVIDER` controls the priority order (falls back automatically if a key is missing).

---

## Step 1: Gather API Keys

You can plug in one or multiple providers. The service automatically tries them in priority order.

### Gemini
1. Visit https://makersuite.google.com/app/apikey
2. Create an API key and copy it

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Generate a secret key with GPT-4o access

### Anthropic
1. Go to https://console.anthropic.com/
2. Create an API key with Claude 3 permissions

### OpenRouter
1. Visit https://openrouter.ai/keys
2. Generate an API key and optionally set a default model via `OPENROUTER_MODEL`

### Local LLM Gateway
1. Deploy any OpenAI-compatible server (Ollama, LM Studio, vLLM, etc.)
2. Expose an HTTPS endpoint, set `LOCAL_LLM_URL`, and optionally `LOCAL_LLM_API_KEY` / `LOCAL_LLM_MODEL`

> **Important:** Never commit these keys. Store them in `.env`/secrets and rotate periodically.

---

## Step 2: Add Keys to Environment

### Docker / Compose
```
GEMINI_API_KEY=xxxx
OPENAI_API_KEY=xxxx
ANTHROPIC_API_KEY=xxxx
OPENROUTER_API_KEY=xxxx
OPENROUTER_MODEL=openrouter/auto
LOCAL_LLM_URL=https://llm.internal/v1/chat/completions
LOCAL_LLM_API_KEY=optional-token
LOCAL_LLM_MODEL=llama3-8b
AI_DEFAULT_PROVIDER=gemini
AI_STREAMING_ENABLED=true
```
Then restart:
```
docker compose restart api
```

### Native dev server
1. Update `backend/.env` with the same variables
2. Restart backend (`npm run dev`) so Config picks up new keys

---

## Step 3: Configure Feature Flags

Runtime AI behavior is stored in Mongo `settings` collection (`key: "ai.settings"`). Example payload:

```json
{
  "enabled": true,
  "streamingEnabled": true,
  "providerPriority": ["gemini", "openai", "anthropic", "openrouter", "local"],
  "chatbot": { "enabled": true, "showOnDesktop": true, "showOnMobile": true },
  "recommendations": { "enabled": true, "maxItems": 6 },
  "search": { "enabled": true, "suggestFilters": true },
  "productPage": { "summary": true, "highlights": true, "comparisons": true, "faqs": true },
  "orderAssist": { "enabled": true, "maxLookbackDays": 120 },
  "adminTools": {
    "productContent": true,
    "supportReplies": true,
    "emailGenerator": true,
    "analytics": true
  }
}
```

Update via Mongo shell:
```js
db.settings.updateOne(
  { key: 'ai.settings' },
  { $set: { key: 'ai.settings', value: JSON.stringify(<payload>), type: 'json', updatedAt: new Date() } },
  { upsert: true }
);
```

> Cache TTL is 60s; updates take effect immediately after expiry or after the `/api/ai/admin/settings` endpoint is called.

---

## Step 4: Verify End-to-End

1. **Start the application** (if not already running)
2. **Open the website** in your browser
3. **Look for the floating Harmony AI badge** (bottom-right)
4. **Test new surfaces**
   - Chat: ask “Show me gifts under ₹500”
   - Search bar: try “moody teal mugs for gifting”
   - Product page: confirm summary/highlights render
   - Account → order details: use the “Need help?” box
   - Admin → AI Studio: run each copilot panel

If the AI responds, it's working correctly!

---

## Feature Matrix

| Surface | Description | Endpoint |
|---------|-------------|----------|
| Chat assistant | `/api/ai/chat` with streaming + CSRF + fingerprint binding | `POST /ai/chat` |
| Recommendations | Personalized suggestions using cart/orders/trending data | `POST /ai/recommend` |
| Semantic search | Rewrites query + returns filters / suggestions | `POST /ai/search` |
| PDP enhancements | Summary, highlights, comparisons, FAQs | `POST /ai/product-enhancements` |
| Shipping/order help | Account page AI answering “Where is my order?” | `POST /ai/order-assist` |
| Admin product copy | Generates full marketing copy + SEO | `POST /ai/admin/product-content` |
| Admin email builder | HTML + CTA + preheader suggestions | `POST /ai/admin/email` |
| Admin support reply | Drafts tone-aware response + tags | `POST /ai/admin/support-reply` |
| Admin analytics | Turns sales snapshots into insights | `POST /ai/admin/analytics` |

What the AI still **will not** do automatically:
- Modify inventory or orders
- Reveal sensitive PII (addresses, payment data)
- Execute refunds / returns on its own
- Send emails without explicit admin confirmation

---

## Troubleshooting

### "AI assistant is currently unavailable"

**Possible causes:**
1. **API key not set:**
   - Check `.env` file has `GEMINI_API_KEY` set
   - Restart the backend server after adding the key

2. **Invalid API key:**
   - Verify the API key is correct
   - Make sure there are no extra spaces or quotes
   - Try generating a new API key

3. **API quota exceeded:**
   - Check your Google AI Studio dashboard
   - Free tier has rate limits
   - Wait a few minutes and try again

**Solution:**
```bash
# Check if API key is set
# On Linux/Mac:
grep GEMINI_API_KEY .env

# On Windows (PowerShell):
Select-String -Path .env -Pattern "GEMINI_API_KEY"
```

### "Failed to process chat request"

**Possible causes:**
- Network connectivity issues
- Gemini API service is down
- Invalid API key format

**Solution:**
1. Check backend logs:
   ```bash
   # Docker
   docker compose logs api | grep -i ai
   
   # Native
   # Check backend console output
   ```
2. Verify API key is correct
3. Check internet connection

### AI gives wrong information

The AI uses product data from your database. If information is incorrect:
1. **Check product data** in admin panel
2. **Verify inventory** is correctly set
3. **Update product descriptions** if needed

---

## API Usage and Costs

### Free Tier

Google Gemini API offers a free tier with:
- Generous free quota per month
- Rate limits apply
- Suitable for development and small stores

### Production Considerations

For production use:
- Monitor API usage in Google AI Studio
- Set up billing alerts
- Consider caching common responses
- Implement rate limiting on your end

---

## Customization

### Adjusting AI Behavior

The AI prompt can be customized in:
- `backend/src/services/AIService.ts`
- Look for the `systemPrompt` variable
- Modify the instructions to change AI behavior

### Limiting Product Context

By default, the AI sees up to 50 products. To change:
- Edit `backend/src/services/AIService.ts`
- Find `.limit(50)` in `getProductContext()`
- Adjust the number as needed

---

## Security Notes

1. API keys always remain server-side; frontend only talks to proxy endpoints.
2. All AI routes enforce CSRF protection + rate limiting (chat/search/admin buckets).
3. Chat history is scoped per-session and fingerprinted (UA + IP + accept headers).
4. `sanitizeForAI` removes e-mails, phones, payment tokens before prompts, and cleans responses to prevent script injection.
5. Admin AI tools respect feature flags—disable them instantly via `ai.settings` if needed.

---

## Testing

### Test Questions to Try

1. **Product queries:**
   - "What products are available?"
   - "Do you have any jewelry?"
   - "Show me products under ₹500"

2. **Inventory queries:**
   - "Is [product name] in stock?"
   - "How many [product name] do you have?"
   - "What's available right now?"

3. **Recommendations:**
   - "What do you recommend for a gift?"
   - "Show me handmade items"
   - "What's your best seller?"

---

## Support

If you encounter issues:
1. Check backend logs for errors
2. Verify API key is correct
3. Test API key directly in Google AI Studio
4. Check network connectivity
5. Review troubleshooting section above

---

**Note:** The AI assistant requires an active internet connection to communicate with Google's Gemini API.

