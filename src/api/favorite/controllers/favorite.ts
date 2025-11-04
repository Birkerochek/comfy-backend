/**
 * favorite controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::favorite.favorite",
  ({ strapi }) => ({
    async delete(ctx) {
      const { id } = ctx.params;

      // Получаем запись избранного
      const favorite = await strapi.entityService.findOne(
        "api::favorite.favorite",
        id
      );

      if (!favorite) {
        return ctx.notFound("Favorite not found");
      }

      // Выполняем hard delete (полное удаление)
      await strapi.entityService.delete("api::favorite.favorite", id);

      return ctx.send({ message: "Favorite deleted successfully" });
    },
  })
);
