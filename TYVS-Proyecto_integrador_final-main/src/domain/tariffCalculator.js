const VEHICLE_LABELS = {
  car: 'Automovil',
  motorcycle: 'Motocicleta',
  bicycle: 'Bicicleta'
};

const DEFAULT_TARIFFS = {
  car: { minimumMinutes: 30, minimumAmount: 2500, minuteRate: 95, dailyCap: 28000 },
  motorcycle: { minimumMinutes: 30, minimumAmount: 1200, minuteRate: 45, dailyCap: 12000 },
  bicycle: { minimumMinutes: 30, minimumAmount: 800, minuteRate: 20, dailyCap: 6000 }
};

const TAX_RATE = 0.19;

export function getVehicleLabel(vehicleType) {
  return VEHICLE_LABELS[vehicleType] ?? vehicleType;
}

export function normalizePlate(plate) {
  if (typeof plate !== 'string') {
    throw new Error('La placa es obligatoria.');
  }

  const normalized = plate.trim().toUpperCase().replaceAll(' ', '');
  if (!/^[A-Z0-9-]{4,10}$/.test(normalized)) {
    throw new Error('La placa debe tener entre 4 y 10 caracteres alfanumericos.');
  }

  return normalized;
}

export function validateVehicleType(vehicleType, tariffs = DEFAULT_TARIFFS) {
  if (!tariffs[vehicleType]) {
    throw new Error('Tipo de vehiculo no soportado.');
  }

  return vehicleType;
}

export function calculateParkingCharge({ vehicleType, entryTime, exitTime, tariffs = DEFAULT_TARIFFS }) {
  validateVehicleType(vehicleType, tariffs);

  const entry = new Date(entryTime);
  const exit = new Date(exitTime);

  if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())) {
    throw new Error('Las fechas de entrada y salida deben ser validas.');
  }

  if (exit <= entry) {
    throw new Error('La fecha de salida debe ser posterior a la entrada.');
  }

  const tariff = tariffs[vehicleType];
  const chargedMinutes = Math.max(1, Math.ceil((exit.getTime() - entry.getTime()) / 60000));
  const billableMinutes = Math.max(chargedMinutes, tariff.minimumMinutes);
  const dayBlocks = Math.floor(billableMinutes / 1440);
  const remainingMinutes = billableMinutes % 1440;
  const remainingAmount = Math.min(
    Math.max(tariff.minimumAmount, remainingMinutes * tariff.minuteRate),
    tariff.dailyCap
  );

  const subtotal = dayBlocks * tariff.dailyCap + remainingAmount;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  return {
    vehicleType,
    vehicleLabel: getVehicleLabel(vehicleType),
    chargedMinutes,
    billableMinutes,
    subtotal,
    taxRate: TAX_RATE,
    tax,
    total
  };
}

export { DEFAULT_TARIFFS, TAX_RATE };
