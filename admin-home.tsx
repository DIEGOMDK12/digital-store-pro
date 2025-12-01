import { useQuery } from "@tanstack/react-query";
import { TrendingUp, AlertCircle, ShoppingCart, DollarSign, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product, Order } from "@shared/schema";

export default function AdminHome() {
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const getStockCount = (stock: string | null) => {
    if (!stock) return 0;
    return stock.split("\n").filter((line) => line.trim()).length;
  };

  const totalOrders = orders?.length || 0;
  const pendingPayments = orders?.filter((o) => o.status === "pending").length || 0;
  const lowStockAlerts = products?.filter((p) => p.active && getStockCount(p.stock) <= 5).length || 0;
  const totalRevenue = orders
    ?.filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0) || 0;

  const isLoading = productsLoading || ordersLoading;

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtext,
  }: {
    title: string;
    value: string | number;
    icon: typeof TrendingUp;
    color: string;
    subtext?: string;
  }) => (
    <div
      className="p-6 rounded-lg border"
      style={{ backgroundColor: "#1E1E1E", borderColor: "rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-2">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Resumo da sua loja digital</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Pedidos"
          value={totalOrders}
          icon={ShoppingCart}
          color="#14B8A6"
          subtext={`${pendingPayments} pendente${pendingPayments !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Pagamentos Pendentes"
          value={pendingPayments}
          icon={AlertCircle}
          color="#F59E0B"
          subtext="Aguardando confirmação"
        />
        <StatCard
          title="Estoque Baixo"
          value={lowStockAlerts}
          icon={AlertCircle}
          color="#EF4444"
          subtext="≤ 5 unidades"
        />
        <StatCard
          title="Receita Total"
          value={`R$ ${totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          color="#10B981"
          subtext="Pedidos completos"
        />
      </div>

      {/* Recent Orders */}
      <div
        className="p-6 rounded-lg border"
        style={{ backgroundColor: "#1E1E1E", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Pedidos Recentes</h3>
        {orders && orders.length > 0 ? (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: "#242424" }}
              >
                <div>
                  <p className="text-white font-medium">#{order.id}</p>
                  <p className="text-xs text-gray-400">{order.customerEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">R$ {Number(order.totalAmount).toFixed(2)}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded inline-block mt-1 ${
                      order.status === "completed"
                        ? "bg-green-500/20 text-green-400"
                        : order.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {order.status === "completed"
                      ? "Completo"
                      : order.status === "pending"
                        ? "Pendente"
                        : "Cancelado"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Nenhum pedido ainda</p>
        )}
      </div>
    </div>
  );
}
