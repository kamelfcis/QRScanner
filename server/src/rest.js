import { getMeta, withRole } from './db.js';

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
const EMBED_MODIFIER_RE = /^([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\.(order|limit)$/;
const OPS = ['not.ilike', 'not.like', 'not.in', 'not.is', 'not.eq', 'not.neq', 'not.gt', 'not.gte', 'not.lt', 'not.lte', 'ilike', 'like', 'in', 'is', 'neq', 'gte', 'lte', 'gt', 'lt', 'eq'];

function embedModifierKey(key) {
  const match = EMBED_MODIFIER_RE.exec(key);
  if (!match) return null;
  return { resource: match[1], kind: match[2] };
}

function ident(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name || '')) {
    throw Object.assign(new Error(`Invalid identifier ${name}`), { status: 400, code: 'PGRST100' });
  }
  return name;
}

function splitTop(input, sep = ',') {
  const parts = [];
  let buf = '';
  let depth = 0;
  let quote = null;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quote) {
      buf += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      buf += char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === sep && depth === 0) {
      if (buf.trim()) parts.push(buf.trim());
      buf = '';
      continue;
    }
    buf += char;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function parseSelect(select) {
  if (!select || select.trim() === '*') return { columns: ['*'], embeds: [] };
  const columns = [];
  const embeds = [];
  for (const part of splitTop(select)) {
    const paren = part.indexOf('(');
    if (paren === -1) {
      if (part.trim() === '*') {
        columns.push('*');
        continue;
      }
      columns.push(ident(part));
      continue;
    }
    const head = part.slice(0, paren).trim();
    const inner = part.slice(paren + 1, part.lastIndexOf(')')).trim();
    let left = head;
    let hint = null;
    const bang = left.indexOf('!');
    if (bang !== -1) {
      hint = left.slice(bang + 1);
      left = left.slice(0, bang);
    }
    let alias = left;
    let table = left;
    const colon = left.indexOf(':');
    if (colon !== -1) {
      alias = left.slice(0, colon);
      table = left.slice(colon + 1);
    }
    ident(alias);
    ident(table);
    if (hint) ident(hint);
    embeds.push({ alias, table, hint, ...parseSelect(inner) });
  }
  return { columns, embeds };
}

function parseOperator(raw) {
  let negate = false;
  let rest = raw;
  if (rest.startsWith('not.')) {
    negate = true;
    rest = rest.slice(4);
  }
  const op = OPS.find((item) => item === rest || rest.startsWith(`${item}.`) || rest === item);
  const known = ['ilike', 'like', 'in', 'is', 'neq', 'gte', 'lte', 'gt', 'lt', 'eq'].find(
    (item) => rest === item || rest.startsWith(`${item}.`)
  );
  if (!known) {
    throw Object.assign(new Error(`Unsupported operator in ${raw}`), { status: 400, code: 'PGRST100' });
  }
  const value = rest.slice(known.length + 1);
  return { op: known, value, negate };
}

function castScalar(value) {
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function parseInList(raw) {
  let text = raw.trim();
  if (text.startsWith('(') && text.endsWith(')')) text = text.slice(1, -1);
  if (!text) return [];
  return splitTop(text).map((item) => {
    let value = item.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return castScalar(value);
  });
}

function parseCondition(column, raw) {
  ident(column);
  return { type: 'cond', column, ...parseOperator(raw) };
}

function parseLogic(kind, raw) {
  let text = raw.trim();
  if (text.startsWith('(') && text.endsWith(')')) text = text.slice(1, -1);
  const items = splitTop(text).map((piece) => {
    const dot = piece.indexOf('.');
    if (dot < 1) {
      throw Object.assign(new Error(`Bad ${kind} filter`), { status: 400, code: 'PGRST100' });
    }
    const column = piece.slice(0, dot);
    return parseCondition(column, piece.slice(dot + 1));
  });
  return { type: kind, items };
}

function parseFilters(query) {
  const filters = [];
  for (const [key, raw] of Object.entries(query)) {
    const values = Array.isArray(raw) ? raw : [raw];
    if (key === 'or' || key === 'and') {
      for (const value of values) filters.push(parseLogic(key, String(value)));
      continue;
    }
    if (RESERVED.has(key) || embedModifierKey(key)) continue;
    for (const value of values) filters.push(parseCondition(key, String(value)));
  }
  return filters;
}

function conditionSql(cond, params) {
  const column = `"${ident(cond.column)}"`;
  if (cond.op === 'is') {
    const sql =
      cond.value === 'null' ? `${column} IS NULL` : cond.value === 'true' ? `${column} IS TRUE` : `${column} IS FALSE`;
    return cond.negate ? `NOT (${sql})` : sql;
  }
  if (cond.op === 'in') {
    const items = parseInList(cond.value);
    if (!items.length) return cond.negate ? 'TRUE' : 'FALSE';
    const placeholders = items.map((item) => {
      params.push(item);
      return `$${params.length}`;
    });
    const sql = `${column} IN (${placeholders.join(', ')})`;
    return cond.negate ? `NOT (${sql})` : sql;
  }
  if (cond.op === 'ilike' || cond.op === 'like') {
    params.push(cond.value);
    const op = cond.op === 'ilike' ? 'ILIKE' : 'LIKE';
    const sql = `${column} ${op} $${params.length}`;
    return cond.negate ? `NOT (${sql})` : sql;
  }
  const map = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };
  params.push(castScalar(cond.value));
  const sql = `${column} ${map[cond.op]} $${params.length}`;
  return cond.negate ? `NOT (${sql})` : sql;
}

