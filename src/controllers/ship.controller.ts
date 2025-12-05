import { Request, Response, NextFunction } from 'express';
import { ShipService } from "../services/ship.service";
import { CreateShipRequest, ReceiveShipRequest } from "../types/ship.types";
import { AppError } from "../errors/AppError";

const shipService = new ShipService();

export class ShipController {
  createShip = async (req: Request, res: Response, next: NextFunction) => {
    const ship: CreateShipRequest = req.body;

    try {
      const newShip = await shipService.createShip(ship);
      res.status(201).json(newShip);
    } catch (error) {
      next(error);
    }
  }

  async createReceivedShip(req: Request, res: Response, next: NextFunction) {


    const ship: ReceiveShipRequest = req.body;
    try {
      if ((req.headers["authorization"] === undefined || req.headers["authorization"].split(" ")[1] != process.env.BROKER_CLIENT_SECRET)
        && (req.headers["x-client-id"] === undefined || req.headers["x-client-id"] != process.env.BROKER_CLIENT_ID)) {

        throw new AppError("Unauthorized", { statusCode: 401, code: "AUTH_REQUIRED", details: "You need to be logged in to access this resource." });
      }
      const newShip = await shipService.createReceivedShip(ship);
      res.status(201).json(newShip);
    } catch (error) {
      next(error);
    }
  }

  getAllShips = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ships = await shipService.getAllShips();
      res.status(200).json(ships);
    } catch (error) {
      next(error);
    }
  }

  getShipByID = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ship = await shipService.getShipById(req.params.id);
      if (!ship) return res.status(404).json({ message: 'Ship not found' });
      else return res.status(200).json(ship);
    } catch (error) {
      next(error);
    }
  }

  patchShip = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ship = await shipService.patchShip(req.params.id, req.body);
      res.status(200).json(ship);
    } catch (error) {
      next(error);
    }
  }

  deleteShip = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await shipService.deleteShip(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  deleteAllShips = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await shipService.deleteAllShips();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  listBrokerUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await shipService.getBrokerUsers()
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  sendShip = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await shipService.sendShip(req.body.id, req.params.recipient);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
   ajouterOr = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await shipService.ajouterOr(req.body.Or, req.params.idBateau);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
  retirerOr = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await shipService.retierOr(req.body.Or, req.params.idBateau);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
   retirerEquipage= async (req: Request, res: Response, next: NextFunction) => {
     try {
       await shipService.retirerEquipage(req.params.idBateau, Number(req.body.newCrew));
       res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
     ajouterEquipage= async (req: Request, res: Response, next: NextFunction) => {
     try {
       await shipService.ajouterEquipage(req.params.idBateau, req.body.newCrew);
       res.status(204).send();
    } catch (error) {
      next(error);
    }

      }
 transferGold=async(req: Request, res: Response)=> {
  try {
  const { amount } = req.body;
  const { fromShipId, toShipId } = req.params;
    await shipService.transferGoldBetweenShips(Number(amount), fromShipId, toShipId);
    res.json({ message: 'Transfert réussi entre les deux navires ! ⚓' });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}
}