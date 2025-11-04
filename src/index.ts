// import type { Core } from '@strapi/strapi';
import type { Core } from "@strapi/strapi";
import * as Iron from "@hapi/iron";
import { recalcTotalProducts } from "./utils/recalcTotalProducts";
import "./utils/calculateOrderCommissions";
export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const jwtService = strapi.plugin("users-permissions").service("jwt");

    const validatePassword = (
      password: string
    ): { isValid: boolean; error?: string } => {
      if (!password || password.length < 8) {
        return {
          isValid: false,
          error: "Пароль должен содержать минимум 8 символов",
        };
      }
      if (!/[A-ZА-Я]/.test(password)) {
        return {
          isValid: false,
          error: "Пароль должен содержать минимум одну заглавную букву",
        };
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return {
          isValid: false,
          error: "Пароль должен содержать минимум один специальный символ",
        };
      }
      return { isValid: true };
    };

    strapi.server.use(async (ctx, next) => {
      // --- (1) Валидация при регистрации ---
      if (ctx.method === "POST" && ctx.path === "/api/auth/local/register") {
        const { password } = ctx.request.body;
        const validation = validatePassword(password);

        if (!validation.isValid) {
          return ctx.badRequest("Ошибка валидации", [
            { message: validation.error },
          ]);
        }
      }

      // вызываем оригинальный контроллер (Strapi login/register)
      await next();
      if (
        ctx.method === "POST" &&
        ctx.path === "/api/auth/local" &&
        ctx.body?.user &&
        ctx.body?.jwt
      ) {
        const plainUser: any = ctx.body.user;

        const userWithRole: any = await strapi.entityService.findOne(
          "plugin::users-permissions.user",
          plainUser.id,
          { populate: ["role"] }
        );

        const enhancedJwt = await jwtService.issue({
          id: userWithRole.id,
          role: userWithRole.role?.name ?? "authenticated",
        });

        ctx.body = {
          jwt: enhancedJwt,
          user: userWithRole,
        };
      }
      if (
        ctx.method === "POST" &&
        ctx.path === "/api/auth/local/register" &&
        ctx.body?.user
      ) {
        const createdUser: any = ctx.body.user;
        const { isDeveloper } = ctx.request.body as { isDeveloper?: boolean };

        const updateData: Record<string, any> = {
          full_name: createdUser.username,
        };

        if (isDeveloper) {
          const developerRole = await strapi.db
            .query("plugin::users-permissions.role")
            .findOne({ where: { type: "developer" } });

          if (developerRole) {
            updateData.role = developerRole.id;
          }
        }

        const updatedUser: any = await strapi.entityService.update(
          "plugin::users-permissions.user",
          createdUser.id,
          {
            data: updateData,
            populate: ["role"],
          }
        );

        const newJwt = await jwtService.issue({
          id: updatedUser.id,
          role: updatedUser.role?.name ?? "authenticated",
        });

        ctx.body = {
          jwt: newJwt,
          user: updatedUser,
        };
      }
    });
    if (process.env.BACKFILL_TOTAL_PRODUCTS === "true") {
      const users = await strapi.entityService.findMany(
        "plugin::users-permissions.user",
        {
          fields: ["id"],
        }
      );
      for (const u of users) await recalcTotalProducts(strapi, u.id);
      strapi.log.info("[bootstrap] Backfill total_products done");
    }
  },
};
