import "reflect-metadata";
import helmet from "helmet";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { requireJwtSecret } from "./modules/auth/jwt-secret";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "5mb" }));
  app.use(urlencoded({ extended: true, limit: "5mb" }));
  const config = app.get(ConfigService);
  requireJwtSecret(config);
  app.use(
    helmet({
      // The default CSP's script-src/style-src 'self' blocks Swagger UI's inline bootstrap script and
      // styles at /api/docs; this API serves no other HTML, so relaxing those two directives is scoped
      // to that page without weakening protection for the JSON endpoints.
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", "'unsafe-inline'"],
          "style-src": ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  const corsOrigin = config.get<string>("CORS_ORIGIN") ?? "http://localhost:5173";
  const localCorsOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
  const corsOrigins = Array.from(
    new Set([
      ...corsOrigin
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
      ...localCorsOrigins,
    ]),
  );

  app.enableCors({ origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins, credentials: true });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("AmarKrishok API")
    .setDescription("Backend API for crop lots, buyer orders, admin verification, market prices, and chat.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = config.get<number>("PORT") ?? 4000;
  await app.listen(port);
}

void bootstrap();
