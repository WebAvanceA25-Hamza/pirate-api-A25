import express from 'express';

const app = express();
const PORT = 2223;

app.get('/', (req, res) => {
  res.send('🚀 Test réussi : le serveur écoute bien sur le port 2223 !');
});

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
