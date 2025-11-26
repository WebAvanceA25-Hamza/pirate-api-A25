import { db } from '../db/connection'
import { Ship, PatchShipRequest, CreateReceivedShipDBRequest } from "../types/ship.types";
import { ships } from "../db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../errors/AppError";
import { connection } from "../db/connection"; // <-- mais tu ne l’exportes pas encore
import { Connection } from 'mysql2/promise';

// 🚨 Constante Normale Globale pour la Gestion des Conflits 🚨
// Map pour signaler qu'un navire a été impliqué dans une transaction qui
// a échoué à cause d'un verrou concurrentiel (timeout).
// Clé: ID du navire | Valeur: Date d'enregistrement du conflit (en ms)
const activeConflictMap: { [shipId: string]: number } = {};
export class ShipRepository {
  async findById(id: string): Promise<Ship | null> {
    const result = await db.select().from(ships).where(eq(ships.id, id));
    return result[0] || null;
  }

  async getAllShips(): Promise<Array<Ship>> {
    return db.select().from(ships);
  }

  async create(ship: { id: string; name: string; goldCargo: number; captain: string; status: "docked" | "sailing" | "lookingForAFight"; crewSize: number; createdBy: string; }): Promise<Ship> {
    await db.insert(ships).values(ship);

    const result = await this.findById(ship.id);
    if (!result) throw new Error('Failed to create ship');

    return result;
  }

  async createReceivedShip(ship: CreateReceivedShipDBRequest): Promise<Ship> {

    await db.insert(ships).values(ship);

    const result = await this.findById(ship.id);
    if (!result) throw new Error('Failed to create ship');

    return result;
  }

  async editById(id: string, ship: PatchShipRequest, status: "docked" | "sailing" | "lookingForAFight" | null = null): Promise<Ship> {

    if (status)
      await db.update(ships).set({
        name: ship.name,
        goldCargo: ship.goldCargo,
        status: status,
        captain: ship.captain,
        crewSize: ship.crewSize,
      }).where(eq(ships.id, id));
    else
      await db.update(ships).set({
        name: ship.name,
        goldCargo: ship.goldCargo,
        captain: ship.captain,
        crewSize: ship.crewSize,
      }).where(eq(ships.id, id));

    const result = await this.findById(id);
    if (!result) throw new AppError("Failed to patch ship, likely doesn't exist.", { statusCode: 500, isOperational: false });

    return result;
  }

  async deleteById(id: string): Promise<void> {
    await db.delete(ships).where(eq(ships.id, id));
  }

