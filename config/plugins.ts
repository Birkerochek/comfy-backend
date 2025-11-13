export default ({ env }) => ({
  "users-permissions": {
    config: {
      register: {
        allowedFields: [
          "username",
          "email",
          "password",
          "full_name",
          "isDeveloper",
        ],
      },
    },
  },
  "strapi-v5-http-only-auth": {
    enabled: true,
    config: {
      // Default cookie settings
      cookieOptions: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: process.env.AUTH_COOKIE_SAME_SITE ?? "lax",
        domain: process.env.AUTH_COOKIE_DOMAIN ?? "127.0.0.1",
        path: "/",
      },
      deleteJwtFromResponse: false,
    },
  },
 
  meilisearch: {
    config: {
      host: env("MEILI_HOST", "http://127.0.0.1:7700"),
      apiKey: env("MEILI_MASTER_KEY", "2154gifskdlfsdp012"),

      // Указываем content-type "Product"
      product: {
        indexName: "products",

        entriesQuery: {
          populate: {
            developer: { fields: ["username", "email", "full_name"] },
            categories: { fields: ["name", "slug"] },
            media_items: {
              populate: {
                media: { fields: ["url", "name"] },
              },
              fields: ["type", "sort_order"],
            },
          },
        },

        transformEntry({ entry }) {
          const toNumber = (v: any) =>
            v === null || v === undefined ? null : Number(v);

          const pickThumb = (items?: any[]): string | null => {
            if (!Array.isArray(items)) return null;
            const weight = (t?: string) =>
              t === "preview" ? 0 : t === "screenshot" ? 1 : 2;
            const ordered = [...items].sort(
              (a, b) => weight(a?.type) - weight(b?.type)
            );
            for (const it of ordered) {
              const first = Array.isArray(it?.media) ? it.media[0] : null;
              if (first?.url) return first.url as string;
            }
            return null;
          };

          const developer = entry.developer || {};
          const developer_name =
            developer.full_name ||
            developer.username ||
            developer.email ||
            null;

          const categories = Array.isArray(entry.categories)
            ? entry.categories.map((c: any) => c?.name).filter(Boolean)
            : [];

          return {
            id: entry.id,
            title: entry.title,
            slug: entry.slug,
            short_description: entry.short_description,
            full_description: entry.full_description,
            trailer_url: entry.trailer_url ?? null,

            price_base: toNumber(entry.price_base),
            price: toNumber(entry.price),
            discount: toNumber(entry.discount) ?? 0,
            delivery_days_base: toNumber(entry.delivery_days_base),
            max_sales_count: toNumber(entry.max_sales_count),
            views: toNumber(entry.views) ?? 0,

            developer_name:
              developer.full_name ||
              developer.username ||
              developer.email ||
              null,
            developer_username: developer.username ?? null,
            categories,
            thumb_url: pickThumb(entry.media_items),

            createdAt: entry.createdAt ?? null,
            updatedAt: entry.updatedAt ?? null,
          };
        },

        settings: {
          searchableAttributes: [
            "title",
            "slug",
            "short_description",
            "full_description",
            "categories",
            "developer_name",
          ],
          filterableAttributes: [
            "categories",
            "discount",
            "delivery_days_base",
          ],
          sortableAttributes: [
            "views",
            "price_base",
            "price",
            "discount",
            "createdAt",
          ],
          rankingRules: [
            "words",
            "typo",
            "proximity",
            "attribute",
            "exactness",
          ],
        },
      },
    },
  },
});
