import type { Core } from "@strapi/strapi";

interface OrderItemData {
  product_title: string;
  developer: number;
  platform_commission: number;
  developer_amount: number;
  total_price: number;
}

export async function calculateOrderCommissions(
  strapi: Core.Strapi,
  orderId: number
) {
  // Get all order items with commission data
  const orderItems = (await strapi.entityService.findMany(
    "api::order-item.order-item",
    {
      filters: { order: { id: orderId } },
      populate: ["developer"] as any,
    }
  )) as any[];

  // Calculate totals
  const platformCommissionTotal = orderItems.reduce(
    (sum, item) => sum + Number(item.platform_commission || 0),
    0
  );

  const developersAmountTotal = orderItems.reduce(
    (sum, item) => sum + Number(item.developer_amount || 0),
    0
  );

  // Create commission breakdown by developer
  const commissionBreakdown = orderItems.reduce(
    (breakdown, item) => {
      const developerId =
        typeof item.developer === "object" && item.developer !== null
          ? item.developer.id
          : item.developer;

      if (!developerId) {
        return breakdown;
      }
      if (!breakdown[developerId]) {
        breakdown[developerId] = {
          developer_id: developerId,
          total_amount: 0,
          items_count: 0,
          items: [],
        };
      }

      breakdown[developerId].total_amount += Number(item.developer_amount || 0);
      breakdown[developerId].items_count += 1;
      breakdown[developerId].items.push({
        product_title: item.product_title,
        amount: Number(item.developer_amount || 0),
      });

      return breakdown;
    },
    {} as Record<number, any>
  );

  // Update order with commission data
  await strapi.entityService.update("api::order.order", orderId, {
    data: {
      platform_commission_total: platformCommissionTotal,
      developers_amount_total: developersAmountTotal,
      commission_breakdown: commissionBreakdown,
    },
  });

  return {
    platformCommissionTotal,
    developersAmountTotal,
    commissionBreakdown,
  };
}
