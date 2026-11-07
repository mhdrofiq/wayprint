import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { db, r2Pages, r2Sent } from './fakes';
import * as pins from '@/app/api/pins/route';
import * as pin from '@/app/api/pins/[id]/route';
import * as burst from '@/app/api/pins/[id]/burst/route';
import * as pinCollections from '@/app/api/pins/[id]/collections/route';
import * as collection from '@/app/api/collections/[id]/route';
import * as images from '@/app/api/images/route';
import * as imageRoute from '@/app/api/images/[id]/route';
import * as reactions from '@/app/api/images/[id]/reactions/route';
import * as reaction from '@/app/api/reactions/[id]/route';
import { hashReactorKey } from '@/lib/reactor-key';

vi.mock('crypto', async (original) => ({
  ...(await original<typeof import('crypto')>()),
  randomUUID: () => '223e4567-e89b-12d3-a456-426614174000',
}));

const ID = '123e4567-e89b-12d3-a456-426614174000';
const ID2 = '223e4567-e89b-12d3-a456-426614174000';
const NOT_FOUND = { code: 'PGRST116', message: 'no rows' };
const DB_DOWN = { code: '08006', message: 'db down' };
const KEY = 'k'.repeat(20);

function req(path: string, init: { method?: string; body?: unknown; admin?: boolean; headers?: Record<string, string> } = {}) {
  const headers = new Headers(init.headers);
  if (init.admin) headers.set('Authorization', 'Bearer good-token');
  let body: BodyInit | undefined;
  if (init.body instanceof FormData) body = init.body;
  else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers.set('Content-Type', 'application/json');
  }
  return new NextRequest(`http://localhost${path}`, { method: init.method ?? 'GET', headers, body });
}
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });
const asAdmin = () => { db.user = { id: 'admin-user' }; };
const script = (table: string, ...results: object[]) => { db.script[table] = results; };
const json = async (res: Response) => [res.status, res.status === 204 ? null : await res.json()];

describe('admin auth', () => {
  it('rejects writes with no token, a bad token, or a non-admin user', async () => {
    expect(await json(await pins.POST(req('/api/pins', { method: 'POST', body: {} }), undefined))).toEqual([401, { error: 'Unauthorized' }]);
    expect((await pins.POST(req('/api/pins', { method: 'POST', body: {}, headers: { Authorization: 'Bearer bad' } }), undefined)).status).toBe(401);
    db.user = { id: 'someone-else' };
    expect((await pins.POST(req('/api/pins', { method: 'POST', body: {}, admin: true }), undefined)).status).toBe(401);
    expect(db.ops('pins', 'insert')).toEqual([]);
  });

  it.each([
    ['PATCH pin', () => pin.PATCH(req('/', { method: 'PATCH', body: { label: 'x' } }), ctx())],
    ['DELETE pin', () => pin.DELETE(req('/', { method: 'DELETE' }), ctx())],
    ['POST collection', () => pinCollections.POST(req('/', { method: 'POST', body: { name: 'x' } }), ctx())],
    ['PATCH collection', () => collection.PATCH(req('/', { method: 'PATCH', body: { name: 'x' } }), ctx())],
    ['DELETE collection', () => collection.DELETE(req('/', { method: 'DELETE' }), ctx())],
    ['POST image', () => images.POST(req('/', { method: 'POST', body: new FormData() }), undefined)],
    ['PATCH image', () => imageRoute.PATCH(req('/', { method: 'PATCH', body: { caption: 'x' } }), ctx())],
    ['DELETE image', () => imageRoute.DELETE(req('/', { method: 'DELETE' }), ctx())],
  ])('%s needs the admin', async (_, call) => {
    expect((await call()).status).toBe(401);
    expect(db.calls).toEqual([]);
  });

  it.each([
    ['GET pin', () => pin.GET(req('/'), ctx('nope'))],
    ['GET burst', () => burst.GET(req('/'), ctx('nope'))],
    ['PATCH pin', () => pin.PATCH(req('/', { method: 'PATCH', admin: true, body: { label: 'x' } }), ctx('nope'))],
    ['DELETE pin', () => pin.DELETE(req('/', { method: 'DELETE', admin: true }), ctx('nope'))],
    ['POST collection', () => pinCollections.POST(req('/', { method: 'POST', admin: true, body: { name: 'x' } }), ctx('nope'))],
    ['PATCH collection', () => collection.PATCH(req('/', { method: 'PATCH', admin: true, body: { name: 'x' } }), ctx('nope'))],
    ['DELETE collection', () => collection.DELETE(req('/', { method: 'DELETE', admin: true }), ctx('nope'))],
    ['PATCH image', () => imageRoute.PATCH(req('/', { method: 'PATCH', admin: true, body: { caption: 'x' } }), ctx('nope'))],
    ['DELETE image', () => imageRoute.DELETE(req('/', { method: 'DELETE', admin: true }), ctx('nope'))],
    ['POST reaction', () => reactions.POST(req('/', { method: 'POST', body: { emoji: '🙂' } }), ctx('nope'))],
    ['DELETE reaction', () => reaction.DELETE(req('/', { method: 'DELETE' }), ctx('nope'))],
  ])('%s 404s on a non-uuid id', async (_, call) => {
    asAdmin();
    expect(await json(await call())).toEqual([404, { error: 'Not found' }]);
    expect(db.calls).toEqual([]);
  });
});

