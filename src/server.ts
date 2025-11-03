//Server.ts
//École du WEB
//Programmation Web avancé
//©A2025
//
//Grandement inspiré du travail de William Levesque
//
// Configuration des paramètres dans le fichier .env
import dotenv from "dotenv";
dotenv.config();

// Chargement des dépendances
import express from "express";
import helmet from "helmet";
import cors from "cors";
import fs from 'fs';
import yaml from 'yamljs';
import path from "path";
import https from 'https';
import swaggerUi from 'swagger-ui-express';
import { authRouter } from "./routes/auth.routes";
import { errorHandler } from "./middleware/error.middleware";
import { authLookup } from "./middleware/authLookup.middleware";
import { receiveShipRouter, shipRouter } from "./routes/ship.routes";


const app = express();
const port = process.env.PORT || 3001;

//Chemins vers les certificats SSL générés par Certbot
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/alaindube.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/alaindube.com/fullchain.pem'),
};



app.use(helmet());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());


// Configuration des routes
//if (process.env.NODE_ENV === "development") {
//  console.log("Swagger activé en mode développement");
//  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
//}


app.use(
  "/swagger",
  swaggerUi.serve,
  swaggerUi.setup(yaml.load(path.join(__dirname, "./swagger.yml")))
);

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello depuis Pirate API en HTTPS !' });
});

app.get("/api/ping", (req, res) => {
  res.status(200).send('pong')
})

app.use("/api/auth", authLookup, authRouter());
app.use("/api/ships", shipRouter());
app.use("/api/ship", receiveShipRouter());

// Gestion des erreurs
app.use(errorHandler);

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
})







// Démarrer le serveur HTTPS
https.createServer(sslOptions, app).listen(port, () => {
  console.log(`Listening on port ${port}`);
  console.log("Ping    on ./api/ping");
  if (process.env.NODE_ENV === "development") {
    console.log(`Swagger on ./swagger`);
  }

});
