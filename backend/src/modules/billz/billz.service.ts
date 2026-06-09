import axios, { type AxiosInstance, type AxiosRequestConfig, isAxiosError } from 'axios';
import type { Types } from 'mongoose';
import { BillzSale, type BillzSaleDoc } from './billz.model.js';
import { Store } from '../stores/stores.model.js';
import { env } from '../../core/config/env.js';
import { logger } from '../../core/logger/logger.js';
import { API_DATE_FORMAT, TIMEZONE } from '../../core/config/constants.js';
import { formatInTimeZone } from 'date-fns-tz';
import { appSettingsService } from '../app-settings/app-settings.service.js';

/**
 * BILLZ 2.0 POS API klienti.
 *
 * Auth: integratsiya `secret_token` (CEO panelida, DB da shifrlangan) bilan
 * `POST /v1/auth/login` orqali JWT access token olinadi. Token keshlanadi va
 * muddati tugashidan oldin qayta olinadi. 401 da bir marta qayta login qilinadi.
 *
 * Savdo: hisobot endpointlari ruxsat talab qiladi (403), shuning uchun kunlik
 * savdo `GET /v3/order-search` orqali har do'kon/kun bo'yicha agregatsiya qilinadi.
 *
 * Hujjat: https://billzuz.notion.site/API-c2f91aa254f94f8eb7c1b26415dcb25b
 */

// Refresh uchun hujjatda ko'rsatilgan statik platform-id.
const PLATFORM_ID = '7d4a4c38-dd84-4902-b744-0488b80a4c01';
const DEFAULT_BASE_URL = 'https://api-admin.billz.ai';
// Token muddati tugashidan shuncha oldin (ms) yangilaymiz.
const EXPIRY_SKEW_MS = 60_000;

export class BillzError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'not_configured'
      | 'auth_failed'
      | 'forbidden'
      | 'request_failed' = 'request_failed',
  ) {
    super(message);
    this.name = 'BillzError';
  }
}

interface LoginData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface OrderSearchResponse {
  count: number;
  orders_sorted_by_date_list: Array<{
    date: string;
    orders: Array<{
      id: string;
      order_type: string;
      order_detail: {
        total_price: number;
        total_products_measurement_value: number;
        total_sets_measurement_value: number;
        total_services_measurement_value: number;
      };
    }>;
  }> | null;
}

export interface BillzShop {
  id: string;
  name: string;
}

export interface BillzConnectionInfo {
  company: { id: string; name: string };
  shopCount: number;
  shops: BillzShop[];
}

export class BillzService {
  private http: AxiosInstance;
  private token: { value: string; companyId: string; expiresAt: number } | null = null;
  private loginPromise: Promise<void> | null = null;

  constructor() {
    // env.BILLZ_API_URL eski sozlamalarda `/v1` bilan kelishi mumkin — uni olib
    // tashlaymiz, chunki metodlar /v1, /v2, /v3 ni aralash ishlatadi.
    const base = (env.BILLZ_API_URL ?? DEFAULT_BASE_URL).replace(/\/v\d+\/?$/, '').replace(/\/$/, '');
    this.http = axios.create({ baseURL: base, timeout: 30_000 });
  }

  // ---- Auth ----

  /** Joriy secret_token (DB → shifrdan ochilgan). */
  private async getSecret(): Promise<string> {
    const { billzSecretToken } = await appSettingsService.get();
    if (!billzSecretToken) {
      throw new BillzError('Billz secret_token sozlanmagan', 'not_configured');
    }
    return billzSecretToken;
  }

  /** JWT payload'idan company_id ni o'qiydi (qo'shimcha so'rovsiz). */
  private decodeCompanyId(jwt: string): string {
    try {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64').toString('utf8'));
      return typeof payload.company_id === 'string' ? payload.company_id : '';
    } catch {
      return '';
    }
  }

