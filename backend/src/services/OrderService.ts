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
  userId?: string; // Optional for guest checkout
  guestEmail?: string; // For guest orders
  items: OrderItem[];
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  shippingAddress: Address;
  billingAddress: Address;
  placedAt: Date;
  razorpayOrderId?: string;
  couponCode?: string;
  couponDiscount?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscount?: number;
  giftWrap?: boolean;
  shippingMethod?: string;
  shippingCost?: number;
  taxRate?: number;
  taxAmount?: number;
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
   * Check if MongoDB transactions are supported
   */
  private async supportsTransactions(): Promise<boolean> {
    // Temporarily disabled - standalone MongoDB doesn't support transactions properly
    // Even when it reports as a replica set, the transaction behavior can be problematic
    // The atomic findOneAndUpdate operations are sufficient for inventory management
    return false;
    
    /* Original implementation - re-enable when using proper replica set
    try {
      const client = mongo.getClient();
      const session = client.startSession();
      await session.endSession();
      
      // Check if we're connected to a replica set or sharded cluster
      const db = mongo.getDb();
      const admin = db.admin();
      const serverStatus = await admin.serverStatus();
      
      // Transactions are supported on replica sets and sharded clusters
      return serverStatus.repl !== undefined || serverStatus.process === 'mongos';
    } catch (error) {
      console.warn('Transaction check failed, assuming standalone MongoDB:', error);
      return false;
    }
    */
  }

  /**
   * Create order from cart
   * Validates inventory, reserves stock, creates order and payment records
   */
  async createOrder(
    userId: string | undefined,
    cart: Cart,
    shippingAddress: Address,
    billingAddress: Address,
    paymentMethod: string,
    options?: {
      email?: string;
      couponCode?: string;
      couponDiscount?: number;
      loyaltyPointsRedeemed?: number;
      loyaltyDiscount?: number;
      giftWrap?: boolean;
      shippingMethod?: string;
      shippingCost?: number;
      taxRate?: number;
    }
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
    
    // Calculate subtotal
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.priceAt * item.qty,
      0
    );

    // Apply discounts
    const couponDiscount = options?.couponDiscount || 0;
    const loyaltyDiscount = options?.loyaltyDiscount || 0;
    const totalDiscount = couponDiscount + loyaltyDiscount;

    // Get shipping cost and tax rate
    const shippingCost = options?.shippingCost || 0;
    const taxRate = options?.taxRate || 0;
    
    // Calculate tax amount (on subtotal + shipping - discounts)
    const taxableAmount = Math.max(0, subtotal + shippingCost - totalDiscount);
    const taxAmount = taxableAmount * (taxRate / 100);

    // Calculate final amount (subtotal + shipping - discounts + tax)
    const amount = Math.max(0, subtotal + shippingCost - totalDiscount + taxAmount);
    
    // Check if transactions are supported
    const useTransactions = await this.supportsTransactions();
    
    // Use MongoDB transaction for atomicity (if supported)
    const session = useTransactions ? client.startSession() : null;
    
    try {
      const executeOrderCreation = async () => {
        // Reserve inventory for all items
        const inventoryReservations: Array<{ productId: string; qty: number; success: boolean }> = [];
        
        for (const item of cart.items) {
          // Note: productId in inventory collection is stored as ObjectId
          const productIdObj = new ObjectId(item.productId);
          
          // Check inventory availability (not using session to avoid conflicts)
          const existingInventory = await inventoryCollection.findOne(
            { productId: productIdObj }
          );
          
          // Simplified logging - verbose debug removed
          if (!existingInventory) {
            console.log(`Inventory check failed: No record found for product ${item.productId}`);
          }
          
          if (!existingInventory) {
            throw new Error(
              `No inventory record found for product ${item.productId}`
            );
          }
          
          if (existingInventory.qty < item.qty) {
            throw new Error(
              `Insufficient inventory for product ${item.productId}. Available: ${existingInventory.qty}, Requested: ${item.qty}`
            );
          }
          
          // Atomic update: decrement quantity using updateOne instead of findOneAndUpdate
          // Using updateOne with $inc is atomic and avoids the mysterious findOneAndUpdate issue
          const updateResult = await inventoryCollection.updateOne(
            {
              productId: productIdObj,
              qty: { $gte: item.qty }, // Only update if sufficient stock
            },
            {
              $inc: { qty: -item.qty },
              $set: { updatedAt: new Date() },
            }
          );
          
          if (updateResult.matchedCount === 0) {
            throw new Error(
              `Failed to update inventory for product ${item.productId}. Stock may have been depleted by another order.`
            );
          }
          
          if (updateResult.modifiedCount === 0) {
            throw new Error(
              `Failed to modify inventory for product ${item.productId}. This shouldn't happen.`
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
          userId: userId || undefined,
          guestEmail: options?.email,
          items: orderItems,
          amount,
          currency: 'INR',
          status: 'pending',
          shippingAddress,
          billingAddress,
          placedAt: new Date(),
          couponCode: options?.couponCode,
          couponDiscount: options?.couponDiscount,
          loyaltyPointsRedeemed: options?.loyaltyPointsRedeemed,
          loyaltyDiscount: options?.loyaltyDiscount,
          giftWrap: options?.giftWrap || false,
          shippingMethod: options?.shippingMethod,
          shippingCost,
          taxRate,
          taxAmount,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const insertOrderOptions: any = {};
        if (session) {
          insertOrderOptions.session = session;
        }
        const orderResult = await ordersCollection.insertOne(order, insertOrderOptions);
        order._id = orderResult.insertedId.toString();
        
        // Create payment record
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
        
        const insertPaymentOptions: any = {};
        if (session) {
          insertPaymentOptions.session = session;
        }
        const paymentResult = await paymentsCollection.insertOne(payment, insertPaymentOptions);
        payment._id = paymentResult.insertedId.toString();
        
        // Clear cart
        if (userId) {
          const deleteCartOptions: any = {};
          if (session) {
            deleteCartOptions.session = session;
          }
          await cartsCollection.deleteOne({ userId }, deleteCartOptions);
        } else if (cart.sessionId) {
          const deleteSessionCartOptions: any = {};
          if (session) {
            deleteSessionCartOptions.session = session;
          }
          await cartsCollection.deleteOne({ sessionId: cart.sessionId }, deleteSessionCartOptions);
        }
        
        return { order, payment };
      };
      
      // Execute with or without transaction
      const result = session 
        ? await session.withTransaction(executeOrderCreation)
        : await executeOrderCreation();
      
      // Committed successfully
      const { order, payment } = result;
      
      // Send order confirmation email (async, don't wait)
      const emailToSend = options?.email || (userId ? undefined : null);
      
      if (emailToSend || userId) {
        const usersCollection = db.collection('users');
        let userEmail = emailToSend;
        let userName = emailToSend || 'Guest';

        if (userId) {
          const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
          if (user) {
            userEmail = user.email;
            userName = user.firstName || user.email;
          }
        }

        if (userEmail) {
          emailTriggerService.sendTemplateEmail(
            EmailEventType.ORDER_PLACED,
            userEmail,
            {
              userName,
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
      }

      // Record coupon usage if applicable
      if (options?.couponCode && options?.couponDiscount && options.couponDiscount > 0) {
        const { couponService } = await import('./CouponService');
        const coupon = await couponService.getCouponByCode(options.couponCode);
        if (coupon && order._id) {
          await couponService.recordUsage(
            coupon._id!,
            options.couponCode,
            userId || 'guest',
            order._id,
            options.couponDiscount
          );
        }
      }

      // Record loyalty redemption if applicable
      if (options?.loyaltyPointsRedeemed && options.loyaltyPointsRedeemed > 0 && userId && order._id) {
        const { loyaltyService } = await import('./LoyaltyService');
        try {
          // Note: Points were already redeemed in controller, this is just for record-keeping
          // The actual redemption happened before order creation
        } catch (error) {
          console.error('Failed to record loyalty redemption:', error);
        }
      }

      // Award loyalty points if user is logged in
      if (userId && order._id && amount > 0) {
        const { loyaltyService } = await import('./LoyaltyService');
        try {
          await loyaltyService.earnPoints(userId, order._id, amount);
        } catch (error) {
          console.error('Failed to award loyalty points:', error);
        }
      }

      // Process order: generate invoice, send email, create shipment (async, non-blocking)
      if (order._id) {
        this.processOrder(order, shippingAddress, paymentMethod).catch(err => {
          console.error('Error in post-order processing:', err);
        });
      }
      
      return { order, payment };
    } catch (error) {
      // Transaction will be aborted automatically (if using transactions)
      console.error('Error creating order:', error);
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Create order without payment (for multi-step checkout)
   * Used when order is created first, then payment is processed separately
   */
  async createOrderWithoutPayment(
    userId: string,
    cart: Cart,
    shippingAddress: Address,
    billingAddress: Address,
    paymentMethod: string,
    options?: {
      shippingMethod?: string;
      shippingCost?: number;
      taxRate?: number;
    }
  ): Promise<{ order: Order; payment?: Payment }> {
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
    
    // Calculate subtotal
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.priceAt * item.qty,
      0
    );
    
    // Get shipping cost and tax rate
    const shippingCost = options?.shippingCost || 0;
    const taxRate = options?.taxRate || 0;
    
    // Calculate tax amount (on subtotal + shipping)
    const taxAmount = (subtotal + shippingCost) * (taxRate / 100);
    
    // Calculate total amount (subtotal + shipping + tax)
    const amount = subtotal + shippingCost + taxAmount;
    
    // Check if transactions are supported
    const useTransactions = await this.supportsTransactions();
    
    // Use MongoDB transaction for atomicity (if supported)
    const session = useTransactions ? client.startSession() : null;
    
    try {
      const executeOrderCreation = async () => {
        // Reserve inventory for all items
        for (const item of cart.items) {
          // Note: productId in inventory collection is stored as ObjectId
          const productIdObj = new ObjectId(item.productId);
          
          // Check inventory availability (not using session to avoid conflicts)
          const existingInventory = await inventoryCollection.findOne(
            { productId: productIdObj }
          );
          
          // Simplified logging - verbose debug removed
          if (!existingInventory) {
            console.log(`Inventory check failed: No record found for product ${item.productId}`);
          }
          
          if (!existingInventory) {
            throw new Error(
              `No inventory record found for product ${item.productId}`
            );
          }
          
          if (existingInventory.qty < item.qty) {
            throw new Error(
              `Insufficient inventory for product ${item.productId}. Available: ${existingInventory.qty}, Requested: ${item.qty}`
            );
          }
          
          // Atomic update: decrement quantity using updateOne instead of findOneAndUpdate
          // Using updateOne with $inc is atomic and avoids the mysterious findOneAndUpdate issue
          console.log('DEBUG: About to update inventory:', {
            productId: productIdObj.toString(),
            existingQty: existingInventory.qty,
            decrementBy: item.qty
          });
          
          const updateResult = await inventoryCollection.updateOne(
            {
              productId: productIdObj,
              qty: { $gte: item.qty }, // Only update if sufficient stock
            },
            {
              $inc: { qty: -item.qty },
              $set: { updatedAt: new Date() },
            }
          );
          
          console.log('DEBUG: Update result:', {
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount
          });
          
          if (updateResult.matchedCount === 0) {
            throw new Error(
              `Failed to update inventory for product ${item.productId}. Stock may have been depleted by another order.`
            );
          }
          
          if (updateResult.modifiedCount === 0) {
            throw new Error(
              `Failed to modify inventory for product ${item.productId}. This shouldn't happen.`
            );
          }
        }
        
        // Create order
        const order: Order = {
          userId,
          items: orderItems,
          amount,
          currency: 'INR',
          status: 'pending',
          shippingAddress,
          billingAddress,
          placedAt: new Date(),
          shippingMethod: options?.shippingMethod,
          shippingCost,
          taxRate,
          taxAmount,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const insertOrderOptions: any = {};
        if (session) {
          insertOrderOptions.session = session;
        }
        const orderResult = await ordersCollection.insertOne(order, insertOrderOptions);
        order._id = orderResult.insertedId.toString();
        
        // For COD, create payment record with pending status
        // For Razorpay, payment will be created later when confirmed
        let payment: Payment | undefined;
        if (paymentMethod === 'cod') {
          payment = {
            orderId: order._id!,
            amount,
            currency: 'INR',
            gateway: 'cod',
            status: 'pending',
            meta: {
              paymentMethod,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const insertPaymentOptions: any = {};
        if (session) {
          insertPaymentOptions.session = session;
        }
        const paymentResult = await paymentsCollection.insertOne(payment, insertPaymentOptions);
          payment._id = paymentResult.insertedId.toString();
        }
        
        // Clear cart
        if (userId) {
          const deleteCartOptions: any = {};
          if (session) {
            deleteCartOptions.session = session;
          }
          await cartsCollection.deleteOne({ userId }, deleteCartOptions);
        } else if (cart.sessionId) {
          const deleteSessionCartOptions: any = {};
          if (session) {
            deleteSessionCartOptions.session = session;
          }
          await cartsCollection.deleteOne({ sessionId: cart.sessionId }, deleteSessionCartOptions);
        }
        
        return { order, payment };
      };
      
      // Execute with or without transaction
      const result = session 
        ? await session.withTransaction(executeOrderCreation)
        : await executeOrderCreation();
      
      // Committed successfully
      const { order, payment } = result;
      
      // Send order confirmation email (async, don't wait)
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
      // Transaction will be aborted automatically (if using transactions)
      console.error('Error creating order:', error);
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
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
    dateFrom?: Date;
    dateTo?: Date;
    searchQuery?: string;
    page: number;
    limit: number;
    skip: number;
  }): Promise<{ orders: Order[]; total: number }> {
    const db = mongo.getDb();
    const ordersCollection = db.collection<Order>('orders');
    const usersCollection = db.collection('users');
    
    const query: any = {};
    
    if (filters.userId) {
      query.userId = filters.userId;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      query.placedAt = {};
      if (filters.dateFrom) {
        query.placedAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        // Include the entire end date
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.placedAt.$lte = endDate;
      }
    }
    
    // Search query - search in item names, customer name, or city
    if (filters.searchQuery) {
      const searchRegex = { $regex: filters.searchQuery, $options: 'i' };
      
      // First, find user IDs matching the search query (by name or email)
      const matchingUsers = await usersCollection
        .find({
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
          ],
        })
        .project({ _id: 1 })
        .toArray();
      
      const matchingUserIds = matchingUsers.map(u => u._id.toString());
      
      // Build search query
      const searchConditions: any[] = [
        { 'items.name': searchRegex }, // Search in item names
        { 'shippingAddress.city': searchRegex }, // Search in city
      ];
      
      if (matchingUserIds.length > 0) {
        searchConditions.push({ userId: { $in: matchingUserIds } }); // Search by customer
      }
      
      query.$or = searchConditions;
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

  /**
   * Process order after creation
   * - Generate invoice
   * - Send confirmation email with invoice
   * - Create Delhivery shipment if enabled
   */
  private async processOrder(
    order: Order,
    shippingAddress: Address,
    paymentMethod: string
  ): Promise<void> {
    try {
      const orderId = order._id;
      if (!orderId) {
        console.error('Order ID is missing, cannot process order');
        return;
      }

      // 1. Generate invoice
      console.log(`Generating invoice for order ${orderId}`);
      const { invoiceService } = await import('./InvoiceService');
      let invoicePdfPath: string | undefined;
      let invoiceId: string | undefined;
      
      try {
        const invoice = await invoiceService.generateInvoice(orderId, 'manual');
        invoicePdfPath = invoice.pdfPath;
        invoiceId = invoice._id;
        console.log(`Invoice generated successfully: ${invoice.invoiceNumber}`);
        
        // Update order with invoice path
        if (invoicePdfPath) {
          const db = mongo.getDb();
          const ordersCollection = db.collection('orders');
          await ordersCollection.updateOne(
            { _id: new ObjectId(orderId) },
            {
              $set: {
                invoicePath: invoicePdfPath,
                invoiceId: invoiceId,
                updatedAt: new Date()
              }
            }
          );
          console.log(`Order updated with invoice path: ${invoicePdfPath}`);
        }
      } catch (invoiceError) {
        console.error('Failed to generate invoice:', invoiceError);
        // Continue processing even if invoice generation fails
      }

      // 2. Send order confirmation email with invoice attachment
      console.log(`Sending order confirmation email for order ${orderId}`);
      try {
        await emailTriggerService.sendOrderConfirmationWithInvoice(
          order,
          invoicePdfPath
        );
        console.log('Order confirmation email sent successfully');
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
        // Continue processing even if email fails
      }

      // 3. Check if Delhivery is enabled and create shipment
      console.log('Checking Delhivery status...');
      const { settingsService } = await import('./SettingsService');
      const shipping = await settingsService.getSetting('shipping');
      
      if (shipping?.providers?.delhivery?.enabled) {
        console.log('Delhivery is enabled, creating shipment...');
        try {
          const { delhiveryService } = await import('./DelhiveryService');
          const { Config } = await import('../config/Config');
          
          // Build pickup details from order
          const pickupDetails = {
            name: shippingAddress.name,
            add: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            pin: shippingAddress.pincode,
            country: shippingAddress.country || 'India',
            phone: shippingAddress.phone || '',
            order: orderId,
            payment_mode: paymentMethod === 'cod' ? 'COD' : 'Prepaid',
            order_date: order.placedAt.toISOString(),
            total_amount: order.amount.toString(),
            seller_add: Config.get('SHIPPING_FROM_ADDRESS', ''),
            seller_name: Config.get('STORE_NAME', 'Store'),
            seller_inv: '',
            quantity: order.items.reduce((sum, item) => sum + item.qty, 0).toString(),
            waybill: '',
            shipment_width: '',
            shipment_height: '',
            weight: '1',
            seller_gst_tin: '',
            shipping_mode: 'Surface',
            address_type: 'home',
          };

          const shipment = await delhiveryService.createShipment(orderId, pickupDetails);
          console.log(`Shipment created successfully: AWB ${shipment.awb}`);
        } catch (shipmentError) {
          console.error('Failed to create Delhivery shipment:', shipmentError);
          // Order still succeeds even if shipment creation fails
        }
      } else {
        console.log('Delhivery is not enabled, skipping shipment creation');
      }

      console.log(`Order processing completed for order ${orderId}`);
    } catch (error) {
      console.error('Error in processOrder:', error);
      // Don't throw - order was already created successfully
    }
  }
}

export const orderService = new OrderService();

