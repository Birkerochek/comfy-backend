/**
 * order router
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/orders",
      handler: "order.create",
    },
    {
      method: "GET",
      path: "/orders",
      handler: "order.find",
    },
    {
      method: "GET",
      path: "/orders/:id",
      handler: "order.findOne",
    },
    {
      method: "PUT",
      path: "/orders/:id",
      handler: "order.update",
    },
    {
      method: "DELETE",
      path: "/orders/:id",
      handler: "order.delete",
    },
  ],
};
