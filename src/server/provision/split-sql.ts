/**
 * Split a migration script into statements the Supabase Management API can run.
 * That endpoint sends one Postgres simple/extended query. Multiple statements in
 * a single body fail with 08P01 invalid message format.
 * Semicolons inside quotes, comments, and dollar-quoted function bodies stay put.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;

  while (i < sql.length) {
    const char = sql[i]!;
    const next = sql[i + 1];

    if (inLineComment) {
      current += char;
      if (char === '\n') inLineComment = false;
      i += 1;
      continue;
    }

    if (inBlockComment) {
      current += char;
      if (char === '*' && next === '/') {
        current += next;
        i += 2;
        inBlockComment = false;
        continue;
      }
      i += 1;
      continue;
    }

    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      current += char;
      i += 1;
      continue;
    }

    if (inSingle) {
      current += char;
      if (char === "'" && next === "'") {
        current += next;
        i += 2;
        continue;
      }
      if (char === "'") inSingle = false;
      i += 1;
      continue;
    }

    if (inDouble) {
      current += char;
      if (char === '"' && next === '"') {
        current += next;
        i += 2;
        continue;
      }
      if (char === '"') inDouble = false;
      i += 1;
      continue;
    }

    if (char === '-' && next === '-') {
      current += char + next;
      i += 2;
      inLineComment = true;
      continue;
    }

    if (char === '/' && next === '*') {
      current += char + next;
      i += 2;
      inBlockComment = true;
      continue;
    }

    if (char === "'") {
      inSingle = true;
      current += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inDouble = true;
      current += char;
      i += 1;
      continue;
    }

    if (char === '$') {
      const match = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (char === ';') {
      pushStatement(statements, current);
      current = '';
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  pushStatement(statements, current);
  return statements;
}

function pushStatement(statements: string[], raw: string) {
  const statement = raw.trim();
  if (!statement || isCommentOnly(statement)) return;
  statements.push(statement);
}

function isCommentOnly(statement: string): boolean {
  const withoutBlock = statement.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLine = withoutBlock
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
  return withoutLine.length === 0;
}
