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
   async ajouterOr(idbateau: string, goldBateau: number): Promise<void> {
    await db.update(ships).set({ goldCargo: goldBateau }).where(eq(ships.id, idbateau));
  }
  async retirerOr(idbateau: string, goldBateau: number): Promise<void> {
    await db.update(ships).set({ goldCargo: goldBateau }).where(eq(ships.id, idbateau));
  }
  async retirerEquipage(idbateau: string, nombreEquipage: number): Promise<void> {
    await db.update(ships).set({ crewSize: nombreEquipage }).where(eq(ships.id, idbateau));
  }

/*Cette méthode est générée par l'IA , mais je l'ai comprise.voci explication:
Cette méthode effectue un transfert d’or entre deux bateaux. On commence par créer un identifiant unique (txId) 
pour chaque transaction, puis on définit involvedIds avec les deux bateaux concernés. Ensuite, on établit la connexion
à la base de données et on trie les IDs des bateaux pour que toutes les transactions verrouillent les bateaux dans le même ordre,
 ce qui évite les deadlocks, c’est-à-dire les situations où deux transactions se bloqueraient mutuellement en essayant de prendre
  les mêmes verrous. On utilise ensuite activeConflictMap pour appliquer des verrous logiques côté application sur chaque bateau,
   afin de détecter et gérer les conflits avant même d’accéder à la base. Si aucun conflit n’est détecté, on passe à la transaction
    SQL en verrouillant les lignes correspondantes avec SELECT ... FOR UPDATE. Pendant le traitement, on vérifie encore l’apparition
     de conflits avec conflictDetected, et si un conflit survient, la transaction est abandonnée. En cas de succès, l’or et le compteur
      de pillage sont mis à jour, et en cas d’erreur, un rollback restaure l’état initial. Enfin, les verrous logiques sont libérés
   dans activeConflictMap, permettant à d’autres transactions d’utiliser ces bateaux. 
*/
//Cette méthode se base essentiellemet sur la gestion des verrous ainsi que l'astuce que j'ai suivi ,c'est que une seule fois la deuxième transaction est abandonnée je change la variable conflictDetected et je l'annule
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
const sortedIds = involvedIds.sort();
for (const shipId of sortedIds) {
const existingTx = activeConflictMap[shipId];
if (existingTx && existingTx !== txId) {
activeConflictMap[shipId] = "COMPROMISED"; 
throw new Error('CONFLICT: Another transaction is using this ship. Both transactions abandoned.');
}
activeConflictMap[shipId] = txId;
acquiredLogicalLocks.push(shipId); 
}
client = await connection.getConnection();
await client.beginTransaction();
await client.query(
"SELECT id FROM ships WHERE id = ? FOR UPDATE",
[sortedIds[0]]
);
await client.query(
"SELECT id FROM ships WHERE id = ? FOR UPDATE",
[sortedIds[1]]
);
await new Promise(resolve => setTimeout(resolve, 3000));
const conflictDetected = sortedIds.some(id => {
const currentOwner = activeConflictMap[id];
return currentOwner !== txId; 
});
if (conflictDetected) {
throw new Error('CONFLICT: Mutual conflict detected during transaction. Both transactions abandoned.');
}
await client.query(
    "UPDATE ships SET gold_cargo = ?, times_pillaged = times_pillaged + 1 WHERE id = ?",
    [newSenderGold, idSender]
);
await client.query(
    "UPDATE ships SET gold_cargo = ? WHERE id = ?",
    [newReceiverGold, idReceiver]
);
await client.commit();
} catch (err: any) {
if (client) {
await client.rollback();
}
if (err.message.includes('Mutual conflict detected during transaction')) {
involvedIds.forEach(id => {
if (activeConflictMap[id] === "COMPROMISED") {
delete activeConflictMap[id];
}
});
}
throw err;
} finally {
acquiredLogicalLocks.forEach(id => {
if (activeConflictMap[id] === txId) {
delete activeConflictMap[id];
}
});
if (client) {
client.release();
}
}
}
 async ajouterEquipage(idbateau: string, nombreEquipage: number): Promise<void> {
    await db.update(ships).set({ crewSize: nombreEquipage }).where(eq(ships.id, idbateau));
  }
}
