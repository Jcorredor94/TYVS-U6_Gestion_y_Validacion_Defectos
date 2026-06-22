import { createParkingServer } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';

createParkingServer().listen(port, host, () => {
  console.log(`ParkControl disponible en http://${host}:${port}`);
});
