/**
 * Commission reports router
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/commission-reports/platform",
      handler: "commission-reports.getPlatformCommissions",
    },
    {
      method: "GET",
      path: "/commission-reports/developer/:developerId",
      handler: "commission-reports.getDeveloperCommissions",
    },
  ],
};
