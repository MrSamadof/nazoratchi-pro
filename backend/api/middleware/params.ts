import type { Request, Response } from 'express';
import { Types } from 'mongoose';

/**
 * Express 5 type'larida `req.params.id` `string | string[]` deb taklif qilinadi.
 * Bu helper uni `string` ga keltirib, ObjectId validatsiyasini ham bajaradi.
 *
 * Agar id yoʻq yoki notoʻgʻri boʻlsa, 400 javob qaytaradi va `null` beradi —
 * caller `if (!id) return;` qilib chiqib ketishi kerak.
 */
export function getObjectIdParam(
  req: Request,
  res: Response,
  name = 'id',
): string | null {
  const raw = req.params[name];
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || !Types.ObjectId.isValid(id)) {
    res.status(400).json({ ok: false, error: "Noto'g'ri ID" });
    return null;
  }
  return id;
}
