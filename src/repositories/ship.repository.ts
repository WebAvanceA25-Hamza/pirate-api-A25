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
//const activeConflictMap: { [shipId: string]: number } = {};
const activeConflictMap: { [shipId: string]: string } = {};

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

async transferGoldTransactional(
idSender: string,
idReceiver: string,
newSenderGold: number,
newReceiverGold: number
): Promise<void> {
const txId = `${Date.now()}-${Math.random()}`;
const involvedIds = [idSender, idReceiver];
let client: Connection | null = null;
let acquiredLogicalLocks: string[] = []; 
try {
console.log(`🔹 Transaction ${txId} démarrée: ${idSender} -> ${idReceiver}`);
console.log(`   Nouveau sender gold: ${newSenderGold}, Nouveau receiver gold: ${newReceiverGold}`);
// ===== ÉTAPE 1 : VÉRIFIER ET ACQUÉRIR LES VERROUS LOGIQUES =====
// Tri pour prévenir les deadlocks.
const sortedIds = involvedIds.sort();
for (const shipId of sortedIds) {
const existingTx = activeConflictMap[shipId];
if (existingTx && existingTx !== txId) {
// 🔑 Conflit : Forcer l'échec de l'autre transaction (Abandon Mutuel).
activeConflictMap[shipId] = "COMPROMISED"; 
console.log(`⚠️ CONFLIT: Navire ${shipId} déjà utilisé par tx ${existingTx}`);
console.log(`❌ Transaction ${txId} abandonnée immédiatement. (Déclenchement d'abandon pour tx ${existingTx})`);
throw new Error('CONFLICT: Another transaction is using this ship. Both transactions abandoned.');
}
activeConflictMap[shipId] = txId;
// Enregistrer le verrou acquis pour un nettoyage garanti.
acquiredLogicalLocks.push(shipId); 
console.log(`🔒 Navire ${shipId} réservé pour tx ${txId}`);
}
console.log(`✅ Tous les verrous logiques acquis pour tx ${txId}`);
console.log(`🗺️ activeConflictMap:`, JSON.stringify(activeConflictMap));
// ===== ÉTAPE 2 : OBTENIR LA CONNEXION ET DÉMARRER LA TRANSACTION SQL =====
client = await connection.getConnection();
await client.beginTransaction();
console.log(`🔹 Transaction SQL démarrée pour tx ${txId}`);
// Verrouillage SQL des deux navires (dans l'ordre trié)
await client.query(
"SELECT id FROM ships WHERE id = ? FOR UPDATE",
[sortedIds[0]]
);
console.log(`🔒 Verrou SQL obtenu pour ${sortedIds[0]}`);
await client.query(
"SELECT id FROM ships WHERE id = ? FOR UPDATE",
[sortedIds[1]]
);
console.log(`🔒 Verrou SQL obtenu pour ${sortedIds[1]}`);
// ===== ÉTAPE 3 : DÉLAI DE 3 SECONDES (SIMULATION) =====
console.log(`⏳ Simulation d'un transfert long (3 secondes)...`);
await new Promise(resolve => setTimeout(resolve, 3000));
// ===== ÉTAPE 4 : VÉRIFIER SI ON A ÉTÉ MARQUÉ COMME CONFLICTUEL (POINT DE CONTRÔLE) =====
const conflictDetected = sortedIds.some(id => {
const currentOwner = activeConflictMap[id];
// Le navire ne nous appartient plus (il a été marqué "COMPROMISED").
return currentOwner !== txId; 
});
if (conflictDetected) {
console.log(`❌ Conflit mutuel détecté pendant le délai pour tx ${txId}`);
console.log(`🗺️ activeConflictMap actuelle:`, JSON.stringify(activeConflictMap));
throw new Error('CONFLICT: Mutual conflict detected during transaction. Both transactions abandoned.');
}
// ===== ÉTAPE 5 : MISE À JOUR DES VALEURS =====
console.log(`💰 Mise à jour du sender ${idSender}: ${newSenderGold}`);
await client.query(
"UPDATE ships SET gold_cargo = ? WHERE id = ?",
[newSenderGold, idSender]
);
console.log(`💰 Mise à jour du receiver ${idReceiver}: ${newReceiverGold}`);
await client.query(
"UPDATE ships SET gold_cargo = ? WHERE id = ?",
[newReceiverGold, idReceiver]
);
// ===== ÉTAPE 6 : COMMIT DE LA TRANSACTION =====
await client.commit();
console.log(`✅ Transaction ${txId} COMMIT réussie\n`);
} catch (err: any) {
// ===== ROLLBACK EN CAS D'ERREUR SQL OU LOGIQUE (CONFLIT) =====
if (client) {
await client.rollback();
console.log(`🔄 ROLLBACK effectué pour tx ${txId}`);
}
// 🔑 Nettoyage du marqueur : Si cette TX (T1) a été forcée d'échouer, elle nettoie le marqueur.
if (err.message.includes('Mutual conflict detected during transaction')) {
involvedIds.forEach(id => {
if (activeConflictMap[id] === "COMPROMISED") {
delete activeConflictMap[id];
console.log(`⚠️ Marqueur COMPROMISED libéré pour le navire ${id} par tx ${txId}`);
}
});
}
console.error(`❌ Transaction ${txId} ROLLBACK: ${err.message}\n`);
throw err;
} finally {
// ===== NETTOYAGE : LIBÉRER LES VERROUS LOGIQUES DÉTENUS (ceux qui n'ont pas été compromis) =====
acquiredLogicalLocks.forEach(id => {
// Libérer uniquement si NOUS SOMMES toujours le propriétaire du verrou (txId).
if (activeConflictMap[id] === txId) {
delete activeConflictMap[id];
console.log(`🔓 Navire ${id} libéré par tx ${txId}`);
}
});
console.log(`🗺️ activeConflictMap après nettoyage:`, JSON.stringify(activeConflictMap));
// ===== LIBÉRER LA CONNEXION =====
if (client) {
client.release();
console.log(`🔌 Connexion libérée pour tx ${txId}\n`);
}
}
}
 // Map globale pour enregistrer les navires impliqués dans un conflit récent.
// Clé: ID du navire | Valeur: Date d'enregistrement du conflit (pour une éventuelle expiration)
/*async transferGoldTransactional(
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
*/
}