import { describe, it, expect } from 'vitest';
import { QR_TEMPLATES, getTemplate, getTemplateNames } from '@/lib/qr/templates';

describe('QR Templates', () => {
  it('has 5 templates', () => {
    const names = getTemplateNames();
    expect(names).toHaveLength(5);
  });

  it('includes classic template', () => {
    expect(QR_TEMPLATES.classic).toBeDefined();
    expect(QR_TEMPLATES.classic.label).toBe('Classic');
  });

  it('includes luxury template', () => {
    expect(QR_TEMPLATES.luxury).toBeDefined();
    expect(QR_TEMPLATES.luxury.label).toBe('Luxury');
  });

  it('includes minimal template', () => {
    expect(QR_TEMPLATES.minimal).toBeDefined();
    expect(QR_TEMPLATES.minimal.label).toBe('Minimal');
  });

  it('includes golden template', () => {
    expect(QR_TEMPLATES.golden).toBeDefined();
    expect(QR_TEMPLATES.golden.label).toBe('Golden');
  });

  it('includes dark template', () => {
    expect(QR_TEMPLATES.dark).toBeDefined();
    expect(QR_TEMPLATES.dark.label).toBe('Dark');
  });

  it('getTemplate returns classic for unknown name', () => {
    const tmpl = getTemplate('nonexistent');
    expect(tmpl.name).toBe('classic');
  });

  it('getTemplate returns requested template', () => {
    const tmpl = getTemplate('luxury');
    expect(tmpl.name).toBe('luxury');
    expect(tmpl.label).toBe('Luxury');
  });

  it('all templates have valid colors', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const tmpl of Object.values(QR_TEMPLATES)) {
      expect(tmpl.primaryColor).toMatch(hexRegex);
      expect(tmpl.secondaryColor).toMatch(hexRegex);
      expect(tmpl.bgColor).toMatch(hexRegex);
      expect(tmpl.fgColor).toMatch(hexRegex);
    }
  });

  it('all templates have valid rounded styles', () => {
    const validStyles = ['square', 'rounded', 'circle'];
    for (const tmpl of Object.values(QR_TEMPLATES)) {
      expect(validStyles).toContain(tmpl.roundedStyle);
      expect(validStyles).toContain(tmpl.eyeStyle);
    }
  });

  it('all templates have name and label', () => {
    for (const tmpl of Object.values(QR_TEMPLATES)) {
      expect(tmpl.name).toBeTruthy();
      expect(tmpl.label).toBeTruthy();
    }
  });
});
