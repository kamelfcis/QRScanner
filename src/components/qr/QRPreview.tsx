'use client';

import { useRef, useCallback, useState } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { getTemplate, type QRTemplate } from '@/lib/qr/templates';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
import {
  downloadQRAsPNG,
  downloadQRAsSVG,
  downloadQRAsPDF,
  downloadQRPrint,
} from '@/lib/qr/download';

interface QRPreviewProps {
  url: string;
  template?: string;
  primaryColor?: string;
  secondaryColor?: string;
  bgColor?: string;
  fgColor?: string;
  size?: number;
  roundedStyle?: 'square' | 'rounded' | 'circle';
  eyeStyle?: 'square' | 'rounded' | 'circle';
  margin?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  logoUrl?: string;
  filename?: string;
  showDownload?: boolean;
  showTemplateLabel?: boolean;
  className?: string;
}

export function QRPreview({
  url,
  template = 'classic',
  primaryColor,
  secondaryColor,
  bgColor,
  fgColor,
  size = 300,
  roundedStyle,
  eyeStyle,
  margin = 4,
  errorCorrection = 'M',
  logoUrl,
  filename = 'qr-code',
  showDownload = false,
  showTemplateLabel = false,
  className = '',
}: QRPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tmpl = getTemplate(template);

  const resolvedFgColor = fgColor || tmpl.fgColor;
  const resolvedBgColor = bgColor || tmpl.bgColor;
  const resolvedRounded = roundedStyle || tmpl.roundedStyle;
  const resolvedEye = eyeStyle || tmpl.eyeStyle;

  const valueStyle =
    resolvedRounded === 'circle'
      ? { rx: size / 2, ry: size / 2 }
      : resolvedRounded === 'rounded'
        ? { rx: size * 0.1, ry: size * 0.1 }
        : {};

  const handleDownloadPNG = useCallback(async () => {
    if (!showCanvas) {
      setShowCanvas(true);
      await new Promise((r) => setTimeout(r, 100));
    }
    await downloadQRAsPNG(null, canvasRef.current, filename, size);
  }, [filename, size, showCanvas]);

  const handleDownloadSVG = useCallback(() => {
    downloadQRAsSVG(svgRef.current, filename);
  }, [filename]);

  const handleDownloadPDF = useCallback(async () => {
    if (!showCanvas) {
      setShowCanvas(true);
      await new Promise((r) => setTimeout(r, 100));
    }
    await downloadQRAsPDF(null, canvasRef.current, filename, size);
  }, [filename, size, showCanvas]);

  const handlePrint = useCallback(async () => {
    if (!showCanvas) {
      setShowCanvas(true);
      await new Promise((r) => setTimeout(r, 100));
    }
    await downloadQRPrint(null, canvasRef.current, filename, size);
  }, [filename, size, showCanvas]);

  const qrProps = {
    value: url,
    size: size - margin * 2,
    bgColor: resolvedBgColor,
    fgColor: resolvedFgColor,
    level: errorCorrection,
    imageSettings: logoUrl
      ? {
          src: logoUrl,
          x: undefined,
          y: undefined,
          height: Math.floor(size * 0.2),
          width: Math.floor(size * 0.2),
          excavate: true,
        }
      : undefined,
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {showTemplateLabel && (
        <span className="text-sm font-medium text-muted-foreground">{tmpl.label}</span>
      )}

      <div className="relative rounded-lg border bg-white p-4 shadow-sm">
        <QRCodeSVG
          ref={svgRef}
          {...qrProps}
          style={{ display: showCanvas ? 'none' : 'block' }}
        />
        {showCanvas && (
          <QRCodeCanvas
            ref={canvasRef}
            {...qrProps}
            style={{ display: 'block' }}
          />
        )}
      </div>

      {showDownload && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPNG}>
            <Download className="mr-1 h-4 w-4" />
            PNG
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadSVG}>
            <Download className="mr-1 h-4 w-4" />
            SVG
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="mr-1 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Eye className="mr-1 h-4 w-4" />
            Print
          </Button>
        </div>
      )}
    </div>
  );
}
