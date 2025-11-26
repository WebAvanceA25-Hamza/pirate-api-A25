import { Router } from "express";
import { ShipController } from "../controllers/ship.controller";
import { authenticate, authenticateAdmin } from "../middleware/auth.middleware";

export const shipRouter = (): Router => {
  const router = Router();
  const shipController = new ShipController();

  router.post("/", authenticateAdmin, shipController.createShip);
  router.get("/", authenticate, shipController.getAllShips);
  router.get("/:id", authenticate, shipController.getShipByID);
  router.patch("/:id", authenticateAdmin, shipController.patchShip);
  router.delete("/:id", authenticateAdmin, shipController.deleteShip);
  router.delete("/", authenticateAdmin, shipController.deleteAllShips);
  router.get("/send/userlist", authenticate, shipController.listBrokerUsers);
  router.post("/send/:recipient", authenticateAdmin, shipController.sendShip);
  router.post("/ajouterOr/:idBateau", authenticate, shipController.AjouterOr);
  router.post("/retirerOr/:idBateau", authenticate, shipController.retirerOr);
  router.post("/retirerEquipage/:idBateau", authenticate, shipController.RetirerEquipage);
  router.post("/ajouterEquipage/:idBateau", authenticate, shipController.AjouterEquipage);
  router.post("/transferGold/:fromShipId/:toShipId",authenticate,shipController.transferGold);

  return router;
}

export const receiveShipRouter = (): Router => {

  const router = Router();
  const shipController = new ShipController();
  router.post("/dock", shipController.createReceivedShip);

  return router;
}