function filtersSql(filters, params) {
  if (!filters.length) return '';
  const parts = filters.map((filter) => {
    if (filter.type === 'or' || filter.type === 'and') {
      const joiner = filter.type === 'or' ? ' OR ' : ' AND ';
      const inner = filter.items.map((item) => conditionSql(item, params)).join(joiner);
      return `(${inner})`;
    }
    return conditionSql(filter, params);
  });
  return `WHERE ${parts.join(' AND ')}`;
}

function orderSql(order) {
  if (!order) return '';
  const bits = splitTop(String(order)).map((part) => {
    const [column, direction, nulls] = part.split('.');
    ident(column);
    const dir = String(direction || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const nullSql =
      nulls === 'nullsfirst' ? ' NULLS FIRST' : nulls === 'nullslast' ? ' NULLS LAST' : '';
    return `"${column}" ${dir}${nullSql}`;
  });
  return `ORDER BY ${bits.join(', ')}`;
}

function parseEmbedModifiers(query) {
  const modifiers = [];
  for (const [key, raw] of Object.entries(query)) {
    const parsed = embedModifierKey(key);
    if (!parsed || parsed.kind !== 'order') continue;
    const values = Array.isArray(raw) ? raw : [raw];
    modifiers.push({
      resource: parsed.resource,
      value: values.map((item) => String(item)).join(','),
    });
  }
  return modifiers;
}

function resourceMatchesEmbed(resource, embed) {
  if (resource === embed.alias || resource === embed.table) return true;
  const tail = resource.split('.').pop();
  return tail === embed.alias || tail === embed.table;
}

function embedOrderValue(embed, modifiers) {
  let matched = null;
  let rank = 0;
  for (const item of modifiers) {
    let next = 0;
    if (item.resource === embed.alias) next = 3;
    else if (item.resource === embed.table) next = 2;
    else if (resourceMatchesEmbed(item.resource, embed)) next = 1;
    if (next > rank) {
      rank = next;
      matched = item.value;
    }
  }
  return matched;
}

function childOrderSql(table, embed, modifiers, meta) {
  const explicit = embedOrderValue(embed, modifiers);
  if (explicit) {
    const clause = orderSql(explicit);
    if (clause) {
      if (meta.tables.get(table)?.has('id')) return `${clause}, "id" ASC`;
      return clause;
    }
  }
  if (meta.tables.get(table)?.has('id')) return 'ORDER BY "id" ASC';
  return 'ORDER BY ctid';
}

function resolveFk(fks, parent, child, hint) {
  const many = fks.filter(
    (fk) => fk.from_table === child && fk.to_table === parent && (!hint || fk.from_col === hint)
  );
  if (many[0]) {
    return { direction: 'many', parentKey: many[0].to_col, childKey: many[0].from_col };
  }
  const one = fks.filter(
    (fk) => fk.from_table === parent && fk.to_table === child && (!hint || fk.from_col === hint)
  );
  if (one[0]) {
    return { direction: 'one', parentFk: one[0].from_col, childKey: one[0].to_col };
  }
  return null;
}

function projectRow(row, select) {
  if (select.columns.includes('*')) {
    const copy = { ...row };
    for (const embed of select.embeds) copy[embed.alias] = row[embed.alias];
    return copy;
  }
  const copy = {};
  for (const column of select.columns) {
    if (column in row) copy[column] = row[column];
  }
  for (const embed of select.embeds) copy[embed.alias] = row[embed.alias];
  return copy;
}

function stripNulls(value) {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== null) out[key] = stripNulls(item);
    }
    return out;
  }
  return value;
}

