import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { CartPanel } from "@/components/cart-panel";
import { CheckoutModal } from "@/components/checkout-modal";
import { DeliveryModal } from "@/components/delivery-modal";
import { StoreHeader } from "@/components/store-header";
import { useStore } from "@/lib/store-context";
import type { Product, Settings } from "@shared/schema";

export default function Home() {
  const { setSettings } = useStore();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [deliveryContent, setDeliveryContent] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setSettings(settings);
      document.title = `${settings.storeName || "Digital Store"} - Produtos Digitais`;
    }
  }, [settings, setSettings]);

  const themeColor = settings?.themeColor || "#3B82F6";
  const textColor = settings?.textColor || "#FFFFFF";

  const activeProducts = products?.filter((p) => p.active) || [];
  
  // Extract unique categories from products
  const uniqueCategories = Array.from(
    new Set(activeProducts.map((p) => p.category || "Outros").filter(Boolean))
  ).sort();

  // Filter products by selected category
  const filteredProducts = selectedCategory
    ? activeProducts.filter((p) => (p.category || "Outros") === selectedCategory)
    : activeProducts;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#121212" }}>
      <StoreHeader
        themeColor={themeColor}
        textColor={textColor}
        storeName={settings?.storeName}
        logoUrl={settings?.logoUrl || undefined}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!productsLoading && uniqueCategories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              style={{
                backgroundColor: selectedCategory === null ? themeColor : "transparent",
                color: selectedCategory === null ? "#FFFFFF" : textColor,
                borderColor: selectedCategory === null ? themeColor : "rgba(255,255,255,0.2)",
              }}
              onClick={() => setSelectedCategory(null)}
              data-testid="filter-all-categories"
            >
              Todos
            </Button>
            {uniqueCategories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                style={{
                  backgroundColor: selectedCategory === category ? themeColor : "transparent",
                  color: selectedCategory === category ? "#FFFFFF" : textColor,
                  borderColor: selectedCategory === category ? themeColor : "rgba(255,255,255,0.2)",
                }}
                onClick={() => setSelectedCategory(category)}
                data-testid={`filter-category-${category}`}
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {productsLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: themeColor }}
            />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center min-h-[50vh] text-center"
            style={{ color: textColor, opacity: 0.6 }}
          >
            <p className="text-lg">Nenhum produto disponível no momento</p>
            <p className="text-sm mt-1">Volte em breve!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                themeColor={themeColor}
                textColor={textColor}
              />
            ))}
          </div>
        )}
      </main>

      <CartPanel
        onCheckout={() => setIsCheckoutOpen(true)}
        themeColor={themeColor}
        textColor={textColor}
      />

      <CheckoutModal
        open={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        themeColor={themeColor}
        textColor={textColor}
      />

      <DeliveryModal
        open={!!deliveryContent}
        onClose={() => setDeliveryContent(null)}
        content={deliveryContent || ""}
        themeColor={themeColor}
        textColor={textColor}
      />
    </div>
  );
}
