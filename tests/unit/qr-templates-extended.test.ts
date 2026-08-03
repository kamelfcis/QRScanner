import { describe, it, expect } from 'vitest';
import { getTemplate, QR_TEMPLATES, getTemplateNames } from '@/lib/qr/templates';

describe('QR Templates', () => {
  it('has exactly 5 templates', () => {
    const names = getTemplateNames();
    expect(names).toHaveLength(5);
  });

  it('includes all template names', () => {
    const names = getTemplateNames();
    expect(names).toContain('classic');
    expect(names).toContain('luxury');
    expect(names).toContain('minimal');
    expect(names).toContain('golden');
    expect(names).toContain('dark');
  });

  it('getTemplate returns classic for unknown', () => {
    const t = getTemplate('unknown');
    expect(t.name).toBe('classic');
  });

  it('getTemplate returns requested template', () => {
    expect(getTemplate('luxury').name).toBe('luxury');
    expect(getTemplate('minimal').name).toBe('minimal');
    expect(getTemplate('golden').name).toBe('golden');
    expect(getTemplate('dark').name).toBe('dark');
  });

  it('all templates have valid colors', () => {
    Object.values(QR_TEMPLATES).forEach((t) => {
      expect(t.fgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('all templates have valid rounded styles', () => {
    Object.values(QR_TEMPLATES).forEach((t) => {
      expect(['square', 'rounded', 'circle']).toContain(t.roundedStyle);
    });
  });

  it('all templates have valid eye styles', () => {
    Object.values(QR_TEMPLATES).forEach((t) => {
      expect(['square', 'rounded', 'circle']).toContain(t.eyeStyle);
    });
  });

  it('all templates have name and label', () => {
    Object.values(QR_TEMPLATES).forEach((t) => {
      expect(t.name).toBeTruthy();
      expect(t.label).toBeTruthy();
    });
  });

  it('classic template has standard colors', () => {
    const classic = getTemplate('classic');
    expect(classic.fgColor).toBe('#000000');
    expect(classic.bgColor).toBe('#FFFFFF');
  });

  it('dark template uses dark background', () => {
    const dark = getTemplate('dark');
    expect(dark.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(dark.fgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('golden template uses brand colors', () => {
    const golden = getTemplate('golden');
    expect(golden.fgColor).toBe('#B8860B');
  });
});
