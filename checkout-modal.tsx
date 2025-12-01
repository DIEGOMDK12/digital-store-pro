import { useState } from "react";
import { X, Copy, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  themeColor?: string;
  textColor?: string;
}

export function CheckoutModal({ open, onClose, themeColor, textColor }: CheckoutModalProps) {
  const { cart, cartTotal, clearCart } = useStore();
  const { toast } = useToast();

  const PIX_KEY = "973.182.722-68";

  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [order, setOrder] = useState<{ id: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const finalTotal = Math.max(0, cartTotal - discount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    try {
      const response = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode)}`);
      const data = await response.json();

      if (data.valid) {
        const discountAmount = (cartTotal * data.discountPercent) / 100;
        setDiscount(discountAmount);
        toast({
          title: "Cupom aplicado!",
          description: `Desconto de ${data.discountPercent}% aplicado`,
        });
      } else {
        toast({
          title: "Cupom inválido",
          description: "Este cupom não existe ou está inativo",
          variant: "destructive",
        });
        setDiscount(0);
      }
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível validar o cupom",
        variant: "destructive",
      });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const createOrder = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido",
        variant: "destructive",
      });
      return;
    }

    if (!whatsapp.trim()) {
      toast({
        title: "WhatsApp obrigatório",
        description: "Por favor, insira seu número de WhatsApp",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingOrder(true);
    try {
      const response = await apiRequest("POST", "/api/orders", {
        email,
        whatsapp,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          price: item.product.currentPrice,
          quantity: item.quantity,
        })),
        couponCode: couponCode.trim() || undefined,
        discountAmount: discount > 0 ? discount.toString() : undefined,
        totalAmount: finalTotal.toString(),
      });

      const data = await response.json();
      setOrder(data);
    } catch (error: any) {
      toast({
        title: "Erro ao criar pedido",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleClose = () => {
    if (!order) {
      setEmail("");
      setWhatsapp("");
      setCouponCode("");
      setDiscount(0);
      onClose();
    }
  };

  const copyPixKey = async () => {
    await navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Chave copiada!",
      description: "Cole a chave no seu app de pagamento",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg w-[95vw] p-0 overflow-hidden"
        style={{ backgroundColor: "#1E1E1E", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <DialogHeader className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <DialogTitle style={{ color: textColor || "#FFFFFF" }}>
            {order ? "Pagamento PIX" : "Finalizar Compra"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {!order ? (
            <>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-center py-2"
                    style={{ color: textColor || "#FFFFFF" }}
                    data-testid={`cart-item-${item.product.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{item.product.name}</p>
                      <p className="text-xs opacity-60">Qtd: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium ml-2">
                      R$ {(Number(item.product.currentPrice) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Cupom de desconto"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1"
                  style={{
                    backgroundColor: "#242424",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: textColor || "#FFFFFF",
                  }}
                  data-testid="input-coupon"
                />
                <Button
                  variant="secondary"
                  onClick={applyCoupon}
                  disabled={isApplyingCoupon || !couponCode.trim()}
                  className="px-4"
                  data-testid="button-apply-coupon"
                >
                  {isApplyingCoupon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Aplicar"
                  )}
                </Button>
              </div>

              <div
                className="space-y-2 py-2"
                style={{ color: textColor || "#FFFFFF" }}
              >
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>R$ {cartTotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Desconto:</span>
                    <span>-R$ {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <span>Total:</span>
                  <span style={{ color: themeColor || "#3B82F6" }}>
                    R$ {finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label style={{ color: textColor || "#FFFFFF" }}>E-mail para entrega</Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    backgroundColor: "#242424",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: textColor || "#FFFFFF",
                  }}
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label style={{ color: textColor || "#FFFFFF" }}>Seu WhatsApp</Label>
                <Input
                  type="tel"
                  placeholder="11999999999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  style={{
                    backgroundColor: "#242424",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: textColor || "#FFFFFF",
                  }}
                  data-testid="input-whatsapp"
                />
              </div>

              <Button
                className="w-full h-10 font-medium rounded-lg"
                style={{ backgroundColor: themeColor || "#3B82F6", color: "#FFFFFF" }}
                onClick={createOrder}
                disabled={isCreatingOrder || !email.trim()}
                data-testid="button-pay"
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Confirmar Pedido e Ver Pix"
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-center">
                <h3 className="text-white font-bold mb-2">Pagar com PIX</h3>
                <p className="text-gray-400 text-sm mb-1">Chave CPF:</p>
                <p className="text-2xl text-green-400 font-mono font-bold select-all" data-testid="text-pix-key">{PIX_KEY}</p>
                <p className="text-xs text-gray-500 mt-2">Copie e pague no seu banco</p>
              </div>

              <Button
                className="w-full"
                style={{ backgroundColor: themeColor || "#3B82F6", color: "#FFFFFF" }}
                onClick={copyPixKey}
                data-testid="button-copy-pix-key"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Chave PIX
                  </>
                )}
              </Button>

              <div
                className="p-3 rounded-lg bg-gray-800 text-center"
                style={{ color: textColor || "#FFFFFF" }}
              >
                <p className="text-sm">Pedido #{order.id} criado com sucesso!</p>
                <p className="text-xs opacity-70 mt-1">Aguardando confirmação de pagamento pelo administrador</p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  clearCart();
                  setEmail("");
                  setCouponCode("");
                  setDiscount(0);
                  setOrder(null);
                  onClose();
                }}
                data-testid="button-close-order"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
