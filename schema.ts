import { pgTable, text, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
  stock: text("stock").notNull().default(""),
  category: text("category").default("Outros"),
  instructions: text("instructions"),
  warranty: text("warranty"),
  active: boolean("active").notNull().default(true),
});

export const orders = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull(),
  whatsapp: text("whatsapp"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull().default("pix_auto"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  pixCode: text("pix_code"),
  pixQrCode: text("pix_qr_code"),
  pagseguroOrderId: text("pagseguro_order_id"),
  deliveredContent: text("delivered_content"),
  couponCode: text("coupon_code"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
  imei: text("imei"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const coupons = pgTable("coupons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent").notNull(),
  active: boolean("active").notNull().default(true),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  storeName: text("store_name").notNull().default("Digital Store"),
  logoUrl: text("logo_url"),
  themeColor: text("theme_color").notNull().default("#3B82F6"),
  textColor: text("text_color").notNull().default("#FFFFFF"),
  pagseguroToken: text("pagseguro_token"),
  pagseguroApiUrl: text("pagseguro_api_url"),
  pixKey: text("pix_key").default(""),
  supportEmail: text("support_email").default("support@goldstore.com"),
  whatsappContact: text("whatsapp_contact").default("5585988007000"),
});

export const insertProductSchema = createInsertSchema(products, {
  id: z.number().optional(),
});
export const insertOrderSchema = createInsertSchema(orders, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
});
export const insertOrderItemSchema = createInsertSchema(orderItems, {
  id: z.number().optional(),
});
export const insertCouponSchema = createInsertSchema(coupons, {
  id: z.number().optional(),
});
export const insertSettingsSchema = createInsertSchema(settings, {
  id: z.number().optional(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