describe('pins', () => {
  it('lists pins with flattened image counts and a CDN cache header', async () => {
    script('pins', { data: [{ id: 'a', label: 'A', images: [{ count: 3 }] }, { id: 'b', label: 'B', images: [] }] });
    const res = await pins.GET(req('/api/pins'), undefined);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=300');
    expect(await res.json()).toEqual([{ id: 'a', label: 'A', image_count: 3 }, { id: 'b', label: 'B', image_count: 0 }]);
    expect(db.ops('pins', 'order')).toEqual([['created_at', { ascending: true }]]);
  });

  it('turns a list failure into a 500', async () => {
    script('pins', { error: DB_DOWN });
    expect(await json(await pins.GET(req('/api/pins'), undefined))).toEqual([500, { error: 'db down' }]);
  });

  it('creates a pin inside Japan with a trimmed label', async () => {
    asAdmin();
    script('pins', { data: { id: 'new' } });
    const res = await pins.POST(req('/api/pins', { method: 'POST', admin: true, body: { label: '  Kyoto  ', lat: 35, lng: 135.7 } }), undefined);
    expect(await json(res)).toEqual([201, { id: 'new' }]);
    expect(db.ops('pins', 'insert')).toEqual([[{ label: 'Kyoto', lat: 35, lng: 135.7 }]]);
  });

  it.each([
    [{ lat: 35, lng: 135 }, 'label, lat, and lng are required'],
    [{ label: '   ', lat: 35, lng: 135 }, 'label, lat, and lng are required'],
    [{ label: 'x', lng: 135 }, 'label, lat, and lng are required'],
    [{ label: 'x', lat: 23.99, lng: 135 }, 'Coordinates must be within Japan'],
    [{ label: 'x', lat: 46.01, lng: 135 }, 'Coordinates must be within Japan'],
    [{ label: 'x', lat: 35, lng: 121.99 }, 'Coordinates must be within Japan'],
    [{ label: 'x', lat: 35, lng: 154.01 }, 'Coordinates must be within Japan'],
    [{ label: 'x', lat: '35', lng: 135 }, 'Coordinates must be within Japan'],
  ])('rejects pin %j', async (body, error) => {
    asAdmin();
    expect(await json(await pins.POST(req('/api/pins', { method: 'POST', admin: true, body }), undefined))).toEqual([400, { error }]);
    expect(db.ops('pins', 'insert')).toEqual([]);
  });

  it('reads a single pin, 404ing when it is missing', async () => {
    script('pins', { data: { id: ID } }, { error: NOT_FOUND });
    expect(await json(await pin.GET(req('/'), ctx()))).toEqual([200, { id: ID }]);
    expect(await json(await pin.GET(req('/'), ctx()))).toEqual([404, { error: 'no rows' }]);
  });

  it('renames a pin and stamps updated_at', async () => {
    vi.useFakeTimers({ now: new Date('2026-03-04T05:06:07.000Z') });
    asAdmin();
    script('pins', { data: { id: ID, label: 'New' } });
    expect(await json(await pin.PATCH(req('/', { method: 'PATCH', admin: true, body: { label: ' New ' } }), ctx()))).toEqual([200, { id: ID, label: 'New' }]);
    expect(db.ops('pins', 'update')).toEqual([[{ label: 'New', updated_at: '2026-03-04T05:06:07.000Z' }]]);
    expect(db.ops('pins', 'eq')).toEqual([['id', ID]]);
  });

  it.each([[24, 122], [46, 154]])('accepts the Japan box corner %d, %d', async (lat, lng) => {
    asAdmin();
    script('pins', { data: {} });
    expect((await pins.POST(req('/api/pins', { method: 'POST', admin: true, body: { label: 'x', lat, lng } }), undefined)).status).toBe(201);
  });

  it('rejects an empty pin label', async () => {
    asAdmin();
    expect(await json(await pin.PATCH(req('/', { method: 'PATCH', admin: true, body: { label: '' } }), ctx()))).toEqual([400, { error: 'label is required' }]);
  });

  it('deletes a pin and every R2 object under its prefix', async () => {
    asAdmin();
    r2Pages.push(
      { Contents: [{ Key: 'images/p/a/full.webp' }, { Key: 'images/p/a/thumb.webp' }], IsTruncated: true, NextContinuationToken: 't1' },
      { Contents: [{ Key: 'images/p/b/full.webp' }, {}] },
    );
    expect(await json(await pin.DELETE(req('/', { method: 'DELETE', admin: true }), ctx()))).toEqual([204, null]);
    expect(db.ops('pins', 'delete')).toHaveLength(1);
    expect(r2Sent.filter((c) => c.name === 'ListObjectsV2Command').map((c) => c.input)).toEqual([
      { Bucket: 'bucket', Prefix: `images/${ID}/`, ContinuationToken: undefined },
      { Bucket: 'bucket', Prefix: `images/${ID}/`, ContinuationToken: 't1' },
    ]);
    expect(r2Sent.filter((c) => c.name === 'DeleteObjectCommand').map((c) => c.input.Key)).toEqual([
      'images/p/a/full.webp', 'images/p/a/thumb.webp', 'images/p/b/full.webp',
    ]);
  });

  it('leaves R2 alone when the pin delete fails', async () => {
    asAdmin();
    script('pins', { error: DB_DOWN });
    expect((await pin.DELETE(req('/', { method: 'DELETE', admin: true }), ctx())).status).toBe(500);
    expect(r2Sent).toEqual([]);
  });

  it('returns a pin burst of images with reactions plus collections', async () => {
    script('images', { data: [{ id: 'i1' }] });
    script('collections', { data: [{ id: 'c1' }] });
    const res = await burst.GET(req('/'), ctx());
    expect(await res.json()).toEqual({ images: [{ id: 'i1' }], collections: [{ id: 'c1' }] });
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=60');
    expect(db.ops('images', 'select')).toEqual([['*, reactions(id, image_id, emoji, pos_x, pos_y, rotation, reactor_name, created_at)']]);
    expect(db.ops('images', 'eq')).toEqual([['pin_id', ID]]);
    expect(db.ops('collections', 'order')).toEqual([['sort_order', { ascending: true }], ['created_at', { ascending: true }]]);
  });

  it('fails the burst when either query fails', async () => {
    script('images', { data: [] });
    script('collections', { error: DB_DOWN });
    expect((await burst.GET(req('/'), ctx())).status).toBe(500);
  });
});

