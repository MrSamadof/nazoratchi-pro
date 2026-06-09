import { attendancesService } from '../modules/attendances/attendances.service.js';
import { startOfTashkentDay } from '../core/utils/date.js';
import { logger } from '../core/logger/logger.js';

/**
 * Kelmaganlikni aniqlash — kun oxirida (kechki smena tugaganidan keyin) ishlaydi.
 * Ishlashi kerak edi-yu kelmagan xodimlarni `absent` deb belgilaydi va
 * kelmaganlik jarimasini qo'llaydi. Dam olish kuni bo'lganlar tegilmaydi.
 */
export async function markAbsenteesJob(): Promise<void> {
  const day = startOfTashkentDay();
  const { marked } = await attendancesService.markAbsentees(day);
  logger.info({ marked }, 'Kelmaganlar belgilandi');
}