  async deleteAll(): Promise<void> {
    await db.delete(ships);
  }
   async AjouterOr(idbateau: string, goldBateau: number): Promise<void> {
    console.log("Updating goldCargo for ship ID:", idbateau, "to:", goldBateau);
    await db.update(ships).set({ goldCargo: goldBateau }).where(eq(ships.id, idbateau));
  }
  async retirerOr(idbateau: string, goldBateau: number): Promise<void> {
    await db.update(ships).set({ goldCargo: goldBateau }).where(eq(ships.id, idbateau));
  }
  async RetirerEquipage(idbateau: string, nombreEquipage: number): Promise<void> {
    await db.update(ships).set({ crewSize: nombreEquipage }).where(eq(ships.id, idbateau));
  }
   async AjouterEquipage(idbateau: string, nombreEquipage: number): Promise<void> {
    console.log("Updating crewSize for ship ID:", idbateau, "to:", nombreEquipage);
    await db.update(ships).set({ crewSize: nombreEquipage }).where(eq(ships.id, idbateau));
  }
 // Map globale pour enregistrer les navires impliqués dans un conflit récent.
// Clé: ID du navire | Valeur: Date d'enregistrement du conflit (pour une éventuelle expiration)
async transferGoldTransactional(
        idSender: string,
        idReceiver: string,
        amount: number
    ): Promise<void> {

        // Vérifications initiales
        if (amount <= 0) {
            throw new Error("Le montant du transfert doit être positif.");
        }
        if (idSender === idReceiver) {
            throw new Error("L'expéditeur et le destinataire doivent être différents.");
        }

        // IDs impliqués
        const involvedIds = [idSender, idReceiver];
        // 🔑 1. Obtenir une connexion dédiée à partir du pool (NON-Drizzle)
        let client: Connection | null = null;
        
        try {
            client = await connection.getConnection();

            // 2. Configuration et Démarrage de la Transaction
            // Timeout de verrouillage très court (3s) pour forcer l'échec rapide (simule NOWAIT)
            await client.query("SET SESSION innodb_lock_wait_timeout = 3");
            await client.beginTransaction();

            // 3. Prévention des Deadlocks: trier les IDs
            const sortedIds = involvedIds.sort();
            const [firstId, secondId] = sortedIds;

            let senderGoldInitial: number = 0;
            let receiverGoldInitial: number = 0;
            
            // --- 🔐 Verrouillage Séquentiel et Récupération des données ---

            // Fonction utilitaire pour le verrouillage et la détection de conflit
            const lockAndGetGold = async (id: string): Promise<number> => {
                try {
                    // Verrouillage FOR UPDATE : si le verrou n'est pas obtenu en 3s, ça échoue.
                    const [results] = await client!.query(
                        "SELECT id, gold_cargo FROM ships WHERE id = ? FOR UPDATE",
                        [id]
                    );

                    if (!Array.isArray(results) || results.length === 0) {
                        throw new Error(`Navire non trouvé: ID ${id}`);
                    }
                    return results[0].gold_cargo;

                } catch (err) {
                    // ❌ CONFLIT DÉTECTÉ (Timeout de 3s expiré)
                    await client!.rollback();
                    
                    // *** 🚨 ÉTAPE CLÉ : SIGNALER LE CONFLIT AU NIVEAU GLOBAL 🚨 ***
                    involvedIds.forEach(shipId => {
                        // On signale les deux navires pour s'assurer que T1 les vérifie.
                        activeConflictMap[shipId] = Date.now();
                    });
                    
                    // L'erreur est relancée et capturée par le 'catch' principal
                    throw new Error("Conflit de transaction détecté: Le navire est verrouillé.");
                }
            };

            // Exécuter le verrouillage pour le premier ID
            const goldFirst = await lockAndGetGold(firstId);
            if (firstId === idSender) {
                senderGoldInitial = goldFirst;
            } else {
                receiverGoldInitial = goldFirst;
            }

            // Exécuter le verrouillage pour le second ID
            const goldSecond = await lockAndGetGold(secondId);
            if (secondId === idSender) {
                senderGoldInitial = goldSecond;
            } else {
                receiverGoldInitial = goldSecond;
            }


            // --- ⏳ Vérification et Délai Long (pour simuler la charge) ---

            // 4. Vérifier les fonds sur les données VERROUILLÉES
            if (senderGoldInitial < amount) {
                await client.rollback();
                throw new Error("Fonds insuffisants : le transfert est annulé.");
            }

            // 5. Délai de 3 secondes (Le "second entrant" aura le temps d'échouer et de signaler le conflit ici)
            await new Promise((resolve) => setTimeout(resolve, 8000));


            // --- ✅ Vérification Finale du Signal et Commit/Rollback ---

            // 6. VÉRIFICATION FINALE : Vérifier si un conflit a été signalé pendant le délai
            const hasConflictSignal = involvedIds.some(id => activeConflictMap.hasOwnProperty(id));

            if (hasConflictSignal) {
                // 🚨 Conflit trouvé ! Forcer le ROLLBACK de T1 (échec mutuel)
                await client.rollback();
                console.log(`❌ Transaction annulée car un conflit a été signalé.`);
                throw new Error("Transaction annulée par signal de conflit concurrentiel (échec mutuel).");
            }

            // 7. Mise à jour (si aucun conflit signalé)
            const newSenderGold = senderGoldInitial - amount;
            const newReceiverGold = receiverGoldInitial + amount;
            
            // Mise à jour de l'expéditeur
            await client.query("UPDATE ships SET gold_cargo = ? WHERE id = ?", [newSenderGold, idSender]);
            // Mise à jour du destinataire
            await client.query("UPDATE ships SET gold_cargo = ? WHERE id = ?", [newReceiverGold, idReceiver]);

            // 8. Commit
            await client.commit();
            console.log("✅ Transaction terminée avec succès");
            
            // Nettoyer les IDs de la map
            involvedIds.forEach(id => delete activeConflictMap[id]);

        } catch (err) {
            // 9. Rollback et gestion d'erreur finale
            if (client) {
                await client.rollback();
            }
            console.error("❌ Transaction annulée :", (err as Error).message);
            throw err;
        } finally {
            // 10. Libération de la connexion
            if (client) {
                client.release();
            }
        }
    }
}


    // ... (Reste du code d'exécution et du catch/finally) ...
/*
async transferGoldTransactional(
  idSender: string,
  idReceiver: string,
  newSenderGold: number,
  newReceiverGold: number
): Promise<void> {
  // Connexion dédiée pour la transaction
  const client = await connection.getConnection();

  try {
    // Timeout des verrous très court pour simuler NOWAIT (~3s max)
    await client.query("SET SESSION innodb_lock_wait_timeout = 3");

    // Démarrage de la transaction
    await client.beginTransaction();

    // Éviter les deadlocks : verrouiller toujours dans l’ordre des IDs
    const sortedIds = [idSender, idReceiver].sort();
    const [firstId, secondId] = sortedIds;

    // 🔐 Verrouillage du premier navire
    try {
      await client.query(
        "SELECT * FROM ships WHERE id = ? FOR UPDATE",
        [firstId]
      );
    } catch (err) {
      await client.rollback();
      throw new Error("Concurrent transaction conflict: first ship is locked");
    }

    // 🔐 Verrouillage du second navire
    try {
      await client.query(
        "SELECT * FROM ships WHERE id = ? FOR UPDATE",
        [secondId]
      );
    } catch (err) {
      await client.rollback();
      throw new Error("Concurrent transaction conflict: second ship is locked");
    }

    // Vérifier que les navires existent
    const [firstShip] = await client.query("SELECT * FROM ships WHERE id = ?", [idSender]);
    const [secondShip] = await client.query("SELECT * FROM ships WHERE id = ?", [idReceiver]);
    if (!Array.isArray(firstShip) || firstShip.length === 0 || !Array.isArray(secondShip) || secondShip.length === 0) {
      await client.rollback();
      throw new Error("Ship not found during transaction");
    }

    // ⏳ Simuler un transfert long (3 secondes)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 💰 Mise à jour de l'or des deux navires
    await client.query(
      "UPDATE ships SET gold_cargo = ? WHERE id = ?",
      [newSenderGold, idSender]
    );

    await client.query(
      "UPDATE ships SET gold_cargo = ? WHERE id = ?",
      [newReceiverGold, idReceiver]
    );

    // ✅ Commit de la transaction
    await client.commit();
    console.log("✅ Transaction terminée avec succès");

  } catch (err) {
    // ❌ Rollback en cas d’erreur
    await client.rollback();
    console.error("❌ Transaction annulée :", (err as Error).message);
    throw err;
  } finally {
    // Libération de la connexion
    client.release();
  }
}
*/

