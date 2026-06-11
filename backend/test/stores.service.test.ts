import { afterEach, describe, expect, it } from 'vitest';
import { storesService, DuplicateSlugError } from '../src/modules/stores/stores.service.js';
import { Store } from '../src/modules/stores/stores.model.js';

afterEach(async () => {
  await Store.deleteMany({});
});

describe('storesService.create — slug uniqueness', () => {
  it('rejects a slug that belongs to an ACTIVE store with a typed error', async () => {
    await storesService.create({ name: 'Amir Kids', slug: 'amir-kids' });

    const err = await storesService
      .create({ name: 'Boshqa nom', slug: 'amir-kids' })
      .catch((e) => e);

    expect(err).toBeInstanceOf(DuplicateSlugError);
    expect((err as DuplicateSlugError).deletedStore).toBe(false);
  });

  it('rejects a slug that belongs to a SOFT-DELETED store with a typed error', async () => {
    // The original bug: a soft-deleted store still holds the globally-unique
    // slug, so re-creating it surfaced a raw E11000 -> generic "Texnik xato".
    const created = await storesService.create({ name: 'Amir Premium', slug: 'amir-premium' });
    await storesService.deactivate(created._id);

    const err = await storesService
      .create({ name: 'Amir Premium', slug: 'amir-premium' })
      .catch((e) => e);

    expect(err).toBeInstanceOf(DuplicateSlugError);
    expect((err as DuplicateSlugError).deletedStore).toBe(true);
  });

  it('allows a fresh, unused slug', async () => {
    const created = await storesService.create({ name: 'Yangi Dokon', slug: 'yangi-dokon' });
    expect(created.slug).toBe('yangi-dokon');
    expect(created.isActive).toBe(true);
  });
});
