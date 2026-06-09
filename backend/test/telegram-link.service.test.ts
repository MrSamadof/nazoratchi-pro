import { describe, expect, it } from 'vitest';
import {
  telegramLinkService,
  TelegramLinkError,
} from '../src/modules/telegram/telegram-link.service.js';
import { User } from '../src/modules/users/users.model.js';

let phoneCounter = 0;
function uniquePhone(): string {
  phoneCounter += 1;
  return `99890${String(1000000 + phoneCounter)}`;
}

/** Create a user with an optional pending link token. */
async function makeUser(
  fields: {
    token?: string | null;
    expiresAt?: Date | null;
    telegramId?: number | null;
    telegramUsername?: string | null;
  } = {},
) {
  return User.create({
    firstName: 'Ali',
    lastName: 'Valiyev',
    phone: uniquePhone(),
    passwordHash: 'x',
    role: 'employee',
    telegramLinkToken: fields.token ?? null,
    telegramLinkExpiresAt: fields.expiresAt ?? null,
    telegramId: fields.telegramId ?? null,
    telegramUsername: fields.telegramUsername ?? null,
  });
}

const future = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 1_000);

describe('TelegramLinkService.consumeToken', () => {
  it('links the Telegram account on a valid token and clears the token', async () => {
    const user = await makeUser({ token: 'tok-ok', expiresAt: future() });

    const result = await telegramLinkService.consumeToken('tok-ok', 555, 'aliuser');

    expect(result.telegramId).toBe(555);
    expect(result.telegramUsername).toBe('aliuser');
    expect(result.telegramLinkToken).toBeNull();
    expect(result.telegramLinkExpiresAt).toBeNull();

    // persisted, not just on the returned doc.
    const inDb = await User.findById(user._id);
    expect(inDb!.telegramId).toBe(555);
    expect(inDb!.telegramLinkToken).toBeNull();
  });

  it('trims whitespace and matches the token', async () => {
    await makeUser({ token: 'tok-trim', expiresAt: future() });

    const result = await telegramLinkService.consumeToken('  tok-trim  ', 600);
    expect(result.telegramId).toBe(600);
    // username omitted → stored as null.
    expect(result.telegramUsername).toBeNull();
  });

  it('rejects an unknown token with INVALID_TOKEN', async () => {
    await makeUser({ token: 'real-token', expiresAt: future() });

    await expect(telegramLinkService.consumeToken('wrong-token', 555)).rejects.toMatchObject({
      name: 'TelegramLinkError',
      code: 'INVALID_TOKEN',
    });
  });

  it('rejects an empty token with INVALID_TOKEN', async () => {
    await expect(telegramLinkService.consumeToken('   ', 555)).rejects.toBeInstanceOf(
      TelegramLinkError,
    );
    await expect(telegramLinkService.consumeToken('   ', 555)).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
  });

  it('rejects an expired token with EXPIRED and clears the stale token', async () => {
    const user = await makeUser({ token: 'tok-exp', expiresAt: past() });

    await expect(telegramLinkService.consumeToken('tok-exp', 555)).rejects.toMatchObject({
      code: 'EXPIRED',
    });

    // stale token wiped, account NOT linked.
    const inDb = await User.findById(user._id);
    expect(inDb!.telegramLinkToken).toBeNull();
    expect(inDb!.telegramLinkExpiresAt).toBeNull();
    expect(inDb!.telegramId).toBeNull();
  });

  it('refuses to steal a Telegram id already linked to another user', async () => {
    await makeUser({ telegramId: 999, telegramUsername: 'owner' });
    const requester = await makeUser({ token: 'tok-dup', expiresAt: future() });

    await expect(telegramLinkService.consumeToken('tok-dup', 999)).rejects.toMatchObject({
      code: 'ALREADY_LINKED_OTHER',
    });

    // requester stays unlinked; token left intact so they can retry with their own account.
    const inDb = await User.findById(requester._id);
    expect(inDb!.telegramId).toBeNull();
    expect(inDb!.telegramLinkToken).toBe('tok-dup');
  });

  it('lets the same user re-link / refresh their own Telegram account', async () => {
    const user = await makeUser({
      token: 'tok-relink',
      expiresAt: future(),
      telegramId: 777,
      telegramUsername: 'old',
    });

    const result = await telegramLinkService.consumeToken('tok-relink', 777, 'new');

    expect(result._id.toString()).toBe(user._id.toString());
    expect(result.telegramId).toBe(777);
    expect(result.telegramUsername).toBe('new');
    expect(result.telegramLinkToken).toBeNull();
  });
});