describe('collections', () => {
  it('creates a collection after the existing ones', async () => {
    asAdmin();
    script('collections', { data: { sort_order: 1 } }, { data: { id: 'c' } });
    expect(await json(await pinCollections.POST(req('/', { method: 'POST', admin: true, body: { name: '  Food ' } }), ctx()))).toEqual([201, { id: 'c' }]);
    expect(db.ops('collections', 'insert')).toEqual([[{ pin_id: ID, name: 'Food', sort_order: 2 }]]);
  });

  it.each([[{}], [{ name: '   ' }], [{ name: 7 }]])('rejects collection body %j', async (body) => {
    asAdmin();
    expect(await json(await pinCollections.POST(req('/', { method: 'POST', admin: true, body }), ctx()))).toEqual([400, { error: 'name is required' }]);
    expect(await json(await collection.PATCH(req('/', { method: 'PATCH', admin: true, body }), ctx()))).toEqual([400, { error: 'name is required' }]);
    expect(db.calls).toEqual([]);
  });

  it('renames and deletes a collection', async () => {
    asAdmin();
    script('collections', { data: { id: ID, name: 'B' } }, {}, { error: NOT_FOUND });
    expect(await json(await collection.PATCH(req('/', { method: 'PATCH', admin: true, body: { name: ' B ' } }), ctx()))).toEqual([200, { id: ID, name: 'B' }]);
    expect(db.ops('collections', 'update')).toEqual([[{ name: 'B' }]]);
    expect((await collection.DELETE(req('/', { method: 'DELETE', admin: true }), ctx())).status).toBe(204);
    expect((await collection.DELETE(req('/', { method: 'DELETE', admin: true }), ctx())).status).toBe(404);
  });
});

