import { ShipRepository } from "../repositories/ship.repository";
import { Ship, CreateShipRequest, PatchShipRequest, ReceiveShipRequest } from "../types/ship.types";
import { AppError } from "../errors/AppError";
import {
  validateAndGenerateNewShip,
  validateAndGenerateReceivedShip,
  validateBaseParameters
} from "../utils/typeConverter";
import * as axios from "axios";

const shipRepository = new ShipRepository();

export class ShipService {
  async getShipById(id: string): Promise<Ship | null> {
    return shipRepository.findById(id);
  }

  async getAllShips(): Promise<Array<Ship>> {
    return shipRepository.getAllShips();
  }

  async createShip(ship: CreateShipRequest): Promise<Ship> {
    if ((await shipRepository.getAllShips()).length >= 8) {
      throw new AppError("Maximum number of ships reached", { statusCode: 409, code: "VALIDATION_ERROR", details: "The port can only hold up to 8 ships. Delete or send a ship away before creating a new one." });
    }
    const shipToCreate = validateAndGenerateNewShip(ship);
    return shipRepository.create(shipToCreate);
  }

  async createReceivedShip(ship: ReceiveShipRequest): Promise<Ship> {

    if ((await shipRepository.getAllShips()).length >= 8) {
      throw new AppError("Maximum number of ships reached", { statusCode: 409, code: "VALIDATION_ERROR", details: "The port can only hold up to 8 ships. Delete or send a ship away before creating a new one." });
    }
    const shipToCreate = validateAndGenerateReceivedShip(ship);
    return shipRepository.createReceivedShip(shipToCreate);
  }

  async patchShip(id: string, ship: PatchShipRequest): Promise<Ship> {

    validateBaseParameters(ship);
    if (await shipRepository.findById(id) === null) {
      throw new AppError("Ship not found", { statusCode: 404, code: "VALIDATION_ERROR", details: "Ship not found" });
    }
    return shipRepository.editById(id, ship);
  }

  async deleteShip(id: string): Promise<void> {
    const ship = await shipRepository.findById(id);
    if (!ship) {
      throw new AppError("Ship not found", { statusCode: 404, code: "VALIDATION_ERROR", details: "Ship not found" });
    }
    await shipRepository.deleteById(id);
  }

  async deleteAllShips(): Promise<void> {
    await shipRepository.deleteAll();
  }

  // ChatGPT sur comment utiliser Axios

  async getBrokerUsers(): Promise<Array<string>> {
const URL = `${process.env.BROKER_URL}/users`;


    try {
      const response = await axios.get<{ success: boolean; users: string[]; totalUsers: number; }>(
        URL,
        {
          headers: {
            Authorization: `Bearer ${process.env.BROKER_CLIENT_SECRET}`,
            "x-client-id": process.env.BROKER_CLIENT_ID
          },
        }
      );

      if (!response.status.toString().startsWith("2")) {
        throw new AppError("Failed getting available ports", { statusCode: 503, code: "REMOTE_SERVICE_ERROR", isOperational: false });
      }

      return response.data.users;
    } catch (e: any) {
      if (e.response) {
        throw new AppError("Broker failed to return users list", { statusCode: 503, code: "REMOTE_SERVICE_ERROR", isOperational: false })
      } else {
        throw new AppError("Failed getting broker users", { statusCode: 500, code: "REMOTE_SERVICE_ERROR", isOperational: false })
      }
    }
  }