async function queryIn(client, table, column, ids, select, meta, modifiers = []) {
  ident(table);
  ident(column);
  if (!ids.length) return [];
  const params = [];
  const placeholders = ids.map((id) => {
    params.push(id);
    return `$${params.length}`;
  });
  const order = childOrderSql(table, select, modifiers, meta);
  const { rows } = await client.query(
    `SELECT * FROM public."${table}" WHERE "${column}" IN (${placeholders.join(', ')}) ${order}`,
    params
  );
  await attachEmbeds(client, table, rows, select.embeds, meta, modifiers);
  return rows;
}

async function attachEmbeds(client, parentTable, rows, embeds, meta, modifiers = []) {
  if (!rows.length || !embeds.length) return;
  for (const embed of embeds) {
    const fk = resolveFk(meta.fks, parentTable, embed.table, embed.hint);
    if (!fk) {
      for (const row of rows) row[embed.alias] = [];
      continue;
    }
    if (fk.direction === 'many') {
      const ids = [...new Set(rows.map((row) => row[fk.parentKey]).filter((id) => id != null))];
      const children = await queryIn(client, embed.table, fk.childKey, ids, embed, meta, modifiers);
      const grouped = new Map();
      for (const child of children) {
        const key = String(child[fk.childKey]);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(projectRow(child, embed));
      }
      for (const row of rows) {
        row[embed.alias] = grouped.get(String(row[fk.parentKey])) || [];
      }
    } else {
      const ids = [...new Set(rows.map((row) => row[fk.parentFk]).filter((id) => id != null))];
      const children = await queryIn(client, embed.table, fk.childKey, ids, embed, meta, modifiers);
      const byId = new Map(children.map((child) => [String(child[fk.childKey]), projectRow(child, embed)]));
      for (const row of rows) {
        row[embed.alias] = row[fk.parentFk] == null ? null : byId.get(String(row[fk.parentFk])) || null;
      }
    }
  }
}

async function fetchRows(client, table, query, meta) {
  if (!meta.tables.has(table)) {
    throw Object.assign(new Error(`Could not find the table 'public.${table}' in the schema cache`), {
      status: 404,
      code: 'PGRST205',
    });
  }
  ident(table);
  const select = parseSelect(query.select ? String(query.select) : '*');
  const modifiers = parseEmbedModifiers(query);
  const params = [];
  const where = filtersSql(parseFilters(query), params);
  const order = orderSql(query.order);
  const limit = query.limit != null ? Math.min(Math.max(Number(query.limit) || 0, 0), 100000) : null;
  const offset = query.offset != null ? Math.max(Number(query.offset) || 0, 0) : 0;
  const limitSql = limit != null ? `LIMIT ${limit}` : '';
  const offsetSql = offset ? `OFFSET ${offset}` : '';
  const { rows } = await client.query(
    `SELECT * FROM public."${table}" ${where} ${order} ${limitSql} ${offsetSql}`,
    params
  );
  await attachEmbeds(client, table, rows, select.embeds, meta, modifiers);
  const countParams = [];
  const countWhere = filtersSql(parseFilters(query), countParams);
  const countResult = await client.query(
    `SELECT count(*)::int AS count FROM public."${table}" ${countWhere}`,
    countParams
  );
  return {
    rows: rows.map((row) => projectRow(row, select)),
    count: countResult.rows[0].count,
    offset,
  };
}

function preferOf(request) {
  const map = {};
  for (const part of String(request.headers.prefer || '').split(',')) {
    const [key, value] = part.trim().split('=');
    if (key) map[key.trim()] = (value || '').trim();
  }
  return map;
}

function wantsObject(request) {
  return String(request.headers.accept || '').includes('application/vnd.pgrst.object+json');
}

function shape(request, value) {
  if (String(request.headers.accept || '').includes('nulls=stripped')) return stripNulls(value);
  return value;
}

function contentRange(offset, length, count) {
  if (!count) return '*/0';
  if (!length) return `*/${count}`;
  const start = offset;
  const end = offset + length - 1;
  return `${start}-${end}/${count}`;
}

