# AI Assistant Documentation

Google Gemini AI integration for automated content generation.

## 📋 Contents

- [Gemini Setup](gemini-setup.md) - Complete setup guide

## 🤖 AI Features

### Product Description Generation
- Automatically generate compelling product descriptions
- Multiple tones: Professional, Casual, Luxury
- SEO-optimized content
- Length customization

### FAQ Generation
- Generate common Q&A for products
- Based on product details
- Editable before publishing

### Content Suggestions
- Meta descriptions
- Category descriptions
- Marketing copy

### Customer Support Assistant (Future)
- Automated responses
- Smart ticket routing
- Knowledge base integration

## 🚀 Quick Setup

### Step 1: Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Select or create Google Cloud project
5. Copy the API key

### Step 2: Configure Application

Edit `.env`:
```bash
# Enable AI features
ENABLE_AI=true

# Gemini API key
GEMINI_API_KEY=your_api_key_here

# Model configuration
GEMINI_MODEL=gemini-pro
AI_MAX_TOKENS=1024
```

Restart application.

### Step 3: Test in Admin Panel

1. Go to Admin → Products → Add New
2. Fill in basic product info
3. Click "Generate Description with AI"
4. Review and edit generated content
5. Save product

## ⚙️ Configuration

### Environment Variables

```bash
# Enable/disable AI
ENABLE_AI=true

# API Configuration
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-pro

# Generation limits
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.7

# Rate limiting
AI_REQUESTS_PER_MINUTE=10
```

### Admin Panel Settings

Settings → AI Assistant:
- Enable/disable features
- Default generation tone
- Content guidelines
- Usage statistics

## 🎯 Using AI Features

### Generate Product Description

**From Admin Panel:**
1. Products → Add/Edit Product
2. Enter product name and key features
3. Click "Generate Description"
4. Choose tone (Professional/Casual/Luxury)
5. AI generates description
6. Edit if needed
7. Save

**API Usage:**
```bash
POST /api/admin/ai/generate-description
{
  "productName": "Handmade Ceramic Mug",
  "features": ["Handcrafted", "Microwave safe", "350ml capacity"],
  "tone": "professional"
}
```

### Generate Product FAQ

1. Products → Edit Product
2. Go to FAQ section
3. Click "Generate FAQ with AI"
4. AI generates 5-10 relevant Q&As
5. Review and edit
6. Publish

## 💰 Pricing

### Google Gemini API

**Free Tier:**
- 60 requests per minute
- Good for small-medium stores

**Pay-as-you-go:**
- $0.00025 per 1K characters (input)
- $0.0005 per 1K characters (output)
- Very affordable for most use cases

**Example:**
- 1,000 product descriptions
- Average 500 characters each
- Cost: ~$0.375

## 🔒 Privacy & Security

### Data Handling

- Product data sent to Google for processing
- No customer data sent to AI
- No payment information shared
- Data not stored by Google for training
- GDPR compliant

### Best Practices

- Review AI-generated content before publishing
- Don't share sensitive information
- Use for public-facing content only
- Keep API key secure
- Monitor usage and costs

## 📊 Usage Monitoring

### Admin Dashboard

View AI usage:
- Total requests this month
- Cost estimate
- Success/failure rates
- Most used features

### Rate Limiting

Default limits:
- 10 requests per minute per user
- 100 requests per hour per store
- Prevents API abuse
- Protects from cost overruns

## 🆘 Common Issues

### "API Key Invalid"

**Solution:**
- Verify API key is correct
- Check if key is active in Google Cloud
- Ensure billing is enabled

### "Quota Exceeded"

**Solution:**
- Check Google AI Studio quota
- Wait for quota reset
- Upgrade to paid tier
- Reduce generation frequency

### Poor Quality Content

**Solutions:**
- Provide more detailed input
- Adjust tone/style settings
- Try different prompts
- Edit AI output before publishing

### Rate Limit Errors

**Solution:**
- Wait before retry
- Increase rate limits in settings
- Implement queueing for bulk operations

## 🎨 Customization

### Prompt Templates

Customize AI prompts in Admin Panel:

**Product Description Template:**
```
Write a compelling product description for {{productName}}.
Key features: {{features}}
Tone: {{tone}}
Length: {{length}}
Include SEO keywords.
```

**FAQ Template:**
```
Generate 5 frequently asked questions and answers for {{productName}}.
Include questions about: usage, care, materials, shipping.
```

## 📚 Additional Resources

- [Complete Gemini Setup](gemini-setup.md)
- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Pricing Calculator](https://ai.google.dev/pricing)

