import {
  CreateShipRequest,
  CreateNewShipDBRequest,
  PatchShipRequest,
  ReceiveShipRequest,
  CreateReceivedShipDBRequest
} from "../types/ship.types";
import { v4 as uuid } from 'uuid';
import { AppError } from "../errors/AppError";

export const validateBaseParameters = (ship: CreateShipRequest | PatchShipRequest | ReceiveShipRequest, shipReceived: boolean = false, userModification: boolean = true): boolean => {
  const createdAtStr = (ship as ReceiveShipRequest).createdAt;
  const createdAtDate = new Date(createdAtStr);

  if (ship.name && (ship.name.length < 2 || ship.name.length > 100)) {
    throw new AppError("Invalid ship name", { statusCode: 400, code: "VALIDATION_ERROR", details: "Ship name must be between 2 and 100 characters long." });
  }
  if (ship.goldCargo && (ship.goldCargo < 0 || ship.goldCargo > 1000000)) {
    throw new AppError("Invalid gold cargo", { statusCode: 400, code: "VALIDATION_ERROR", details: "Gold cargo must be between 0 and 1,000,000." });
  }
  if (ship.captain && (ship.captain.length < 2 || ship.captain.length > 50)) {
    throw new AppError("Invalid captain name", { statusCode: 400, code: "VALIDATION_ERROR", details: "Captain name must be between 2 and 50 characters long." });
  }
  if (ship.crewSize && (ship.crewSize < 1 || ship.crewSize > 500)) {
    throw new AppError("Invalid crew size", { statusCode: 400, code: "VALIDATION_ERROR", details: "Crew size must be between 1 and 500." });
  }
  if (shipReceived && (ship as ReceiveShipRequest).createdAt) {
    if (isNaN(createdAtDate.getTime())) {
      throw new AppError("Invalid creation date", {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details: "Creation date must be a valid ISO date string."
      });
    }
    if (createdAtDate > new Date()) {
      throw new AppError("Invalid creation date", {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details: "The boat cannot be created in the future."
      });
    }
  }
  if (shipReceived && (ship as ReceiveShipRequest).status !== "sailing") {
    throw new AppError("Invalid status", { statusCode: 400, code: "VALIDATION_ERROR", details: "The boat must be in sailing status to be docked." });
  }
  if (shipReceived && (ship as ReceiveShipRequest).createdBy && (ship as ReceiveShipRequest).createdBy.length > 38) {
    throw new AppError("Invalid createdBy", { statusCode: 400, code: "VALIDATION_ERROR", details: "createdBy must be 38 or fewer characters long." });
  }
  return true;
}

export const validateAllDefaultFieldsExist = (ship: CreateShipRequest | PatchShipRequest | ReceiveShipRequest, shipReceived: boolean = false): boolean => {
  if (!ship.name || !ship.goldCargo || !ship.captain || (shipReceived && !(ship as ReceiveShipRequest).status) || !ship.crewSize || (shipReceived && (ship as ReceiveShipRequest).createdAt === undefined) || (shipReceived && (ship as ReceiveShipRequest).createdBy === undefined)) {
    let missingFields = [];
    if (!ship.name) missingFields.push("name");
    if (!ship.goldCargo) missingFields.push("goldCargo");
    if (!ship.captain) missingFields.push("captain");
    if (shipReceived && !(ship as ReceiveShipRequest).status) missingFields.push("status");
    if (!ship.crewSize) missingFields.push("crewSize");
    if (shipReceived && (ship as ReceiveShipRequest).createdAt === undefined) missingFields.push("createdAt");
    if (shipReceived && (ship as ReceiveShipRequest).createdBy === undefined) missingFields.push("createdBy");

    const missingFieldsString = missingFields.join(", ");
    throw new AppError("Missing required fields", { statusCode: 400, code: "VALIDATION_ERROR", details: `Following fields are missing: ${missingFieldsString}.` });
  }
  return true;
}

export const validateAndGenerateNewShip = (ship: CreateShipRequest): CreateNewShipDBRequest => {
  validateAllDefaultFieldsExist(ship);
  validateBaseParameters(ship);
  return {
    id: uuid(),
    name: ship.name,
    goldCargo: ship.goldCargo,
    captain: ship.captain,
    status: "docked",
    crewSize: ship.crewSize,
    createdBy: "Alain",
  }
}

export const validateAndGenerateReceivedShip = (ship: ReceiveShipRequest): CreateReceivedShipDBRequest => {
  validateAllDefaultFieldsExist(ship, true);
  validateBaseParameters(ship, true);

  const createdAtStr = (ship as ReceiveShipRequest).createdAt;
  const createdAtDate = new Date(createdAtStr);

  return {
    id: uuid(),
    name: ship.name,
    goldCargo: ship.goldCargo,
    captain: ship.captain,
    status: "docked",
    crewSize: ship.crewSize,
    createdBy: ship.createdBy,
    createdAt: createdAtDate,
  }
}