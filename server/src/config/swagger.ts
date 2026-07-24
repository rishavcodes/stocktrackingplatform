import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Tradebox API Documentation",
      version: "1.0.0",
      description:
        "Complete API documentation for the Tradebox trading platform backend. Covers authentication, admin operations, payments, scorecards, portfolios, courses, marketplace, broker integrations, and more.\n\n**Environments:**\n- Production: https://backend-api-prod.tradeboxlive.com\n- UAT: https://backend-test-uat.tradeboxlive.com",
    },
    servers: [
      {
        url: "/",
        description: "Current server (localhost or deployed environment)",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "JWT token obtained from /api/auth/signin. Used by verifyUserRATokenMiddleware for users, service providers, and admins.",
        },
        AdminBearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Admin-specific JWT token. Used by verifyAdminTokenMiddleware.",
        },
        AliceBlueSession: {
          type: "http",
          scheme: "bearer",
          description:
            "Alice Blue broker session token. Used by verifyAliceBlueSessionMiddleware.",
        },
      },
    },
    tags: [
      { name: "Health", description: "Health check endpoint" },
      { name: "Authentication", description: "Sign in, sign up, OTP, password reset" },
      { name: "Admin", description: "Admin dashboard operations (requires auth)" },
      { name: "Users", description: "User details, followers, subscribers" },
      { name: "Payments", description: "Checkout, wallets, transactions, Razorpay" },
      { name: "Score Cards", description: "Trading recommendations and scorecards" },
      { name: "Portfolios", description: "Portfolio CRUD operations" },
      { name: "Content Management", description: "Articles, videos, podcasts, events, services, coupons" },
      { name: "Home Data", description: "Homepage data - providers, articles, events, notifications" },
      { name: "Profile Updates", description: "Update user/provider/broker profiles" },
      { name: "Market Watch", description: "Market watch data endpoints" },
      { name: "Services", description: "Subscribed services, coupons, free trials" },
      { name: "Messaging", description: "Search members, conversations" },
      { name: "Email Settings", description: "Email preferences" },
      { name: "E-Sign", description: "Electronic signature operations" },
      { name: "Protean", description: "Protean template management" },
      { name: "WhatsApp", description: "WhatsApp integration" },
      { name: "Marketplace", description: "Marketplace CRUD and invitations" },
      { name: "Courses", description: "Course management for instructors" },
      { name: "Curriculum", description: "Course curriculum and lecture management" },
      { name: "Learning", description: "Course learning and progress tracking" },
      { name: "Packages", description: "Service package management" },
      { name: "Alice Blue Trading", description: "Alice Blue broker integration - orders, trades, margin" },
      { name: "Script Master", description: "Stock script data - symbols, expiries, strikes" },
      { name: "Telegram", description: "Telegram bot webhook management" },
      { name: "Utilities", description: "PAN verification, debug endpoints" },
    ],
  },
  apis: ["./src/docs/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
