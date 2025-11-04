/**
 * cart-item controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::cart-item.cart-item",
  ({ strapi }) => ({
    async create(ctx) {
      const userId = ctx?.state?.user?.id;
      if (!userId) {
        return ctx.unauthorized("Authorization required");
      }

      const body = (ctx.request.body as any) ?? {};
      const rawData = (body.data ?? body) as Record<string, any>;

      // Debug: log the received data
      strapi.log.info(
        "[cart-item] Full request body:",
        JSON.stringify(body, null, 2)
      );
      strapi.log.info(
        "[cart-item] Raw data:",
        JSON.stringify(rawData, null, 2)
      );

      // Ensure product and quantity exist in payload
      const product = rawData.product;
      const quantity = Number(rawData.quantity ?? 1);
      const productTitle = rawData.product_title;
      const productPrice = rawData.product_price;
      const selectedAddons = rawData.selected_addons;
      const addonsTotalPrice = rawData.addons_total_price ?? 0;

      if (!product) {
        return ctx.badRequest('Field "product" is required');
      }
      if (!productTitle) {
        return ctx.badRequest('Field "product_title" is required');
      }
      if (productPrice === undefined || productPrice === null) {
        return ctx.badRequest('Field "product_price" is required');
      }

      // Find or create an active cart for the user
      const existing = await strapi.entityService.findMany("api::cart.cart", {
        filters: { user: { id: userId }, status: "active" },
        fields: ["id"],
        limit: 1,
      });

      const cartId =
        existing?.[0]?.id ??
        (
          await strapi.entityService.create("api::cart.cart", {
            data: { user: userId, status: "active", total_amount: 0 },
          })
        ).id;

      // Normalize product relation (accept id or object)
      const productId = typeof product === "object" ? product.id : product;

      // Get product with developer info for commission calculation
      const productData = (await strapi.entityService.findOne(
        "api::product.product",
        productId,
        {
          populate: ["developer"],
        }
      )) as any;

      if (!productData) {
        return ctx.badRequest("Product not found");
      }

      // Calculate commission (15% platform, 85% developer)
      const platformCommissionRate = 0.08;
      const developerCommissionRate = 0.92;

      const platformCommission =
        Number(rawData.total_price) * platformCommissionRate;
      const developerAmount =
        Number(rawData.total_price) * developerCommissionRate;

      // Create the cart item attached to the cart
      const createdItem = await strapi.entityService.create(
        "api::cart-item.cart-item",
        {
          data: {
            cart: cartId,
            product: productId,
            quantity,
            total_price: rawData.total_price,
            product_title: productTitle,
            product_price: productPrice,
            selected_addons: selectedAddons,
            addons_total_price: addonsTotalPrice,
            developer: productData.developer?.id,
            platform_commission: platformCommission,
            developer_amount: developerAmount,
          },
          populate: ["product", "cart", "developer"],
        }
      );

      // Recalculate cart total_amount from items' total_price
      try {
        const items = await strapi.entityService.findMany(
          "api::cart-item.cart-item",
          {
            filters: { cart: { id: cartId } },
            fields: ["total_price"],
            limit: 1000,
          }
        );
        const total = (items as any[]).reduce(
          (sum, it) => sum + Number(it.total_price ?? 0),
          0
        );
        await strapi.entityService.update("api::cart.cart", cartId, {
          data: { total_amount: total },
        });
      } catch (e) {
        strapi.log.warn(
          `[cart] Failed to recalc total for cart ${cartId}: ${e}`
        );
      }

      ctx.body = createdItem;
    },
  })
);
