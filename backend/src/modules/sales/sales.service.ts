import type { Types } from 'mongoose';
import { Sale, type SaleDoc, type SaleSource } from './sales.model.js';
import { startOfTashkentDay, addDays } from '../../core/utils/date.js';

export class SalesService {
  async create(params: {
    userId: Types.ObjectId;
    storeId: Types.ObjectId;
    quantity: number;
    notes?: string;
    source?: SaleSource;
  }): Promise<SaleDoc> {
    return Sale.create({
      userId: params.userId,
      storeId: params.storeId,
      date: startOfTashkentDay(),
      quantity: params.quantity,
      notes: params.notes ?? '',
      source: params.source ?? 'manual',
    });
  }

  /**
   * Foydalanuvchining bugungi savdolari (bir kunda bir nechta yozuv bo'lishi mumkin).
   */
  async getTodayByUser(userId: Types.ObjectId): Promise<SaleDoc[]> {
    return Sale.find({ userId, date: startOfTashkentDay() }).sort({ createdAt: -1 });
  }

  /**
   * Do'kon bo'yicha kunlik jami savdo (manual).
   */
  async getDailyStoreTotal(
    storeId: Types.ObjectId,
    date: Date = startOfTashkentDay(),
  ): Promise<{ quantity: number; count: number }> {
    const result = await Sale.aggregate<{ quantity: number; count: number }>([
      { $match: { storeId, date } },
      {
        $group: {
          _id: null,
          quantity: { $sum: '$quantity' },
          count: { $sum: 1 },
        },
      },
    ]);
    return result[0] ?? { quantity: 0, count: 0 };
  }

  /**
   * Kunlik — do'kon bo'yicha sotilgan mahsulot soni (ko'pdan kamga).
   * Avto-rag'bat: eng ko'p sotgan do'konni aniqlash uchun.
   */
  async getDailyQuantityByStore(
    date: Date = startOfTashkentDay(),
  ): Promise<Array<{ storeId: Types.ObjectId; quantity: number }>> {
    return Sale.aggregate([
      { $match: { date } },
      { $group: { _id: '$storeId', quantity: { $sum: '$quantity' } } },
      { $match: { quantity: { $gt: 0 } } },
      { $sort: { quantity: -1 } },
      { $project: { _id: 0, storeId: '$_id', quantity: 1 } },
    ]);
  }

  /**
   * Kunlik — xodim bo'yicha sotilgan mahsulot soni (ko'pdan kamga).
   * Avto-rag'bat: bo'lim bo'yicha eng ko'p sotgan xodimni aniqlash uchun.
   */
  async getDailyQuantityByUser(
    date: Date = startOfTashkentDay(),
  ): Promise<Array<{ userId: Types.ObjectId; quantity: number }>> {
    return Sale.aggregate([
      { $match: { date } },
      { $group: { _id: '$userId', quantity: { $sum: '$quantity' } } },
      { $match: { quantity: { $gt: 0 } } },
      { $sort: { quantity: -1 } },
      { $project: { _id: 0, userId: '$_id', quantity: 1 } },
    ]);
  }

  /**
   * Davr bo'yicha xodim statistikasi.
   */
  async getUserStats(
    userId: Types.ObjectId,
    days = 7,
  ): Promise<{ totalQuantity: number; saleDays: number }> {
    const to = startOfTashkentDay();
    const from = addDays(to, -(days - 1));

    const result = await Sale.aggregate<{
      _id: null;
      totalQuantity: number;
      saleDays: Date[];
    }>([
      { $match: { userId, date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          saleDays: { $addToSet: '$date' },
        },
      },
    ]);

    const agg = result[0];
    return {
      totalQuantity: agg?.totalQuantity ?? 0,
      saleDays: agg?.saleDays.length ?? 0,
    };
  }
}

export const salesService = new SalesService();
