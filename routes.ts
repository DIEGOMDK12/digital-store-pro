import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const ADMIN_USERNAME = "Diegomdk";
const ADMIN_PASSWORD = "506731Diego#";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const adminTokens = new Set<string>();

function isAuthenticated(token: string | undefined): boolean {
  return token ? adminTokens.has(token) : false;
}

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

function readSettings() {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("[Settings] Error reading settings file:", error);
    return {
      storeName: "Digital Store",
      logoUrl: "",
      themeColor: "#3B82F6",
      textColor: "#FFFFFF",
      pixKey: "973.182.722-68",
      pagseguroToken: "",
      pagseguroApiUrl: "",
      supportEmail: "support@goldstore.com",
      whatsappContact: "5585988007000"
    };
  }
}

function writeSettings(data: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
    console.log("[Settings] Settings saved successfully");
    return true;
  } catch (error) {
    console.error("[Settings] Error writing settings file:", error);
    return false;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const activeProducts = products.filter(p => p.active);
      res.json(activeProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const products = await storage.getProducts();
      const product = products.find(p => p.id === id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.get("/api/settings", (req, res) => {
    console.log("[GET /api/settings] Reading from settings.json");
    const settings = readSettings();
    const { pagseguroToken, ...publicSettings } = settings;
    res.json(publicSettings);
  });

  app.post("/api/settings", (req, res) => {
    console.log("[POST /api/settings] Request received with body:", req.body);
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!isAuthenticated(token)) {
      console.log("[POST /api/settings] Unauthorized - returning 401");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { storeName, logoUrl, themeColor, textColor, pixKey, pagseguroToken, pagseguroApiUrl, supportEmail, whatsappContact } = req.body;
    const currentSettings = readSettings();
    
    const updatedSettings = {
      storeName: storeName || currentSettings.storeName || "Digital Store",
      logoUrl: logoUrl || currentSettings.logoUrl || "",
      themeColor: themeColor || currentSettings.themeColor || "#3B82F6",
      textColor: textColor || currentSettings.textColor || "#FFFFFF",
      pixKey: pixKey || currentSettings.pixKey || "973.182.722-68",
      pagseguroToken: pagseguroToken || currentSettings.pagseguroToken || "",
      pagseguroApiUrl: pagseguroApiUrl || currentSettings.pagseguroApiUrl || "",
      supportEmail: supportEmail || currentSettings.supportEmail || "support@goldstore.com",
      whatsappContact: whatsappContact || currentSettings.whatsappContact || "5585988007000"
    };

    const success = writeSettings(updatedSettings);
    
    if (!success) {
      return res.status(500).json({ error: "Failed to save settings" });
    }

    const { pagseguroToken: token2, ...publicSettings } = updatedSettings;
    res.json(publicSettings);
  });

  app.get("/api/admin/orders", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/admin/orders/:id/approve", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const orderItems = await storage.getOrderItems(orderId);
      let deliveredContent = "";

      // FIFO Logic: Extract first lines from stock for each item
      for (const item of orderItems) {
        const product = await storage.getProduct(item.productId);
        if (product && product.stock) {
          const stockLines = product.stock.split("\n").filter(line => line.trim());
          
          if (stockLines.length < item.quantity) {
            return res.status(400).json({ 
              error: `Not enough stock for ${product.name}. Need ${item.quantity}, have ${stockLines.length}.` 
            });
          }
          
          // Pop the first 'quantity' lines
          for (let i = 0; i < item.quantity; i++) {
            deliveredContent += stockLines[i] + "\n";
          }

          // Update product with remaining stock
          const remainingStock = stockLines.slice(item.quantity).join("\n");
          await storage.updateProduct(item.productId, { stock: remainingStock });
        }
      }

      // Mark order as paid and save delivered content
      await storage.updateOrder(orderId, {
        status: "paid",
        deliveredContent: deliveredContent.trim(),
      });

      res.json({
        status: "paid",
        deliveredContent: deliveredContent.trim(),
      });
    } catch (error) {
      console.error("[POST /api/admin/orders/:id/approve] Error:", (error as any).message);
      res.status(500).json({ error: "Failed to approve order" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const orderId = parseInt(req.params.id);
      await storage.deleteOrder(orderId);
      res.json({ success: true });
    } catch (error) {
      console.error("[DELETE /api/orders/:id] Error:", (error as any).message);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  app.put("/api/admin/settings", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!isAuthenticated(token)) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { storeName, logoUrl, themeColor, textColor, pixKey, pagseguroToken, pagseguroApiUrl } = req.body;
      
      const settings = await storage.updateSettings({
        storeName: storeName || "Digital Store",
        logoUrl: logoUrl || null,
        themeColor: themeColor || "#3B82F6",
        textColor: textColor || "#FFFFFF",
        pixKey: pixKey || "",
        pagseguroToken: pagseguroToken || null,
        pagseguroApiUrl: pagseguroApiUrl || null,
      });

      const { pagseguroToken: token2, ...publicSettings } = settings;
      res.json(publicSettings);
    } catch (error) {
      console.error("Settings update error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.get("/api/coupons/validate", async (req, res) => {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.json({ valid: false });
      }

      const coupon = await storage.getCouponByCode(code.toUpperCase());
      if (coupon && coupon.active) {
        res.json({ valid: true, discountPercent: coupon.discountPercent });
      } else {
        res.json({ valid: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to validate coupon" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { email, whatsapp, items, couponCode, discountAmount, totalAmount } = req.body;

      console.log("[POST /api/orders] Received order request:", { email, whatsapp, itemCount: items?.length });

      if (!email || !whatsapp || !items || items.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      try {
        const order = await storage.createOrder({
          email,
          whatsapp: whatsapp || null,
          status: "pending",
          paymentMethod: "pix_manual",
          totalAmount,
          couponCode: couponCode || null,
          discountAmount: discountAmount || null,
          pixCode: null,
          pixQrCode: null,
          pagseguroOrderId: null,
          deliveredContent: null,
        });

        console.log("[POST /api/orders] Order created successfully:", order.id);

        for (const item of items) {
          await storage.createOrderItem({
            orderId: order.id,
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
          });
        }

        console.log("[POST /api/orders] Order items created");

        res.json({
          id: order.id,
          status: "pending",
        });
      } catch (dbError: any) {
        console.error("[POST /api/orders] Database error details:", {
          message: dbError.message,
          code: dbError.code,
          detail: dbError.detail,
          stack: dbError.stack,
        });
        throw dbError;
      }
    } catch (error: any) {
      console.error("[POST /api/orders] Order creation error:", error);
      res.status(500).json({ 
        error: "Failed to create order",
        details: error.message || "Unknown error"
      });
    }
  });

  app.get("/api/orders/:id/status", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.status === "paid") {
        return res.json({
          status: order.status,
          deliveredContent: order.deliveredContent,
        });
      }

      const settings = await storage.getSettings();
      
      if (settings?.pagseguroToken && settings?.pagseguroApiUrl && order.pagseguroOrderId) {
        try {
          const statusResponse = await fetch(
            `${settings.pagseguroApiUrl}/orders/${order.pagseguroOrderId}`,
            {
              headers: {
                "Authorization": `Bearer ${settings.pagseguroToken}`,
              },
            }
          );

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const charge = statusData.charges?.[0];
            
            if (charge?.status === "PAID") {
              const orderItems = await storage.getOrderItems(orderId);
              let deliveredContent = "";

              for (const item of orderItems) {
                const product = await storage.getProduct(item.productId);
                if (product && product.stock) {
                  const stockLines = product.stock.split("\n").filter(line => line.trim());
                  
                  for (let i = 0; i < item.quantity && i < stockLines.length; i++) {
                    deliveredContent += stockLines[i] + "\n";
                  }

                  const remainingStock = stockLines.slice(item.quantity).join("\n");
                  await storage.updateProduct(item.productId, { stock: remainingStock });
                }
              }

              await storage.updateOrder(orderId, {
                status: "paid",
                deliveredContent: deliveredContent.trim(),
              });

              return res.json({
                status: "paid",
                deliveredContent: deliveredContent.trim(),
              });
            }
          }
        } catch (pagseguroError) {
          console.error("PagSeguro status check error:", pagseguroError);
        }
      }

      res.json({ status: order.status });
    } catch (error) {
      res.status(500).json({ error: "Failed to check order status" });
    }
  });

  app.post("/api/orders/:id/simulate-payment", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const orderItems = await storage.getOrderItems(orderId);
      let deliveredContent = "";

      for (const item of orderItems) {
        const product = await storage.getProduct(item.productId);
        if (product && product.stock) {
          const stockLines = product.stock.split("\n").filter(line => line.trim());
          
          for (let i = 0; i < item.quantity && i < stockLines.length; i++) {
            deliveredContent += stockLines[i] + "\n";
          }

          const remainingStock = stockLines.slice(item.quantity).join("\n");
          await storage.updateProduct(item.productId, { stock: remainingStock });
        }
      }

      await storage.updateOrder(orderId, {
        status: "paid",
        deliveredContent: deliveredContent.trim(),
      });

      res.json({
        status: "paid",
        deliveredContent: deliveredContent.trim(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to simulate payment" });
    }
  });

  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = generateToken();
      adminTokens.add(token);
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, error: "Invalid credentials" });
    }
  });

  app.get("/api/admin/products", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/admin/products", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log("[POST /api/admin/products] Full request body:", JSON.stringify(req.body, null, 2));
      
      // Extract only the fields that exist in the database
      const productData = {
        name: req.body.name,
        description: req.body.description || null,
        imageUrl: req.body.imageUrl || null,
        originalPrice: req.body.originalPrice,
        currentPrice: req.body.currentPrice,
        stock: req.body.stock || "",
        category: req.body.category || "Outros",
        active: req.body.active ?? true,
      };
      
      console.log("[POST /api/admin/products] Creating with data:", JSON.stringify(productData, null, 2));
      const product = await storage.createProduct(productData);
      console.log("[POST /api/admin/products] Successfully created product:", product);
      res.json(product);
    } catch (error) {
      const errorObj = error as any;
      console.error("[POST /api/admin/products] CRITICAL ERROR:", {
        message: errorObj.message,
        code: errorObj.code,
        detail: errorObj.detail,
        column: errorObj.column,
        table: errorObj.table,
        constraint: errorObj.constraint,
        fullError: errorObj.toString(),
      });
      res.status(500).json({ error: "Failed to create product: " + errorObj.message });
    }
  });

  app.put("/api/admin/products/:id", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const updateData = {
        name: req.body.name,
        description: req.body.description || null,
        imageUrl: req.body.imageUrl || null,
        originalPrice: req.body.originalPrice,
        currentPrice: req.body.currentPrice,
        stock: req.body.stock || "",
        category: req.body.category || "Outros",
        active: req.body.active,
      };
      console.log("[PUT /api/admin/products/:id] Updating product", id, "with:", updateData);
      const product = await storage.updateProduct(id, updateData);
      res.json(product);
    } catch (error) {
      const errorObj = error as any;
      console.error("[PUT /api/admin/products/:id] CRITICAL ERROR:", {
        message: errorObj.message,
        code: errorObj.code,
        detail: errorObj.detail,
      });
      res.status(500).json({ error: "Failed to update product: " + errorObj.message });
    }
  });

  app.delete("/api/admin/products/:id", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/coupons", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const coupons = await storage.getCoupons();
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch coupons" });
    }
  });

  app.post("/api/admin/coupons", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const coupon = await storage.createCoupon({
        code: req.body.code.toUpperCase(),
        discountPercent: req.body.discountPercent,
        active: req.body.active ?? true,
      });
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Failed to create coupon" });
    }
  });

  app.delete("/api/admin/coupons/:id", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      await storage.deleteCoupon(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete coupon" });
    }
  });

  app.get("/api/admin/settings", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      let settings = await storage.getSettings();
      if (!settings) {
        settings = await storage.updateSettings({
          storeName: "Digital Store",
          themeColor: "#3B82F6",
          textColor: "#FFFFFF",
          pixKey: "",
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Admin settings fetch error:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/admin/settings", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!isAuthenticated(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const settings = await storage.updateSettings({
        storeName: req.body.storeName,
        logoUrl: req.body.logoUrl || null,
        themeColor: req.body.themeColor,
        textColor: req.body.textColor,
        pagseguroToken: req.body.pagseguroToken || null,
        pagseguroApiUrl: req.body.pagseguroApiUrl || null,
      });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  return httpServer;
}