function pgError(error) {
  if (error.status) return error;
  if (error.code === '42P01') {
    return Object.assign(new Error(error.message), { status: 404, code: 'PGRST205' });
  }
  if (error.code === '42501') {
    return Object.assign(new Error('permission denied'), { status: 401, code: '42501' });
  }
  return Object.assign(new Error(error.message || 'database error'), {
    status: 400,
    code: error.code || 'PGRST000',
  });
}

function columnType(meta, table, column) {
  return meta.tables.get(table)?.get(column);
}

function sqlValue(meta, table, column, value) {
  const info = columnType(meta, table, column);
  if (!info) {
    throw Object.assign(new Error(`Could not find the '${column}' column of '${table}'`), {
      status: 400,
      code: 'PGRST204',
    });
  }
  if (value === undefined) return undefined;
  if (info.udt_name === 'jsonb' || info.udt_name === 'json') {
    return { text: '::jsonb', value: value == null ? null : JSON.stringify(value) };
  }
  return { text: '', value };
}

async function writeRows(client, table, request, meta) {
  if (!meta.tables.has(table)) {
    throw Object.assign(new Error(`Could not find the table 'public.${table}' in the schema cache`), {
      status: 404,
      code: 'PGRST205',
    });
  }
  const method = request.method;
  const prefer = preferOf(request);
  const body = request.body;
  if (method === 'POST') {
    const rows = Array.isArray(body) ? body : [body];
    if (!rows.length || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw Object.assign(new Error('Expected object or array'), { status: 400, code: 'PGRST102' });
    }
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].map(ident);
    const params = [];
    const valuesSql = rows
      .map((row) => {
        const placeholders = columns.map((column) => {
          const prepared = sqlValue(meta, table, column, row[column] === undefined ? null : row[column]);
          params.push(prepared.value);
          return `$${params.length}${prepared.text}`;
        });
        return `(${placeholders.join(', ')})`;
      })
      .join(', ');
    const quoted = columns.map((column) => `"${column}"`).join(', ');
    let conflict = '';
    if (prefer.resolution === 'merge-duplicates' || prefer.resolution === 'ignore-duplicates') {
      const target = String(request.query.on_conflict || '')
        .split(',')
        .map((column) => `"${ident(column.trim())}"`)
        .join(', ');
      if (!target) {
        throw Object.assign(new Error('on_conflict is required'), { status: 400, code: 'PGRST100' });
      }
      if (prefer.resolution === 'ignore-duplicates') {
        conflict = ` ON CONFLICT (${target}) DO NOTHING`;
      } else {
        const updates = columns
          .filter((column) => !String(request.query.on_conflict || '').split(',').includes(column))
          .map((column) => `"${column}" = EXCLUDED."${column}"`);
        conflict = updates.length
          ? ` ON CONFLICT (${target}) DO UPDATE SET ${updates.join(', ')}`
          : ` ON CONFLICT (${target}) DO NOTHING`;
      }
    }
    const returning = prefer.return === 'minimal' ? '' : ' RETURNING *';
    const result = await client.query(
      `INSERT INTO public."${table}" (${quoted}) VALUES ${valuesSql}${conflict}${returning}`,
      params
    );
    return result.rows;
  }

  const filters = parseFilters(request.query);
  if (!filters.length) {
    throw Object.assign(new Error('Missing filters'), { status: 400, code: 'PGRST100' });
  }
  const params = [];
  if (method === 'PATCH') {
    const entries = Object.entries(body || {}).filter(([, value]) => value !== undefined);
    if (!entries.length) {
      throw Object.assign(new Error('Empty update'), { status: 400, code: 'PGRST102' });
    }
    const sets = entries.map(([column, value]) => {
      ident(column);
      const prepared = sqlValue(meta, table, column, value);
      params.push(prepared.value);
      return `"${column}" = $${params.length}${prepared.text}`;
    });
    const where = filtersSql(filters, params);
    const returning = prefer.return === 'minimal' ? '' : ' RETURNING *';
    const result = await client.query(
      `UPDATE public."${table}" SET ${sets.join(', ')} ${where}${returning}`,
      params
    );
    return result.rows;
  }
  const where = filtersSql(filters, params);
  const returning = prefer.return === 'minimal' ? '' : ' RETURNING *';
  const result = await client.query(`DELETE FROM public."${table}" ${where}${returning}`, params);
  return result.rows;
}

