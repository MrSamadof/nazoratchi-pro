import { PenaltyRule, type PenaltyType } from './penalties.model.js';

export class PenaltiesService {
  /**
   * Berilgan kechikish daqiqasi uchun tegishli jarima miqdorini topadi.
   */
  async calculatePenalty(type: PenaltyType, minutes: number): Promise<number> {
    if (minutes <= 0) return 0;

    const rule = await PenaltyRule.findOne({
      type,
      isActive: true,
      minMinutes: { $lte: minutes },
      $or: [{ maxMinutes: null }, { maxMinutes: { $gte: minutes } }],
    }).sort({ minMinutes: -1 });

    return rule?.amount ?? 0;
  }

  /**
   * Kelmaganlik (absence) jarimasi — daqiqaga bog'liq emas, faol "absence"
   * qoidasidagi eng yuqori miqdor olinadi. Qoida bo'lmasa 0.
   */
  async getAbsencePenalty(): Promise<number> {
    const rule = await PenaltyRule.findOne({
      type: 'absence',
      isActive: true,
    }).sort({ amount: -1 });
    return rule?.amount ?? 0;
  }

  async findAllRules(): Promise<typeof PenaltyRule.prototype[]> {
    return PenaltyRule.find({ isActive: true }).sort({ type: 1, minMinutes: 1 });
  }
}

export const penaltiesService = new PenaltiesService();
