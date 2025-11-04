/**
 * order controller
 */

import { factories } from "@strapi/strapi";
import { calculateOrderCommissions } from "../../../utils/calculateOrderCommissions";

const PLATFORM_COMMISSION_RATE = 0.08;

export default factories.createCoreController(
  "api::order.order",
  ({ strapi }) => ({
    async create(ctx) {
      const userId = ctx?.state?.user?.id;
      if (!userId) {
        return ctx.unauthorized("Authorization required");
      }

      const body = (ctx.request.body as any) ?? {};
      const rawData = (body.data ?? body) as Record<string, any>;

      // Generate unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create order
      const createdOrder = await strapi.entityService.create(
        "api::order.order",
        {
          data: {
            client: userId,
            order_number: orderNumber,
            total_amount: rawData.total_amount,
            status: "pending_payment",
            platform_commission_total: 0,
            developers_amount_total: 0,
            commission_breakdown: {},
            payment_status: "pending",
          },
        }
      );

      // If order items are provided, create them and calculate commissions
      if (rawData.items && Array.isArray(rawData.items)) {
        for (const item of rawData.items) {
          const itemTotal = Number(item.price_at_sale ?? 0);
          const platformCommission = Number(
            (itemTotal * PLATFORM_COMMISSION_RATE).toFixed(2)
          );
          const developerAmount = Number(
            (itemTotal - platformCommission).toFixed(2)
          );

          await strapi.entityService.create("api::order-item.order-item", {
            data: {
              order: createdOrder.id,
              product: item.product,
              quantity: item.quantity,
              price_at_sale: item.price_at_sale,
              delivery_days_base: item.delivery_days_base,
              product_title: item.product_title,
              developer: item.developer,
              platform_commission: platformCommission,
              developer_amount: developerAmount,
              selected_addons: item.selected_addons,
              addons_total_price: item.addons_total_price,
            },
          });
        }

        // Calculate and update order commissions
        await calculateOrderCommissions(strapi, Number(createdOrder.id));
      }

      // Return order with populated data
      const orderWithItems = await strapi.entityService.findOne(
        "api::order.order",
        createdOrder.id,
        {
          populate: ["items", "client"],
        }
      );

      ctx.body = orderWithItems;
    },
  })
);
