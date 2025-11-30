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

const sortedIds = involvedIds.sort();
for (const shipId of sortedIds) {
const existingTx = activeConflictMap[shipId];
if (existingTx && existingTx !== txId) {
activeConflictMap[shipId] = "COMPROMISED"; 
console.log(`⚠️ CONFLIT: Navire ${shipId} déjà utilisé par tx ${existingTx}`);
console.log(`❌ Transaction ${txId} abandonnée immédiatement. (Déclenchement d'abandon pour tx ${existingTx})`);
throw new Error('CONFLICT: Another transaction is using this ship. Both transactions abandoned.');
}
activeConflictMap[shipId] = txId;
acquiredLogicalLocks.push(shipId); 
console.log(`🔒 Navire ${shipId} réservé pour tx ${txId}`);
}
console.log(`✅ Tous les verrous logiques acquis pour tx ${txId}`);
console.log(`🗺️ activeConflictMap:`, JSON.stringify(activeConflictMap));
client = await connection.getConnection();
await client.beginTransaction();
console.log(`🔹 Transaction SQL démarrée pour tx ${txId}`);
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
console.log(`⏳ Simulation d'un transfert long (3 secondes)...`);
await new Promise(resolve => setTimeout(resolve, 3000));
const conflictDetected = sortedIds.some(id => {
const currentOwner = activeConflictMap[id];
return currentOwner !== txId; 
});
if (conflictDetected) {
console.log(`❌ Conflit mutuel détecté pendant le délai pour tx ${txId}`);
console.log(`🗺️ activeConflictMap actuelle:`, JSON.stringify(activeConflictMap));
throw new Error('CONFLICT: Mutual conflict detected during transaction. Both transactions abandoned.');
}
console.log(` Mise à jour du sender ${idSender}: ${newSenderGold}`);
await client.query(
"UPDATE ships SET gold_cargo = ? WHERE id = ?",
[newSenderGold, idSender]
);
console.log(` Mise à jour du receiver ${idReceiver}: ${newReceiverGold}`);
await client.query(
"UPDATE ships SET gold_cargo = ? WHERE id = ?",
[newReceiverGold, idReceiver]
);
await client.commit();
console.log(`✅ Transaction ${txId} COMMIT réussie\n`);
} catch (err: any) {
if (client) {
await client.rollback();
console.log(`🔄 ROLLBACK effectué pour tx ${txId}`);
}
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
acquiredLogicalLocks.forEach(id => {
if (activeConflictMap[id] === txId) {
delete activeConflictMap[id];
console.log(`🔓 Navire ${id} libéré par tx ${txId}`);
}
});
console.log(`🗺️ activeConflictMap après nettoyage:`, JSON.stringify(activeConflictMap));
if (client) {
client.release();
console.log(`🔌 Connexion libérée pour tx ${txId}\n`);
}
}
}
 async AjouterEquipage(idbateau: string, nombreEquipage: number): Promise<void> {
    console.log("Updating crewSize for ship ID:", idbateau, "to:", nombreEquipage);
    await db.update(ships).set({ crewSize: nombreEquipage }).where(eq(ships.id, idbateau));
  }
}