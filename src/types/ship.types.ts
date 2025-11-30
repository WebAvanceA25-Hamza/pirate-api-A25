export interface Ship {
  id: string;
  name: string;
  goldCargo: number;
  captain: string;
  status: "docked" | "sailing" | "lookingForAFight";
  crewSize: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  timesPillaged: number;
}

export interface CreateShipRequest {
  name: string;
  goldCargo: number;
  captain: string;
  crewSize: number;
}

export interface ReceiveShipRequest {
  name: string;
  goldCargo: number;
  captain: string;
  status: "docked" | "sailing" | "lookingForAFight";
  crewSize: number;
  createdBy: string;
  createdAt: Date;
}

export interface PatchShipRequest {
  name: string;
  goldCargo: number;
  captain: string;
  crewSize: number;
}

export interface CreateNewShipDBRequest {
  id: string;
  name: string;
  goldCargo: number;
  captain: string;
  status: "docked" | "sailing" | "lookingForAFight";
  crewSize: number;
  createdBy: string;
}

export interface CreateReceivedShipDBRequest extends CreateNewShipDBRequest {
  createdAt: Date;
}