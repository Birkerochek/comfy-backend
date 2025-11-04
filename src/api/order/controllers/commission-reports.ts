/**
 * Commission reports controller
 */

import { factories } from "@strapi/strapi";

export default {
  async getPlatformCommissions(ctx) {
    const { startDate, endDate } = ctx.query;

    const filters: any = {
      status: { $in: ["paid", "completed"] },
    };

    if (startDate && endDate) {
      filters.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const orders = (await strapi.entityService.findMany("api::order.order", {
      filters,
      fields: ["platform_commission_total", "total_amount", "createdAt"],
      populate: ["client"],
    })) as any[];

    const totalPlatformCommission = orders.reduce(
      (sum, order) => sum + Number(order.platform_commission_total || 0),
      0
    );

    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );

    ctx.body = {
      totalPlatformCommission,
      totalRevenue,
      ordersCount: orders.length,
      orders: orders.map((order) => ({
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        platform_commission: order.platform_commission_total,
        created_at: order.createdAt,
        client: order.client,
      })),
    };
  },

  async getDeveloperCommissions(ctx) {
    const { developerId, startDate, endDate } = ctx.query;

    if (!developerId) {
      return ctx.badRequest("Developer ID is required");
    }

    const filters: any = {
      status: { $in: ["paid", "completed"] },
      "items.developer": developerId,
    };

    if (startDate && endDate) {
      filters.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const orders = (await strapi.entityService.findMany("api::order.order", {
      filters,
      populate: ["items"],
    })) as any[];

    // Calculate developer's total earnings
    let developerTotal = 0;
    const developerOrders = [];

    for (const order of orders) {
      const developerItems =
        order.items?.filter(
          (item: any) => item.developer?.id === Number(developerId)
        ) || [];

      const developerOrderTotal = developerItems.reduce(
        (sum, item) => sum + Number(item.developer_amount || 0),
        0
      );

      if (developerOrderTotal > 0) {
        developerTotal += developerOrderTotal;
        developerOrders.push({
          order_id: order.id,
          order_number: order.order_number,
          total_amount: developerOrderTotal,
          items_count: developerItems.length,
          created_at: order.createdAt,
        });
      }
    }

    ctx.body = {
      developerId: Number(developerId),
      totalEarnings: developerTotal,
      ordersCount: developerOrders.length,
      orders: developerOrders,
    };
  },
};
