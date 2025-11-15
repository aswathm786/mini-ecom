/**
 * AI Service
 * 
 * Integrates with Google Gemini AI to provide product assistance and customer support.
 * The AI has access to product catalog and inventory information.
 */

import { Config } from '../config/Config';
import { productService } from './ProductService';
import { inventoryService } from './InventoryService';
import { mongo } from '../db/Mongo';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  message: string;
  suggestions?: string[];
}

class AIService {
  private apiKey: string;
  private apiUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  constructor() {
    this.apiKey = Config.get('GEMINI_API_KEY');
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not found in environment variables. AI features will be disabled.');
    }
  }

  /**
   * Get product context for AI
   */
  private async getProductContext(): Promise<string> {
    try {
      const db = mongo.getDb();
      const productsCollection = db.collection('products');
      const inventoryCollection = db.collection('inventory');
      const categoriesCollection = db.collection('categories');

      // Get active products with inventory
      const products = await productsCollection
        .find({ status: 'active' })
        .limit(50)
        .toArray();

      // Get product IDs for inventory lookup
      const productIds = products
        .map(p => p._id?.toString())
        .filter(Boolean) as string[];
      
      const inventoryMap = productIds.length > 0
        ? await inventoryService.getInventoryForProducts(productIds)
        : new Map<string, any>();

      // Get categories
      const categories = await categoriesCollection.find({}).toArray();

      // Build context string
      let context = 'PRODUCT CATALOG:\n\n';
      
      // Categories
      if (categories.length > 0) {
        context += 'Categories available:\n';
        categories.forEach(cat => {
          context += `- ${cat.name}${cat.description ? `: ${cat.description}` : ''}\n`;
        });
        context += '\n';
      }

      // Products with inventory
      context += 'Products available:\n';
      products.forEach(product => {
        const productIdStr = product._id?.toString() || '';
        // Inventory map uses productId as string key
        const inventory = inventoryMap.get(productIdStr);
        const stock = inventory ? inventory.qty : 0;
        const inStock = stock > 0 ? `In Stock (${stock} available)` : 'Out of Stock';
        
        context += `\n- ${product.name}`;
        context += `\n  Price: ₹${product.price}`;
        context += `\n  Status: ${inStock}`;
        if (product.description) {
          context += `\n  Description: ${product.description.substring(0, 200)}${product.description.length > 200 ? '...' : ''}`;
        }
        if (product.sku) {
          context += `\n  SKU: ${product.sku}`;
        }
        if (product.categoryId) {
          const category = categories.find(c => c._id?.toString() === product.categoryId);
          if (category) {
            context += `\n  Category: ${category.name}`;
          }
        }
        context += '\n';
      });

      return context;
    } catch (error) {
      console.error('Error building product context:', error);
      return 'Product information is currently unavailable.';
    }
  }

  /**
   * Generate AI response using Gemini
   */
  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    if (!this.apiKey) {
      return {
        message: 'AI assistant is currently unavailable. Please contact support for assistance.',
      };
    }

    try {
      // Get product context
      const productContext = await this.getProductContext();

      // Build system prompt
      const systemPrompt = `You are a helpful AI assistant for an e-commerce store called "Handmade Harmony" that sells handmade products, art, and crafts.

Your role is to:
1. Help customers understand products, their features, and availability
2. Answer questions about inventory and stock levels
3. Provide product recommendations based on customer needs
4. Assist with general shopping questions
5. Be friendly, professional, and helpful

IMPORTANT RULES:
- Only provide information about products that are listed in the product catalog
- Always check inventory status before recommending products
- If a product is out of stock, inform the customer clearly
- If you don't know something, admit it and suggest contacting support
- Never make up product information that isn't in the catalog
- Be concise but helpful in your responses
- Use Indian Rupees (₹) for prices

PRODUCT INFORMATION:
${productContext}

Current conversation history:
${messages.map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`).join('\n')}

Please provide a helpful response to the customer's latest question.`;

      // Prepare request to Gemini API
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: systemPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API error:', errorData);
        throw new Error(`AI service error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from AI service');
      }

      const aiMessage = data.candidates[0].content.parts[0].text;

      // Extract suggestions if any
      const suggestions: string[] = [];
      const suggestionPattern = /suggestions?:\s*(.+)/i;
      const match = aiMessage.match(suggestionPattern);
      if (match) {
        suggestions.push(...match[1].split(',').map(s => s.trim()));
      }

      return {
        message: aiMessage,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    } catch (error) {
      console.error('Error calling AI service:', error);
      return {
        message: 'I apologize, but I encountered an error. Please try again or contact support for assistance.',
      };
    }
  }

  /**
   * Get product recommendations based on query
   */
  async getRecommendations(query: string): Promise<string[]> {
    try {
      const db = mongo.getDb();
      const productsCollection = db.collection('products');
      
      // Simple keyword-based search for recommendations
      const searchTerms = query.toLowerCase().split(' ');
      const products = await productsCollection
        .find({
          status: 'active',
          $or: [
            { name: { $regex: searchTerms.join('|'), $options: 'i' } },
            { description: { $regex: searchTerms.join('|'), $options: 'i' } },
          ],
        })
        .limit(5)
        .toArray();

      return products.map(p => p.name);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }
}

export const aiService = new AIService();

