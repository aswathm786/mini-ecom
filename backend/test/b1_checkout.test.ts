/**
 * Part B.1 Checkout Integration Test
 *
 * Tests the complete checkout flow:
 * - Create product
 * - Add to cart
 * - Checkout and verify order creation
 * - Verify inventory decremented
 */

import { ObjectId } from "mongodb";
import { productService } from "../src/services/ProductService";
import { inventoryService } from "../src/services/InventoryService";
import { cartService } from "../src/services/CartService";
import { orderService } from "../src/services/OrderService";
import { mongo } from "../src/db/Mongo";

// Mock MongoDB connection for testing
jest.mock("../src/db/Mongo", () => ({
  mongo: {
    getDb: jest.fn(),
  },
}));

describe("Checkout Flow Integration", () => {
  let mockDb: any;

  beforeEach(() => {
    // Setup mock collections
    mockDb = {
      collection: jest.fn((name: string) => {
        const collections: any = {
          products: {
            insertOne: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(() => ({
              toArray: jest.fn(),
            })),
          },
          inventory: {
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            insertOne: jest.fn(),
          },
          carts: {
            findOne: jest.fn(),
            insertOne: jest.fn(),
            updateOne: jest.fn(),
            deleteOne: jest.fn(),
          },
          orders: {
            insertOne: jest.fn(),
            findOne: jest.fn(),
          },
          payments: {
            insertOne: jest.fn(),
            findOne: jest.fn(),
          },
        };
        return collections[name] || {};
      }),
    };

    (mongo.getDb as jest.Mock).mockReturnValue(mockDb);
  });

  it("should create product, add to cart, and complete checkout", async () => {
    const productId = new ObjectId().toString();
    const userId = new ObjectId().toString();

    // Mock product creation
    const mockProduct = {
      _id: new ObjectId(productId),
      name: "Test Product",
      slug: "test-product",
      description: "Test description",
      price: 1000,
      status: "active",
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.collection("products").insertOne.mockResolvedValue({
      insertedId: new ObjectId(productId),
    });
    mockDb.collection("products").findOne.mockResolvedValue(mockProduct);

    // Mock inventory
    const mockInventory = {
      productId: new ObjectId(productId),
      qty: 50,
      lowStockThreshold: 10,
      updatedAt: new Date(),
    };
    mockDb.collection("inventory").findOne.mockResolvedValue(mockInventory);
    mockDb.collection("inventory").findOneAndUpdate.mockResolvedValue({
      value: { ...mockInventory, qty: 49 },
    });

    // Mock cart
    const mockCart = {
      _id: new ObjectId(),
      userId,
      items: [
        {
          productId,
          qty: 1,
          priceAt: 1000,
          name: "Test Product",
        },
      ],
      updatedAt: new Date(),
    };
    mockDb.collection("carts").findOne.mockResolvedValue(mockCart);

    // Mock order creation
    const mockOrder = {
      _id: new ObjectId(),
      userId,
      items: mockCart.items,
      amount: 1000,
      status: "pending",
      placedAt: new Date(),
    };
    mockDb.collection("orders").insertOne.mockResolvedValue({
      insertedId: mockOrder._id,
    });

    // Mock payment creation
    const mockPayment = {
      _id: new ObjectId(),
      orderId: mockOrder._id.toString(),
      amount: 1000,
      status: "pending",
    };
    mockDb.collection("payments").insertOne.mockResolvedValue({
      insertedId: mockPayment._id,
    });

    // Test: Create product
    const product = await productService.createProduct({
      name: "Test Product",
      description: "Test description",
      price: 1000,
    });
    expect(product).toBeDefined();
    expect(product.name).toBe("Test Product");

    // Test: Add to cart
    const cart = await cartService.addItem(
      userId,
      undefined,
      productId,
      1,
      1000,
      "Test Product"
    );
    expect(cart.items.length).toBe(1);

    // Test: Checkout
    const shippingAddress = {
      name: "Test User",
      street: "123 Test St",
      city: "Test City",
      state: "Test State",
      pincode: "123456",
      country: "India",
    };

    const result = await orderService.createOrder(
      userId,
      cart,
      shippingAddress,
      shippingAddress,
      "cod"
    );

    expect(result.order).toBeDefined();
    expect(result.order.amount).toBe(1000);
    expect(result.payment).toBeDefined();
    expect(result.payment.status).toBe("pending");

    // Verify inventory was decremented
    expect(mockDb.collection("inventory").findOneAndUpdate).toHaveBeenCalled();
  });

  it("should fail checkout when inventory is insufficient", async () => {
    const productId = new ObjectId().toString();
    const userId = new ObjectId().toString();

    const mockProduct = {
      _id: new ObjectId(productId),
      name: "Test Product",
      price: 1000,
    };
    mockDb.collection("products").findOne.mockResolvedValue(mockProduct);

    const mockInventory = {
      productId: new ObjectId(productId),
      qty: 5, // Low stock
      lowStockThreshold: 10,
    };
    mockDb.collection("inventory").findOne.mockResolvedValue(mockInventory);
    mockDb.collection("inventory").findOneAndUpdate.mockResolvedValue({
      value: null, // Insufficient stock
    });

    const mockCart = {
      userId,
      items: [
        {
          productId,
          qty: 10, // Requesting more than available
          priceAt: 1000,
        },
      ],
    };
    mockDb.collection("carts").findOne.mockResolvedValue(mockCart);

    await expect(
      orderService.createOrder(
        userId,
        mockCart as any,
        {
          name: "Test",
          street: "Test",
          city: "Test",
          state: "Test",
          pincode: "123456",
          country: "India",
        },
        {
          name: "Test",
          street: "Test",
          city: "Test",
          state: "Test",
          pincode: "123456",
          country: "India",
        },
        "cod"
      )
    ).rejects.toThrow("Insufficient inventory");
  });
});