describe('image upload', () => {
  async function form(fields: Record<string, string | File>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return req('/api/images', { method: 'POST', admin: true, body: fd });
  }
  async function photo(type = 'image/png') {
    const buf = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#888' } }).png().toBuffer();
    return new File([new Uint8Array(buf)], 'a.png', { type });
  }

  it('processes, stores both variants in R2 and appends the record', async () => {
    asAdmin();
    script('pins', { data: { id: ID } });
    script('collections', { data: { id: 'c' } });
    script('images', { data: { sort_order: 3 } }, { data: { id: ID2 } });
    const res = await images.POST(await form({ pin_id: ID, collection_id: ID, file: await photo() }), undefined);
    expect(await json(res)).toEqual([201, { id: ID2 }]);
    expect(r2Sent.map((c) => [c.input.Key, c.input.ContentType, c.input.CacheControl])).toEqual([
      [`images/${ID}/${ID2}/full.webp`, 'image/webp', 'public, max-age=604800, immutable'],
      [`images/${ID}/${ID2}/thumb.webp`, 'image/webp', 'public, max-age=604800, immutable'],
    ]);
    expect(db.ops('images', 'insert')).toEqual([[{
      id: ID2, pin_id: ID, sort_order: 4, collection_id: ID,
      url: `https://cdn.test/images/${ID}/${ID2}/full.webp`,
      thumb_url: `https://cdn.test/images/${ID}/${ID2}/thumb.webp`,
    }]]);
    expect(db.ops('collections', 'eq')).toEqual([['id', ID], ['pin_id', ID]]);
    expect(db.ops('images', 'eq')).toEqual([['pin_id', ID]]);
  });

  it('stores an uncollected photo when collection_id is blank', async () => {
    asAdmin();
    script('pins', { data: { id: ID } });
    script('images', { data: null }, { data: {} });
    expect((await images.POST(await form({ pin_id: ID, collection_id: '', file: await photo() }), undefined)).status).toBe(201);
    expect(db.ops('images', 'insert')[0][0]).toMatchObject({ collection_id: null, sort_order: 0 });
    expect(db.calls.some((c) => c.table === 'collections')).toBe(false);
  });

  it.each([
    [{}, 400, 'pin_id is required'],
    [{ pin_id: ID, collection_id: 'nope' }, 400, 'collection_id must be a UUID'],
    [{ pin_id: ID }, 400, 'file is required'],
  ])('rejects form %j', async (fields, status, error) => {
    asAdmin();
    expect(await json(await images.POST(await form(fields), undefined))).toEqual([status, { error }]);
  });

  it('rejects non-images, huge files, missing pins and foreign collections', async () => {
    asAdmin();
    const text = new File(['hi'], 'a.txt', { type: 'text/plain' });
    expect(await json(await images.POST(await form({ pin_id: ID, file: text }), undefined))).toEqual([400, { error: 'file must be an image' }]);
    const big = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' });
    expect(await json(await images.POST(await form({ pin_id: ID, file: big }), undefined))).toEqual([400, { error: 'file must be under 20MB' }]);
    script('pins', { error: NOT_FOUND });
    expect(await json(await images.POST(await form({ pin_id: ID, file: await photo() }), undefined))).toEqual([404, { error: 'pin not found' }]);
    script('pins', { data: {} });
    script('collections', { error: NOT_FOUND });
    expect(await json(await images.POST(await form({ pin_id: ID, collection_id: ID2, file: await photo() }), undefined))).toEqual([404, { error: 'collection not found' }]);
    expect(r2Sent).toEqual([]);
  });

  it('reports an unreadable image as a 500 without uploading', async () => {
    asAdmin();
    script('pins', { data: {} });
    const junk = new File(['not really a png'], 'a.png', { type: 'image/png' });
    expect(await json(await images.POST(await form({ pin_id: ID, file: junk }), undefined))).toEqual([500, { error: 'could not process image' }]);
    expect(r2Sent).toEqual([]);
  });
});

