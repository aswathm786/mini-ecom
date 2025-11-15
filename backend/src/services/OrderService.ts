/**
 * Order Service
 * 
 * Handles order creation, validation, and management.
 */

import { Db, ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';
import { inventoryService } from './InventoryService';
import { cartService, Cart } from './CartService';
import { productService } from './ProductService';
import { emailTriggerService } from './EmailTriggerService';
import { EmailEventType } from '../models/EmailTemplate';

export interface OrderItem {
  productId: string;
  qty: number;
  priceAt: number;
  name: string;
}

export interface Address {
  name: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone?: string;
}

export interface Order {
  _id?: string;
  userId: string;
  items: OrderItem[];
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  shippingAddress: Address;
  billingAddress: Address;
  placedAt: Date;
  razorpayOrderId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Payment {
  _id?: string;
  orderId: string;
  amount: number;
  currency: string;
  gateway: 'razorpay' | 'cod' | 'other';
  gateway_order_id?: string;
  gateway_payment_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

class OrderService {
  /**
   * Create order from cart
   * Validates inventory, reserves stock, creates order and payment records
   */
  async createOrder(
    userId: string,
    cart: Cart,
    shippingAddress: Address,
    billingAddress: Address,
    paymentMethod: string
  ): Promise<{ order: Order; payment: Payment; errors?: string[] }> {
    const client = mongo.getClient();
    const db = mongo.getDb();
    const ordersCollection = db.collection<Order>('orders');
    const paymentsCollection = db.collection<Payment>('payments');
    const inventoryCollection = db.collection('inventory');
    const cartsCollection = db.collection('carts');
    
    // Validate cart
    const validation = await cartService.validateCart(cart);
    if (!validation.valid) {
      throw new Error(`Cart validation failed: ${validation.errors.map(e => e.error).join(', ')}`);
    }
    
    // Get product details for order items
    const productIds = cart.items.map(item => item.productId);
    const products = await Promise.all(
      productIds.map(id => productService.getProductById(id))
    );
    
    // Build order items with product names
    const orderItems: OrderItem[] = cart.items.map(item => {
      const product = products.find(p => p?._id === item.productId);
      return {
        productId: item.productId,
        qty: item.qty,
        priceAt: item.priceAt,
        name: product?.name || item.name || 'Unknown Product',
      };
    });
    
    // Calculate total amount
    const amount = orderItems.reduce(
      (sum, item) => sum + item.priceAt * item.qty,
      0
    );
    
    // Use MongoDB transaction for atomicity
    const session = client.startSession();
    
    try {
      const result = await session.withTransaction(async () => {
        // Reserve inventory for all items within transaction
        const inventoryReservations: Array<{ productId: string; qty: number; success: boolean }> = [];
        
        for (const item of cart.items) {
          const productObjId = new ObjectId(item.productId);
          
          // Atomic update: decrement quantity only if sufficient stock available
          const inventoryResult = await inventoryCollection.findOneAndUpdate(
            {
              productId: productObjId,
              qty: { $gte: item.qty }, // Only update if qty >= requested
            },
            {
              $inc: { qty: -item.qty },
              $set: { updatedAt: new Date() },
            },
            {
              returnDocument: 'after',
              session,
            }
          );
          
          if (!inventoryResult.value) {
            // Check current stock
            const current = await inventoryCollection.findOne(
              { productId: productObjId },
              { session }
            );
            throw new Error(
              `Insufficient inventory for product ${item.productId}. Available: ${current?.qty || 0}, Requested: ${item.qty}`
            );
          }
          
          inventoryReservations.push({
            productId: item.productId,
            qty: item.qty,
            success: true,
          });
        }
        
        // Create order within transaction
        const order: Order = {
          userId,
          items: orderItems,
          amount,
          currency: 'INR',
          status: 'pending',
          shippingAddress,
          billingAddress,
          placedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const orderResult = await ordersCollection.insertOne(order, { session });
        order._id = orderResult.insertedId.toString();
        
        // Create payment record within transaction
        const payment: Payment = {
          orderId: order._id!,
          amount,
          currency: 'INR',
          gateway: paymentMethod === 'razorpay' ? 'razorpay' : paymentMethod === 'cod' ? 'cod' : 'other',
          status: 'pending',
          meta: {
            paymentMethod,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const paymentResult = await paymentsCollection.insertOne(payment, { session });
        payment._id = paymentResult.insertedId.toString();
        
        // Clear cart within transaction
        if (userId) {
          await cartsCollection.deleteOne({ userId }, { session });
        } else if (cart.sessionId) {
          await cartsCollection.deleteOne({ sessionId: cart.sessionId }, { session });
        }
        
        return { order, payment };
      });
      
      // Transaction committed successfully
      const { order, payment } = result!;
      
      // Send order confirmation email (async, don't wait)
      // Get user email for sending email
      const usersCollection = db.collection('users');
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (user && user.email) {
        emailTriggerService.sendTemplateEmail(
          EmailEventType.ORDER_PLACED,
          user.email,
          {
            userName: user.firstName || user.email,
            orderId: order._id,
            orderDate: order.placedAt.toLocaleDateString(),
            orderAmount: `₹${order.amount.toFixed(2)}`,
            items: order.items.map(item => `${item.name} x${item.qty}`).join(', '),
            shippingAddress: `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`,
          }
        ).catch(err => {
          console.error('Failed to send order confirmation email:', err);
        });
      }
      
      return { order, payment };
    } catch (error) {
      // Transaction will be aborted automatically
      console.error('Error creating order (transaction aborted):', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, userId?: string): Promise<Order | null> {
    const db = mongo.getDb();
    const ordersCollection = db.collection<Order>('orders');
    
    try {
      const orderObjId = new ObjectId(orderId);
      const query: any = { _id: orderObjId };
      
      // If userId provided, ensure user owns the order (unless admin)
      // Note: Admin check should be done in controller
      if (userId) {
        query.userId = userId;
      }
      
      const order = await ordersCollection.findOne(query);
      return order;
    } catch (error) {
      return null;
    }
  }

  /**
   * List orders for user or admin
   */
  async listOrders(filters: {
    userId?: string;
    status?: string;
    page: number;
    limit: number;
    skip: number;
  }): Promise<{ orders: Order[]; total: number }> {
    const db = mongo.getDb();
    const ordersCollection = db.collection<Order>('orders');
    
    const query: any = {};
    
    if (filters.userId) {
      query.userId = filters.userId;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    const [orders, total] = await Promise.all([
      ordersCollection
        .find(query)
        .sort({ placedAt: -1 })
        .skip(filters.skip)
        .limit(filters.limit)
        .toArray(),
      ordersCollection.countDocuments(query),
    ]);
    
    return { orders, total };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    const db = mongo.getDb();
    const ordersCollection = db.collection<Order>('orders');
    const usersCollection = db.collection('users');
    
    try {
      const orderObjId = new ObjectId(orderId);
      const order = await ordersCollection.findOne({ _id: orderObjId });
      
      if (!order) {
        return false;
      }
      
      await ordersCollection.updateOne(
        { _id: orderObjId },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );
      
      // Send status change email (async, don't wait)
      const user = await usersCollection.findOne({ _id: new ObjectId(order.userId) });
      if (user && user.email) {
        let eventType: EmailEventType | null = null;
        
        // Map status to email event type
        switch (status) {
          case 'paid':
            eventType = EmailEventType.ORDER_PAID;
            break;
          case 'shipped':
            eventType = EmailEventType.ORDER_SHIPPED;
            break;
          case 'delivered':
            eventType = EmailEventType.ORDER_DELIVERED;
            break;
          case 'cancelled':
            eventType = EmailEventType.ORDER_CANCELLED;
            break;
        }
        
        if (eventType) {
          emailTriggerService.sendTemplateEmail(
            eventType,
            user.email,
            {
              userName: user.firstName || user.email,
              orderId: order._id,
              orderDate: order.placedAt.toLocaleDateString(),
              orderAmount: `₹${order.amount.toFixed(2)}`,
              status: status,
            }
          ).catch(err => {
            console.error(`Failed to send ${status} email:`, err);
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  }
}

export const orderService = new OrderService();