const RPCS = {
  track_analytics_event: {
    args: ['p_event_type', 'p_event_data', 'p_user_agent', 'p_device_type'],
    sql: `SELECT public.track_analytics_event($1, $2::jsonb, $3, $4) AS data`,
    json: [1],
  },
  track_search_event: {
    args: ['p_search_term', 'p_results_count', 'p_category_id', 'p_user_agent'],
    sql: `SELECT public.track_search_event($1, $2, $3, $4) AS data`,
    json: [],
  },
};

export function registerRest(app, { resolveAuth }) {
  app.route({
    method: 'POST',
    url: '/rest/v1/rpc/:fn',
    handler: async (request, reply) => {
      const auth = resolveAuth(request);
      if (auth.invalid) return reply.code(401).send({ message: 'Invalid JWT', code: 'PGRST301' });
      const fn = request.params.fn;
      const spec = RPCS[fn];
      if (!spec) {
        return reply.code(404).send({
          code: 'PGRST202',
          message: `Could not find the function public.${fn} in the schema cache`,
          details: null,
          hint: null,
        });
      }
      try {
        const body = request.body || {};
        const params = spec.args.map((name, index) => {
          const value = body[name] === undefined ? null : body[name];
          return spec.json.includes(index) && value != null ? JSON.stringify(value) : value;
        });
        const result = await withRole(auth, (client) => client.query(spec.sql, params));
        return reply.send(shape(request, result.rows[0]?.data ?? null));
      } catch (error) {
        const wrapped = pgError(error);
        return reply.code(wrapped.status).send({
          code: wrapped.code,
          message: wrapped.message,
          details: null,
          hint: null,
        });
      }
    },
  });

  app.route({
    method: ['GET', 'HEAD'],
    url: '/rest/v1/:table',
    handler: async (request, reply) => {
      const auth = resolveAuth(request);
      if (auth.invalid) return reply.code(401).send({ message: 'Invalid JWT', code: 'PGRST301' });
      const meta = await getMeta();
      try {
        const { rows, count, offset } = await withRole(auth, (client) =>
          fetchRows(client, request.params.table, request.query, meta)
        );
        reply.header('content-range', contentRange(offset, rows.length, count));
        if (request.method === 'HEAD') return reply.code(200).send();
        if (wantsObject(request)) {
          if (rows.length !== 1) {
            return reply.code(406).send({
              code: 'PGRST116',
              details: `Results contain ${rows.length} rows, application/vnd.pgrst.object+json requires 1 row`,
              hint: null,
              message: 'JSON object requested, multiple (or no) rows returned',
            });
          }
          return reply.send(shape(request, rows[0]));
        }
        return reply.send(shape(request, rows));
      } catch (error) {
        const wrapped = pgError(error);
        return reply.code(wrapped.status).send({
          code: wrapped.code,
          message: wrapped.message,
          details: null,
          hint: null,
        });
      }
    },
  });

  app.route({
    method: ['POST', 'PATCH', 'DELETE'],
    url: '/rest/v1/:table',
    handler: async (request, reply) => {
      const auth = resolveAuth(request);
      if (auth.invalid) return reply.code(401).send({ message: 'Invalid JWT', code: 'PGRST301' });
      if (auth.role === 'anon' && !(request.method === 'POST' && ['analytics', 'search_analytics'].includes(request.params.table) && preferOf(request).resolution == null)) {
        const allowedInsert =
          request.method === 'POST' &&
          (request.params.table === 'analytics' || request.params.table === 'search_analytics') &&
          !preferOf(request).resolution;
        if (!allowedInsert) {
          return reply.code(401).send({ message: 'permission denied', code: '42501' });
        }
      }
      const meta = await getMeta();
      try {
        const rows = await withRole(auth, (client) =>
          writeRows(client, request.params.table, request, meta)
        );
        const prefer = preferOf(request);
        if (prefer.return === 'minimal') return reply.code(request.method === 'POST' ? 201 : 204).send();
        if (wantsObject(request)) {
          if (rows.length !== 1) {
            return reply.code(406).send({
              code: 'PGRST116',
              details: `Results contain ${rows.length} rows, application/vnd.pgrst.object+json requires 1 row`,
              hint: null,
              message: 'JSON object requested, multiple (or no) rows returned',
            });
          }
          return reply.code(request.method === 'POST' ? 201 : 200).send(shape(request, rows[0]));
        }
        return reply.code(request.method === 'POST' ? 201 : 200).send(shape(request, rows));
      } catch (error) {
        const wrapped = pgError(error);
        return reply.code(wrapped.status).send({
          code: wrapped.code,
          message: wrapped.message,
          details: null,
          hint: null,
        });
      }
    },
  });
}
