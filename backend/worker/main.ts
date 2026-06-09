/**
 * Worker jarayoni — Next.js web ilovasidan alohida ishlaydi.
 * Vazifalari:
 *  - Cron joblar (kunlik/haftalik/oylik hisobotlar, ertalabki eslatma, Billz sinxronizatsiya)
 *  - Outgoing Telegram bildirishnomalari
 *
 * Docker da: alohida konteyner sifatida ishga tushadi.
 * Local da: `npm run worker:dev` (auto-reload) yoki `npm run worker`.
 */

import "../src/core/config/load-env.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "../src/core/database/connection.js";
import { startJobs } from "../src/jobs/index.js";
import { isTelegramEnabled } from "../src/notifications/telegram.js";
import { startTelegramBot, stopTelegramBot } from "../src/notifications/telegram-bot.js";
import { logger } from "../src/core/logger/logger.js";

async function bootstrap(): Promise<void> {
  logger.info("Nazoratchi worker ishga tushmoqda...");

  await connectDatabase();
  startJobs();
  // Telegram bog'lash uchun incoming listener (faqat shu jarayonda).
  await startTelegramBot();

  logger.info(
    {
      telegram: (await isTelegramEnabled())
        ? "yoqilgan"
        : "o'chirilgan (token sozlanmagan)",
    },
    "Worker tayyor — cron joblar kutmoqda",
  );
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "O'chirish signali keldi, to'xtatilmoqda...");
  await stopTelegramBot();
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — worker to'xtatilmoqda");
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.fatal({ err }, "bootstrap() xato bilan tugadi");
  process.exit(1);
});