  async sendShip(shipId: string, recipientName: string): Promise<void> {
    let ship = await shipRepository.findById(shipId);

    if (!ship) {
      throw new AppError("Ship not found", { statusCode: 404, code: "VALIDATION_ERROR", details: "Ship not found", isOperational: true });
    }
    if (ship.status !== "docked") {
      throw new AppError("Ship is not docked", { statusCode: 400, code: "VALIDATION_ERROR", details: "Ship is not docked", isOperational: true });
    }

    const users = await this.getBrokerUsers();

    if (!users.includes(recipientName)) {
      throw new AppError("Recipient not found", { statusCode: 404, code: "VALIDATION_ERROR", details: "Recipient not found" });
    }

    await shipRepository.editById(shipId, ship, "sailing");
    ship = await shipRepository.findById(shipId);

    if (ship?.status !== "sailing") {
      throw new AppError("Failed sending ship", { statusCode: 400, code: "VALIDATION_ERROR", isOperational: true })
    }

const URL = `${process.env.BROKER_URL}/ship/sail/${recipientName}`;

    const data = {
      "name": ship.name,
      "goldCargo": ship.goldCargo,
      "captain": ship.captain,
      "crewSize": ship.crewSize,
      "status": ship.status,
      "createdAt": ship.createdAt,
      "createdBy": ship.createdBy,
      "lastModified": ship.updatedAt,
      "updatedAt": ship.updatedAt,
    }

    let response;

    try {
      response = await axios.post<{ success: boolean; statusCode: number | null; message: string; destinationResponse: string | null }>(URL, data, {
        headers: {
          Authorization: `Bearer ${process.env.BROKER_CLIENT_SECRET}`,
          "x-client-id": process.env.BROKER_CLIENT_ID
        }
      });
    } catch (e: any) {
      await shipRepository.editById(shipId, ship, "docked");
      if (e.response) {
        throw new AppError("Recipient failed to receive the ship. See recipient response below.", { statusCode: 400, code: "REMOTE_SERVICE_ERROR", isOperational: true, details: e.response.data });
      } else {
        throw new AppError("Failed sending ship", { statusCode: 400, code: "REMOTE_SERVICE_ERROR", isOperational: true })
      }
    }


    if (!response.data.success) {
      await shipRepository.editById(shipId, ship, "docked");
      throw new AppError("Failed sending ship", { statusCode: 400, code: "REMOTE_SERVICE_ERROR", isOperational: true, details: response.data.message });
    }

    await shipRepository.deleteById(ship.id);
  }
   async AjouterOr(amount: number, idbateau: string): Promise<void> {
    try {
      console.log("amount dans AjouterOr service :", amount);
      console.log("idbateau dans AjouterOr service :", idbateau);

      const ship = await shipRepository.findById(idbateau);
      console.log("ship trouvé :", ship);
    console.log("goldCargo actuel du ship :", ship?.goldCargo);

      if (!ship) {
        throw new AppError("Ship not found", {
          statusCode: 404,
          code: "VALIDATION_ERROR",
          details: "Ship not found",
          isOperational: true,
        });
      }


      ship.goldCargo += amount;
    console.log("goldCargo actuel du ship :", ship?.goldCargo);

      await shipRepository.AjouterOr(idbateau, ship.goldCargo);
    } catch (error) {
      console.error("Erreur dans AjouterOr :", error);
      throw error; // relance l'erreur capturée
    }
  }
   async retierOr(amount: number, idbateau: string): Promise<void> {
    try {
      console.log("amount dans AjouterOr service :", amount);
      console.log("idbateau dans AjouterOr service :", idbateau);

      const ship = await shipRepository.findById(idbateau);
      console.log("ship trouvé :", ship);
    console.log("goldCargo actuel du ship :", ship?.goldCargo);

      if (!ship) {
        throw new AppError("Ship not found", {
          statusCode: 404,
          code: "VALIDATION_ERROR",
          details: "Ship not found",
          isOperational: true,
        });
      }
    if (ship.goldCargo < amount) {
          throw new AppError("Not enough gold in ship", { statusCode: 400, code: "VALIDATION_ERROR", details: "Not enough gold in ship", isOperational: true });
        }

      ship.goldCargo -= amount;
    console.log("goldCargo actuel du ship :", ship?.goldCargo);

      await shipRepository.retirerOr(idbateau, ship.goldCargo);
    } catch (error) {
      console.error("Erreur dans AjouterOr :", error);
      throw error; // relance l'erreur capturée
    }
  }
      async RetirerEquipage (idbateau:string, nombreEquipage:number): Promise<void>{
      try {
          const ship = await shipRepository.findById(idbateau);
        if (!ship) {
          throw new AppError("Ship not found", { statusCode: 404, code: "VALIDATION_ERROR", details: "Ship not found", isOperational: true });
        }
        ship.crewSize -= nombreEquipage;        
        await shipRepository.RetirerEquipage(idbateau,ship.crewSize);}
      catch {
        throw new AppError("Ship not found", { statusCode: 404, code: "VALIDATION_ERROR", details: "Ship not found", isOperational: true });
      }
    }
     async AjouterEquipage(idbateau:string, nombreEquipage:number): Promise<void>{
      try {
        console.log("nombreEquipage dans AjouterEquipage service :", nombreEquipage);
        console.log("idbateau dans AjouterEquipage service :", idbateau);
          const ship = await shipRepository.findById(idbateau);
          console.log("ship trouvé :", ship);
        if (!ship) {
        throw new AppError("Ship not found", {
          statusCode: 404,
          code: "VALIDATION_ERROR",
          details: "Ship not found",
          isOperational: true,
        });
      }
        ship.crewSize += nombreEquipage;        
        await shipRepository.AjouterEquipage(idbateau,ship.crewSize);
      }
      catch {
        throw new AppError("ship error", { statusCode: 404, code: "VALIDATION_ERROR", details: "Ship not found", isOperational: true });
      }
    }
     async transferGoldBetweenShips(
  amount: number,
  idBateauEnvoyeur: string,
  idBateauRecepteur: string
): Promise<void> {
  const shipSender = await shipRepository.findById(idBateauEnvoyeur);
  const shipReceiver = await shipRepository.findById(idBateauRecepteur);
  // ✅ Vérifications de base
  if (!shipSender) {
    throw new AppError("Sender ship not found", {
      statusCode: 404,
      code: "VALIDATION_ERROR",
      details: "Sender ship not found",
      isOperational: true
    });
  }

  if (!shipReceiver) {
    throw new AppError("Receiver ship not found", {
      statusCode: 404,
      code: "VALIDATION_ERROR",
      details: "Receiver ship not found",
      isOperational: true
    });
  }

  if (shipSender.goldCargo < amount) {
    throw new AppError("Not enough gold in sender ship", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details: "Not enough gold in sender ship",
      isOperational: true
    });
  }
console.log("Amount to transfer:", amount);
  // 💰 Calcul des nouvelles valeurs
  const newSenderGold = shipSender.goldCargo - amount;
  const newReceiverGold = shipReceiver.goldCargo + amount;
console.log("New sender gold:", newSenderGold);
console.log("New receiver gold:", newReceiverGold);
  // ⚙️ On appelle le repository pour faire la transaction SQL
  await shipRepository.transferGoldTransactional(
    idBateauEnvoyeur,
    idBateauRecepteur,
    newSenderGold,
    newReceiverGold
  );
}
}