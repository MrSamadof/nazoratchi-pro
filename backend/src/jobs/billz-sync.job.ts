import { billzService } from '../modules/billz/billz.service.js';
import { logger } from '../core/logger/logger.js';
import { startOfTashkentDay } from '../core/utils/date.js';

/**
 * Har soatda Billz API dan bugungi savdolarni sinxronizatsiya qiladi.
 */
export async function syncBillzJob(): Promise<void> {
  try {
    const result = await billzService.syncAllStores(startOfTashkentDay());
    logger.info(result, 'Billz cron sinx tugadi');
  } catch (err) {
    logger.error({ err }, 'Billz cron xato');
  }
}
