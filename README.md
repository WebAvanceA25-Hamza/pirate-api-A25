## Pirate API

API pour le projet dans le cours de **Programmation Web Avancé**

## Historique du projet

- **Code initial** : William Levesque, étudiant A2025  
- **Modifications par** : Alain Dubé
  - Ajout du fichier `README.md`
  - Ajout de la fonctionnalité HTTPS

 
## Structure et signification

| Élément | Description |
|----------|--------------|
| **README.md** | Documentation du projet |
| **deploy.sh** | Script de déploiement (bash) |
| **drizzle/** | Dossier contenant les migrations ou schémas générés par Drizzle ORM |
| **drizzle.config.ts** | Configuration de Drizzle (souvent indique le type de base de données) |
| **package.json** | Liste des dépendances Node.js |
| **pirate-api.service** | Fichier principal ou un service de l’API |
| **src/** | Code source TypeScript (routes, contrôleurs, etc.) |
| **tsconfig.json** | Configuration TypeScript |

---

## Environnement du projet

- Express 5 pour le serveur HTTP  
- Drizzle ORM avec MySQL (`mysql2`)  
- JWT pour l’authentification  
- Swagger UI pour la documentation API  
- Helmet, CORS, pour la sécurité et les en-têtes HTTP  
- Jest + ESLint pour les tests et la qualité du code  
- tsx pour lancer directement du TypeScript sans compilation manuelle  

---


## Pré-requis

- Avoir Apache (ou NGINX) et un certificat HTTPS

### Procédures

**Ouvrir le port 443**  
```bash
sudo ufw allow 443
```

**Installer CertBot**  
```bash
sudo apt update
sudo apt install certbot
sudo apt install python3-certbot-apache  # ou python3-certbot-nginx
```

**Générer le certificat**  
```bash
sudo certbot --apache -d alaindube.com -d www.alaindube.com
```

**Tester le renouvellement automatique**  
```bash
sudo certbot renew --dry-run
```

---
## Installation des applications et dépendances

### Dépendances principales
```bash
npm install express drizzle-orm
```

### Dépendances pour TypeScript
```bash
npm install -D typescript ts-node @types/node @types/express
```

### Autres dépendances utiles
```bash
npm install dotenv cors
npm install -D nodemon
```

### Pour l'utilisation de drizzle-kit (importer la base de données)
```bash
npm install drizzle-orm pg
```

### Installation complète des dépendances
```bash
npm install
```

---

## Configuration du fichier `.env`

Créez un fichier `.env` à la racine du projet (changer les informations pour votre réalité):
```bash
# Connexion à la base de données (format décomposé)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=pirate_user
DB_PASSWORD=motdepasseSecret123
DB_DATABASE=pirate

# Configuration de l'application
PORT=2223
JWT_SECRET=secretTexte123
NODE_ENV=development

baseUrl=https://alaindube.com:2223/api

BROKER_CLIENT_SECRET=86cb073d0432640662eb6d3af9e3bc825ed34852abfd158483e293be22bee13e
BROKER_CLIENT_ID=app_e8b1de42eb39c53f09e6783a18e1a5a7
```

---

## Installation et configuration de MySQL sous Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install mysql-server -y
sudo systemctl status mysql
sudo systemctl start mysql
sudo systemctl enable mysql
sudo mysql_secure_installation
```

### Création de la base de données et de l'utilisateur

```bash
sudo mysql -u root -p
CREATE DATABASE pirate;
CREATE USER 'pirate_user'@'localhost' IDENTIFIED BY 'motdepasse123';
GRANT ALL PRIVILEGES ON pirate.* TO 'pirate_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Initialisation de la base de données avec Drizzle

```bash
npm run db:generate
npm run db:push
npm run db:migrate
```

---

## Démarrer l’API
Important. Il faut être en mode root.

### En mode développement
```bash
npm run dev
```

### En mode production (après build)
```bash
npm run build
npm start
```
### Pour faire tourner en arrière-plan, même après fermeture de session
Ajouter  --watch pour surveiller les fichiers et redémarre le serveur à chaque modification.
```bash
npm install -g pm2
pm2 start npm --name "pirateServer" -- run dev

```
```
Référence:
  pm2 list                # Voir les processus
  pm2 logs mon-serveur    # Voir les logs
  pm2 restart mon-serveur # Redémarrer manuellement
  pm2 stop mon-serveur    # Arrêter
  pm2 delete mon-serveur  # Supprimer
```


---

## L'API devrait maintenant être accessible à :
[https://localhost:port/swagger]
