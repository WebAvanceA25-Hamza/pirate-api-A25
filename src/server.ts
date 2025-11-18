// Server.ts
// École du WEB
// Programmation Web avancé
// ©A2025
//
// Grandement inspiré du travail de William Levesque
//
// ⚠️ IMPORTANT : Comme Nginx gère déjà le SSL (terminaison HTTPS),
// il est inutile de charger les certificats dans Node.
// On démarre donc le serveur en HTTP simple derrière Nginx.

import dotenv from "dotenv";
dotenv.config();

// Dépendances principales
import express from "express";
import helmet from "helmet"; // Sécurité des headers HTTP
import cors from "cors";     // Gestion des CORS
import yaml from "yamljs";   // Chargement du fichier swagger.yml
import path from "path";
import swaggerUi from "swagger-ui-express";

// Routes et middlewares personnalisés
import { authRouter } from "./routes/auth.routes";
import { errorHandler } from "./middleware/error.middleware";
import { authLookup } from "./middleware/authLookup.middleware";
import { receiveShipRouter, shipRouter } from "./routes/ship.routes";

const app = express();
const port = process.env.PORT || 3001;

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware pour parser le JSON
app.use(express.json());

// Swagger (documentation API)
app.use(
  "/swagger",
  swaggerUi.serve,
  swaggerUi.setup(yaml.load(path.join(__dirname, "./swagger.yml")))
);

// Exemple de route simple
app.get("/hello", (req, res) => {
  res.json({ message: "Hello depuis Pirate API derrière Nginx !" });
});

// Route de santé (health check)
app.get("/api/ping", (req, res) => {
  res.status(200).send("pong");
});

// Routes principales
app.use("/api/auth", authLookup, authRouter());
app.use("/api/ships", shipRouter());
app.use("/api/ship", receiveShipRouter());

// Middleware de gestion des erreurs
app.use(errorHandler);

// Gestion des exceptions non interceptées
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// 🚀 Démarrage du serveur en HTTP simple
// ⚠️ Note : Nginx écoute en HTTPS et reverse proxy vers ce serveur HTTP.
//           C'est la bonne pratique : un seul point gère le SSL (Nginx).
app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on port ${port}`);
  console.log("Ping    on ./api/ping");
  console.log("Swagger on ./swagger");
});
