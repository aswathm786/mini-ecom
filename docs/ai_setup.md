# AI Assistant Setup Guide

This guide explains how to set up the AI assistant feature using Google Gemini API.

---

## Overview

The AI assistant helps customers:
- Understand products and their features
- Check product availability and inventory
- Get product recommendations
- Answer general shopping questions

The AI has access to:
- Product catalog (names, descriptions, prices, categories)
- Inventory levels (stock availability)
- Product categories

---

## Prerequisites

- Google account
- Internet connection (for API calls)

---

## Step 1: Get Gemini API Key

1. **Visit Google AI Studio:**
   - Go to: https://makersuite.google.com/app/apikey
   - Or visit: https://aistudio.google.com/app/apikey

2. **Sign in:**
   - Use your Google account to sign in

3. **Create API Key:**
   - Click "Create API Key" button
   - Select "Create API key in new project" or use existing project
   - Copy the generated API key

**Important:** Keep your API key secure and don't share it publicly.

---

## Step 2: Add API Key to Environment

### For Docker Setup

1. **Open `.env` file** in the project root
2. **Add the API key:**
   ```bash
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. **Save the file**
4. **Restart services:**
   ```bash
   docker compose restart api
   ```

### For Native Setup

1. **Open `.env` file** in the project root
2. **Add the API key:**
   ```bash
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. **Save the file**
4. **Restart backend server:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   cd backend
   npm run dev
   ```

---

## Step 3: Verify AI is Working

1. **Start the application** (if not already running)
2. **Open the website** in your browser
3. **Look for the chat button** in the bottom-right corner
4. **Click the chat button** to open the AI assistant
5. **Try asking:**
   - "What products do you have?"
   - "Show me products in stock"
   - "Tell me about [product name]"

If the AI responds, it's working correctly!

---

## Features

### What the AI Can Do

✅ **Product Information:**
- Answer questions about product features
- Provide product descriptions
- Share pricing information

✅ **Inventory Status:**
- Check if products are in stock
- Tell you how many items are available
- Inform about out-of-stock items

✅ **Recommendations:**
- Suggest products based on your needs
- Help you find products by category
- Answer questions about product comparisons

✅ **General Help:**
- Answer shopping-related questions
- Provide store information
- Help with navigation

### What the AI Cannot Do

❌ Process orders (use checkout for that)
❌ Access customer account information
❌ Make changes to products or inventory
❌ Handle payment processing

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

1. **Never commit `.env` file** to version control
2. **Keep API key secret** - don't share it publicly
3. **Use environment variables** - never hardcode the key
4. **Rotate keys** if compromised
5. **Monitor usage** in Google AI Studio dashboard

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