  /** secret_token bilan login qilib, access token oladi va keshlaydi. */
  private async login(): Promise<void> {
    const secret = await this.getSecret();
    try {
      const { data } = await this.http.post<{ data: LoginData }>(
        '/v1/auth/login',
        { secret_token: secret },
        { headers: { 'Content-Type': 'application/json', accept: 'application/json' } },
      );
      const d = data.data;
      this.token = {
        value: d.access_token,
        companyId: this.decodeCompanyId(d.access_token),
        expiresAt: Date.now() + d.expires_in * 1000 - EXPIRY_SKEW_MS,
      };
    } catch (err) {
      if (isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 400)) {
        throw new BillzError("Billz secret_token noto'g'ri yoki eskirgan", 'auth_failed');
      }
      throw new BillzError('Billz login amalga oshmadi', 'auth_failed');
    }
  }

  /** Kerak bo'lsa login qiladi (parallel so'rovlarda bitta login). */
  private async ensureToken(force = false): Promise<void> {
    if (!force && this.token && Date.now() < this.token.expiresAt) return;
    if (!this.loginPromise) {
      this.loginPromise = this.login().finally(() => {
        this.loginPromise = null;
      });
    }
    await this.loginPromise;
  }

  private async getCompanyId(): Promise<string> {
    await this.ensureToken();
    return this.token!.companyId;
  }

  /**
   * Avtorizatsiyalangan so'rov. 401 da bir marta qayta login qilib qayta uradi.
   * 403 — metodga ruxsat yo'q (BILLZ UI'da rol sozlanishi kerak).
   */
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    await this.ensureToken();
    const send = async (): Promise<T> => {
      const res = await this.http.request<T>({
        ...config,
        headers: {
          accept: 'application/json',
          'platform-id': PLATFORM_ID,
          ...config.headers,
          Authorization: `Bearer ${this.token!.value}`,
        },
      });
      return res.data;
    };
    try {
      return await send();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        await this.ensureToken(true);
        return send();
      }
      if (isAxiosError(err) && err.response?.status === 403) {
        throw new BillzError(`Billz: metodga ruxsat yo'q (403): ${config.url}`, 'forbidden');
      }
      throw new BillzError(
        `Billz so'rov xatosi (${isAxiosError(err) ? err.response?.status : '?'}): ${config.url}`,
        'request_failed',
      );
    }
  }

  // ---- Umumiy ma'lumotlar ----

  async getShops(): Promise<BillzShop[]> {
    const data = await this.request<{ shops: Array<{ id: string; name: string }> }>({
      method: 'GET',
      url: '/v1/shop',
      params: { limit: 100, only_allowed: true },
    });
    return (data.shops ?? []).map((s) => ({ id: s.id, name: s.name }));
  }

  /** Ulanishni tekshiradi — kompaniya nomi va do'konlar ro'yxatini qaytaradi. */
  async testConnection(): Promise<BillzConnectionInfo> {
    const company = await this.request<{ id: string; name: string }>({
      method: 'GET',
      url: '/v1/company',
    });
    const shops = await this.getShops();
    return {
      company: { id: company.id, name: company.name },
      shopCount: shops.length,
      shops,
    };
  }

  // ---- Savdo (order-search agregatsiyasi) ----

  /**
   * Bitta do'kon uchun bir kunlik savdoni order-search orqali oladi, yig'indini
   * hisoblab BillzSale cache'ga yozadi.
   */
  async fetchStoreSales(
    storeId: Types.ObjectId,
    billzUuid: string,
    date: Date,
  ): Promise<{ totalAmount: number; itemCount: number; transactionCount: number } | null> {
    if (!(await appSettingsService.isBillzConfigured())) {
      logger.warn('Billz sozlanmagan — sinx o\'tkazib yuborildi');
      return null;
    }

    const dateStr = formatInTimeZone(date, TIMEZONE, API_DATE_FORMAT);
    const companyId = await this.getCompanyId();

    let totalAmount = 0;
    let itemCount = 0;
    let transactionCount = 0;
    const limit = 100;
    let page = 1;

    // count bo'yicha sahifalab yuramiz.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = await this.request<OrderSearchResponse>({
        method: 'GET',
        url: '/v3/order-search',
        params: {
          company_id: companyId,
          shop_ids: billzUuid,
          start_date: dateStr,
          end_date: dateStr,
          limit,
          page,
        },
      });

      const groups = data.orders_sorted_by_date_list ?? [];
      let pageOrders = 0;
      for (const group of groups) {
        for (const o of group.orders) {
          pageOrders++;
          transactionCount++;
          const od = o.order_detail;
          totalAmount += od.total_price ?? 0;
          itemCount +=
            (od.total_products_measurement_value ?? 0) +
            (od.total_sets_measurement_value ?? 0) +
            (od.total_services_measurement_value ?? 0);
        }
      }

      if (pageOrders < limit || page * limit >= (data.count ?? 0)) break;
      page++;
    }

    await BillzSale.findOneAndUpdate(
      { storeId, date },
      {
        $set: {
          storeId,
          date,
          totalAmount,
          itemCount,
          transactionCount,
          rawResponse: { source: 'v3/order-search', dateStr, billzUuid },
          fetchedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    return { totalAmount, itemCount, transactionCount };
  }

  /**
   * Barcha Billz do'konlaridan berilgan sana savdosini sinxronizatsiya qiladi.
   * Cron tomonidan har soat chaqiriladi.
   */
  async syncAllStores(date: Date = new Date()): Promise<{ synced: number; failed: number }> {
    if (!(await appSettingsService.isBillzConfigured())) {
      logger.warn('Billz sozlanmagan — sinx o\'tkazib yuborildi');
      return { synced: 0, failed: 0 };
    }

    const stores = await Store.find({
      hasBillz: true,
      isActive: true,
      billzUuid: { $ne: null },
    });

    let synced = 0;
    let failed = 0;
    for (const store of stores) {
      if (!store.billzUuid) continue;
      try {
        await this.fetchStoreSales(store._id, store.billzUuid, date);
        synced++;
      } catch (err) {
        failed++;
        logger.error({ err, store: store.name, billzUuid: store.billzUuid }, 'Billz do\'kon sinx xato');
      }
    }

    logger.info({ synced, failed, date: date.toISOString() }, 'Billz sinx tugadi');
    return { synced, failed };
  }

  // ---- Cache o'qish ----

  /** Berilgan davr uchun cache dan do'konlar savdolarini oladi. */
  async getStoreSales(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ storeName: string; totalAmount: number; itemCount: number }>> {
    const result = await BillzSale.aggregate<{
      _id: Types.ObjectId;
      totalAmount: number;
      itemCount: number;
      storeName: string;
    }>([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$storeId',
          totalAmount: { $sum: '$totalAmount' },
          itemCount: { $sum: '$itemCount' },
        },
      },
      { $lookup: { from: 'stores', localField: '_id', foreignField: '_id', as: 'store' } },
      { $unwind: '$store' },
      { $project: { storeName: '$store.name', totalAmount: 1, itemCount: 1 } },
      { $sort: { totalAmount: -1 } },
    ]);

    return result.map((r) => ({
      storeName: r.storeName,
      totalAmount: r.totalAmount,
      itemCount: r.itemCount,
    }));
  }

  /** Eski v1 dagi hisobot formati: do'kon bo'yicha tartiblangan. */
  async getCachedDailySales(date: Date): Promise<BillzSaleDoc[]> {
    return BillzSale.find({ date }).populate('storeId').sort({ totalAmount: -1 });
  }

  /** Bitta do'kon uchun shu kungi cache. */
  async getCachedForStore(storeId: Types.ObjectId, date: Date): Promise<BillzSaleDoc | null> {
    return BillzSale.findOne({ storeId, date });
  }
}

export const billzService = new BillzService();
