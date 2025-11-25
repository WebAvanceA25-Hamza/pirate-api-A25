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

        //console.log("Error on createReceivedShip");
        //console.log("Missing data(s)!");
        //console.log("req.headers[authorization]", req.headers["authorization"])
        //console.log("req.headers[x - client - id]", req.headers["x-client-id"]);


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
   AjouterOr = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("req.body.Or dans controller :", req.body.Or);
      console.log("req.params.idBateau dans controller :", req.params.idBateau);
      await shipService.AjouterOr(req.body.Or, req.params.idBateau);
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
}