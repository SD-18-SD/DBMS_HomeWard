import { z } from 'zod';

// A MongoDB id: 24 hexadecimal characters.
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

// Forms with files are sent as multipart/form-data, where every value is text.
// This turns "true" / "false" into real booleans.
export const formBoolean = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((v) => v === true || v === 'true');

// When editing, the browser sends the photos it wants to keep as a JSON text,
// for example '["/uploads/a.jpg"]'. Missing means "keep all".
export const keepPhotos = z
  .string()
  .optional()
  .transform((text) => {
    if (text === undefined) return undefined;
    try {
      const list = JSON.parse(text);
      return Array.isArray(list) ? list.filter((p) => typeof p === 'string') : [];
    } catch {
      return [];
    }
  });
