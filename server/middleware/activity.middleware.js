function trackActivity(req, res, next) {
  res.on("finish", () => {
    if (req.user && res.statusCode < 500) {
      const route = req.route ? req.route.path : req.originalUrl.replace(/^\/api/, "") || req.path;
      const method = req.method;
      const userAgent = req.get("user-agent") || "";
      const ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "";

      require("../utils/db")
        .createActivityLog(req.user.id, route, method, userAgent, ipAddress)
        .catch(() => {});
    }
  });

  next();
}

module.exports = {
  trackActivity
};
