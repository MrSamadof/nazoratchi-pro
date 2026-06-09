import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { logger } from '../../core/logger/logger.js';
import { appSettingsService } from '../app-settings/app-settings.service.js';

const SYSTEM_PROMPT = `Sen "Amir" kompaniyasining Nazoratchi AI yordamchisisan.
Faqat o'zbek tilida javob ber. Qisqa, aniq, do'stona ohangda.

Asosiy vazifang — hisobotlarni tahlil qilish va admin uchun xulosa berish.

Qoidalar:
- Sana formati: DD.MM.YYYY
- Vaqt formati: HH:MM
- Pul: "1 000 000 so'm" (probel bilan)
- Soxta ma'lumot bermaslik. Ma'lumot yo'q bo'lsa: "Ma'lumot yetarli emas"
- Markdown emas, oddiy matn
- Maksimum 500 so'z`;

export class AIService {
  // Kalit/model o'zgarmasa qayta yaratmaslik uchun keshlanadi.
  private cached: { apiKey: string; model: string; instance: GenerativeModel } | null = null;

  /**
   * Gemini modelini CEO sozlamalaridan (DB) oladi. Kalit yoki model nomi
   * o'zgargan bo'lsa qayta quradi. Kalit sozlanmagan bo'lsa null.
   */
  private async getModel(): Promise<GenerativeModel | null> {
    const { geminiApiKey, geminiModel } = await appSettingsService.get();
    if (!geminiApiKey) return null;

    if (
      !this.cached ||
      this.cached.apiKey !== geminiApiKey ||
      this.cached.model !== geminiModel
    ) {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const instance = genAI.getGenerativeModel({
        model: geminiModel,
        systemInstruction: SYSTEM_PROMPT,
      });
      this.cached = { apiKey: geminiApiKey, model: geminiModel, instance };
    }
    return this.cached.instance;
  }

  /**
   * Hisobot tahlilini olish.
   */
  async analyzeReport(reportText: string, period: string): Promise<string | null> {
    const model = await this.getModel();
    if (!model) {
      logger.warn('Gemini AI sozlanmagan, tahlil o\'tkazib yuborildi');
      return null;
    }

    try {
      const prompt = `Quyidagi ${period} hisobotini tahlil qil va admin uchun qisqa xulosa ber:

${reportText}

Tahlilingda ko'rsat:
- Eng yaxshi va eng zaif ko'rsatkichlar
- Diqqat talab qiladigan jihatlar
- Tavsiyalar (agar bo'lsa)`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      logger.error({ err }, 'Gemini tahlil xatosi');
      return null;
    }
  }

  /**
   * Erkin so'rov (admin chat uchun).
   */
  async chat(question: string): Promise<string | null> {
    const model = await this.getModel();
    if (!model) return null;

    try {
      const result = await model.generateContent(question);
      return result.response.text();
    } catch (err) {
      logger.error({ err }, 'Gemini chat xatosi');
      return null;
    }
  }

  async isEnabled(): Promise<boolean> {
    return appSettingsService.isGeminiConfigured();
  }
}

export const aiService = new AIService();
