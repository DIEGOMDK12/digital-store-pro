import { ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Product } from "@shared/schema";
import { useStore } from "@/lib/store-context";

interface ProductCardProps {
  product: Product;
  themeColor?: string;
  textColor?: string;
}

export function ProductCard({ product, themeColor, textColor }: ProductCardProps) {
  const { addToCart, setIsCartOpen } = useStore();

  const hasDiscount = Number(product.originalPrice) > Number(product.currentPrice);
  const discountPercent = hasDiscount
    ? Math.round(
        ((Number(product.originalPrice) - Number(product.currentPrice)) /
          Number(product.originalPrice)) *
          100
      )
    : 0;

  const stockLines = product.stock?.split("\n").filter((line) => line.trim()) || [];
  const hasStock = stockLines.length > 0;

  const handleBuy = () => {
    if (hasStock) {
      addToCart(product);
      setIsCartOpen(true);
    }
  };

  return (
    <Card
      className="overflow-hidden flex flex-col"
      style={{ backgroundColor: "#1E1E1E" }}
      data-testid={`card-product-${product.id}`}
    >
      {/* Clickable Image and Title - Link to Product Details */}
      <Link href={`/product/${product.id}`}>
        <div
          className="relative aspect-square overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
          data-testid={`product-image-${product.id}`}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              data-testid={`img-product-${product.id}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-zinc-600" />
            </div>
          )}
          {hasDiscount && (
            <div
              className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold"
              style={{ backgroundColor: themeColor || "#3B82F6", color: "#fff" }}
              data-testid={`badge-discount-${product.id}`}
            >
              -{discountPercent}%
            </div>
          )}
          {!hasStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">Esgotado</span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-3 flex flex-col flex-1 gap-2">
        {/* Clickable Title - Link to Product Details */}
        <Link href={`/product/${product.id}`}>
          <h3
            className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: textColor || "#FFFFFF" }}
            data-testid={`text-product-name-${product.id}`}
          >
            {product.name}
          </h3>
        </Link>

        <div className="flex flex-col gap-0.5">
          {hasDiscount && (
            <span
              className="text-xs line-through opacity-60"
              style={{ color: textColor || "#FFFFFF" }}
              data-testid={`text-original-price-${product.id}`}
            >
              De R$ {Number(product.originalPrice).toFixed(2)}
            </span>
          )}
          <span
            className="text-lg font-bold"
            style={{ color: themeColor || "#3B82F6" }}
            data-testid={`text-current-price-${product.id}`}
          >
            R$ {Number(product.currentPrice).toFixed(2)}
          </span>
        </div>

        {/* Buy Button - Opens Side Cart */}
        <Button
          onClick={handleBuy}
          disabled={!hasStock}
          className="w-full mt-auto h-9 text-sm font-medium rounded-lg transition-opacity"
          style={{
            backgroundColor: hasStock ? themeColor || "#3B82F6" : "#4B5563",
            color: "#FFFFFF",
          }}
          data-testid={`button-buy-${product.id}`}
        >
          <ShoppingCart className="w-4 h-4 mr-1.5" />
          Comprar
        </Button>
      </div>
    </Card>
  );
}
