import { describe, expect, it } from 'vitest';
import { CUSTOMER_MIGRATIONS } from '@/server/provision/migrations-data';
import { splitSqlStatements } from '@/server/provision/split-sql';

describe('splitSqlStatements', () => {
  it('does not send a multi-statement migration as one Management API query', () => {
    const initial = CUSTOMER_MIGRATIONS.find((file) => file.name === '001_initial_schema.sql');
    expect(initial).toBeTruthy();
    const statements = splitSqlStatements(initial!.sql);

    expect(statements.length).toBeGreaterThan(1);
    expect(statements[0]).toMatch(/CREATE EXTENSION/);
    expect(
      statements.some((statement) => statement.includes('CREATE TABLE public.categories'))
    ).toBe(true);

    const fn = statements.find((statement) => statement.includes('update_updated_at_column'));
    expect(fn).toBeTruthy();
    expect(fn).toContain('RETURN NEW;');
    expect(fn).toContain('$$ LANGUAGE plpgsql');
    expect(splitSqlStatements(`${fn};`)).toEqual([fn]);
  });

  it('keeps semicolons inside strings, comments, and dollar quotes', () => {
    const sql = `
      -- comment; not a split
      INSERT INTO public.settings (key, value) VALUES ('note', 'a;b');
      CREATE FUNCTION public.demo() RETURNS void AS $$
      BEGIN
        PERFORM 1;
      END;
      $$ LANGUAGE plpgsql;
      /* block; comment */
      SELECT 1;
    `;
    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(3);
    expect(statements[0]).toContain("'a;b'");
    expect(statements[1]).toContain('PERFORM 1;');
    expect(statements[2]).toContain('SELECT 1');
    expect(statements[2]).toContain('block; comment');
  });

  it('splits every customer migration into single statements', () => {
    for (const file of CUSTOMER_MIGRATIONS) {
      const statements = splitSqlStatements(file.sql);
      expect(statements.length, file.name).toBeGreaterThan(0);
      for (const statement of statements) {
        expect(splitSqlStatements(`${statement};`), file.name).toEqual([statement]);
      }
    }
  });
});
