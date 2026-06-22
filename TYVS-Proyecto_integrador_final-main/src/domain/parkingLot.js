import { DEFAULT_TARIFFS, calculateParkingCharge, normalizePlate, validateVehicleType } from './tariffCalculator.js';

const DEFAULT_CAPACITY = {
  car: 30,
  motorcycle: 20,
  bicycle: 10
};

export class ParkingLot {
  constructor(config) {
    const source = Object.assign({
      capacity: DEFAULT_CAPACITY,
      tariffs: DEFAULT_TARIFFS,
      tickets: []
    }, config);

    this.capacity = { ...source.capacity };
    this.tariffs = { ...source.tariffs };
    this.tickets = source.tickets.map((ticket) => ({ ...ticket }));
  }

  getOpenTickets() {
    return this.tickets.filter((ticket) => ticket.status === 'open');
  }

  getHistory() {
    return [...this.tickets].sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));
  }

  getOccupancy() {
    const occupied = Object.fromEntries(Object.keys(this.capacity).map((type) => [type, 0]));

    for (const ticket of this.getOpenTickets()) {
      if (Object.hasOwn(occupied, ticket.vehicleType)) {
        occupied[ticket.vehicleType] += 1;
      }
    }

    return Object.fromEntries(
      Object.entries(this.capacity).map(([vehicleType, total]) => [
        vehicleType,
        {
          total,
          occupied: occupied[vehicleType],
          available: total - occupied[vehicleType]
        }
      ])
    );
  }

  hasAvailability(vehicleType) {
    validateVehicleType(vehicleType, this.tariffs);
    const occupancy = this.getOccupancy()[vehicleType];
    return occupancy.available > 0;
  }

  registerEntry({ plate, vehicleType, ownerName = '', entryTime = new Date().toISOString() }) {
    const normalizedPlate = normalizePlate(plate);
    validateVehicleType(vehicleType, this.tariffs);

    if (this.getOpenTickets().some((ticket) => ticket.plate === normalizedPlate)) {
      throw new Error('El vehiculo ya tiene un tiquete abierto.');
    }

    if (!this.hasAvailability(vehicleType)) {
      throw new Error('No hay cupos disponibles para este tipo de vehiculo.');
    }

    const ticket = {
      id: crypto.randomUUID(),
      plate: normalizedPlate,
      vehicleType,
      ownerName: ownerName.trim(),
      entryTime: new Date(entryTime).toISOString(),
      status: 'open'
    };

    this.tickets.push(ticket);
    return ticket;
  }

  closeTicket({ plate, exitTime = new Date().toISOString() }) {
    const normalizedPlate = normalizePlate(plate);
    const ticket = this.getOpenTickets().find((item) => item.plate === normalizedPlate);

    if (!ticket) {
      throw new Error('No existe un tiquete abierto para esta placa.');
    }

    const charge = calculateParkingCharge({
      vehicleType: ticket.vehicleType,
      entryTime: ticket.entryTime,
      exitTime,
      tariffs: this.tariffs
    });

    const invoiceSequence = this.tickets.filter((item) => item.status === 'closed').length + 1;

    ticket.exitTime = new Date(exitTime).toISOString();
    ticket.status = 'closed';
    ticket.invoice = {
      number: `FE-${new Date(ticket.exitTime).getFullYear()}-${invoiceSequence}`,
      currency: 'COP',
      ...charge
    };

    return ticket;
  }

  toJSON() {
    return {
      capacity: this.capacity,
      tariffs: this.tariffs,
      tickets: this.tickets
    };
  }
}

export { DEFAULT_CAPACITY };
