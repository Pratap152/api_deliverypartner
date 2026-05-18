const swaggerUi = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 5050;

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Rider API",
      version: "1.0.0",
      description: "Rider Backend APIs",
    },

    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? process.env.API_BASE_URL
            : `http://localhost:${PORT}`,
        description: "Main Server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },

  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

const swaggerSetup = (app) => {

  // swagger json
  app.get("/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // swagger ui
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      swaggerOptions: {
        url: "/swagger.json",
      },
    })
  );

  console.log(
    `Swagger Running -> ${
      process.env.NODE_ENV === "production"
        ? `${process.env.API_BASE_URL}/api-docs`
        : `http://localhost:${PORT}/api-docs`
    }`
  );
};

module.exports = { swaggerSetup };