describe('image edits', () => {
  it('updates caption, order and collection, trimming and capping the caption', async () => {
    asAdmin();
    script('images', { data: { id: ID } }, { data: { id: ID } });
    expect((await imageRoute.PATCH(req('/', { method: 'PATCH', admin: true, body: { caption: `  ${'c'.repeat(400)} `, sort_order: 3, collection_id: null } }), ctx())).status).toBe(200);
    await imageRoute.PATCH(req('/', { method: 'PATCH', admin: true, body: { caption: 5 } }), ctx());
    expect(db.ops('images', 'update')).toEqual([
      [{ caption: 'c'.repeat(300), sort_order: 3, collection_id: null }],
      [{ caption: null }],
    ]);
  });

  it('needs at least one field', async () => {
    asAdmin();
    expect(await json(await imageRoute.PATCH(req('/', { method: 'PATCH', admin: true, body: {} }), ctx()))).toEqual([400, { error: 'caption, sort_order, or collection_id is required' }]);
  });

  it('deletes the record, then both R2 files', async () => {
    asAdmin();
    script('images', { data: { id: ID, pin_id: ID2 } }, {});
    expect((await imageRoute.DELETE(req('/', { method: 'DELETE', admin: true }), ctx())).status).toBe(204);
    expect(r2Sent.map((c) => c.input.Key)).toEqual([`images/${ID2}/${ID}/full.webp`, `images/${ID2}/${ID}/thumb.webp`]);
  });

  it('404s deleting a missing image and keeps R2', async () => {
    asAdmin();
    script('images', { error: NOT_FOUND });
    expect((await imageRoute.DELETE(req('/', { method: 'DELETE', admin: true }), ctx())).status).toBe(404);
    expect(db.ops('images', 'delete')).toEqual([]);
    expect(r2Sent).toEqual([]);
  });
});

describe('reactions', () => {
  const post = (body: unknown, headers: Record<string, string> = { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }) =>
    reactions.POST(req('/', { method: 'POST', body, headers }), ctx());

  const added = (reaction: object = { id: 'r' }) => ({ data: { status: 'ok', reaction } });

  it('adds a reaction for the reactor, storing only the hash of their key', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    script('reactions', { data: [] });
    script('rpc:add_reaction', added());
    expect(await json(await post({ emoji: ' 🇯🇵 ', reactor_name: '  Mahir the traveller ', reactor_key: KEY }))).toEqual([201, { id: 'r' }]);
    const [[args]] = db.ops('rpc:add_reaction', 'rpc');
    expect(args).toMatchObject({
      p_image_id: ID, p_ip: '1.2.3.4', p_emoji: '🇯🇵', p_reactor_name: 'Mahir the traveller'.slice(0, 20),
      p_owner_key_hash: hashReactorKey(KEY), p_cap: 15, p_rate_max: 5, p_rate_window_s: 60,
    });
    expect(db.ops('reactions', 'insert')).toEqual([]);
    expect(db.calls.some((c) => c.table === 'rpc:purge_old_rate_limits')).toBe(true);
  });

  it('defaults to anon with no owner when name and key are missing', async () => {
    script('reactions', { data: [] });
    script('rpc:add_reaction', added({}));
    expect((await post({ emoji: '🙂' }, { 'x-real-ip': '9.9.9.9' })).status).toBe(201);
    const [[args]] = db.ops('rpc:add_reaction', 'rpc');
    expect(args).toMatchObject({ p_ip: '9.9.9.9', p_reactor_name: 'anon', p_owner_key_hash: null });
  });

  it.each([[null], [{}], [{ emoji: '' }], [{ emoji: 'ab' }], [{ emoji: '🙂🙂' }], [{ emoji: 'a' }]])('rejects body %j', async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(db.calls).toEqual([]);
  });

  it.each([
    ['rate_limited', 429, 'Too many reactions. Please wait a moment.'],
    ['cap_reached', 409, 'Reaction cap reached'],
    ['not_found', 404, 'Image not found'],
    ['weird', 500, 'Could not add reaction'],
  ])('maps add_reaction status %s to %i', async (status, code, error) => {
    script('reactions', { data: [] });
    script('rpc:add_reaction', { data: { status } });
    expect(await json(await post({ emoji: '🙂' }))).toEqual([code, { error }]);
  });

  it('fails cleanly when the database errors', async () => {
    script('reactions', { data: [] });
    script('rpc:add_reaction', { error: DB_DOWN });
    expect((await post({ emoji: '🙂' })).status).toBe(500);
  });

  it('lets the reactor delete their own reaction, and nobody else', async () => {
    const del = (headers: Record<string, string>) => reaction.DELETE(req('/', { method: 'DELETE', headers }), ctx());
    script('reactions', { data: { owner_key_hash: hashReactorKey(KEY) } }, {}, { data: { owner_key_hash: hashReactorKey(KEY) } }, { data: { owner_key_hash: null } });
    expect((await del({ 'X-Reactor-Key': KEY })).status).toBe(204);
    expect((await del({ 'X-Reactor-Key': 'z'.repeat(20) })).status).toBe(403);
    expect((await del({ 'X-Reactor-Key': KEY })).status).toBe(403);
    expect((await del({})).status).toBe(403);
    expect(db.ops('reactions', 'delete')).toHaveLength(1);
  });

  it('lets the admin delete any reaction without a key', async () => {
    asAdmin();
    expect((await reaction.DELETE(req('/', { method: 'DELETE', admin: true }), ctx())).status).toBe(204);
    expect(db.ops('reactions', 'select')).toEqual([]);
    expect(db.ops('reactions', 'delete')).toHaveLength(1);
  });
});

describe('request logging', () => {
  it('logs one line per request and hides unexpected throws behind a 500', async () => {
    asAdmin();
    const res = await pins.POST(new NextRequest('http://localhost/api/pins', { method: 'POST', headers: { Authorization: 'Bearer good-token', 'x-vercel-id': 'req-1' }, body: 'not json' }), undefined);
    expect(await json(res)).toEqual([500, { error: 'Internal server error' }]);
    const lines = vi.mocked(console.error).mock.calls.map(([l]) => JSON.parse(l as string));
    expect(lines.map((l) => [l.event, l.requestId])).toEqual([['api.unhandled_error', 'req-1'], ['api.request', 'req-1']]);
    expect(lines[1]).toMatchObject({ method: 'POST', path: '/api/pins', status: 500 });
  });
});
