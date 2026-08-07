'use client';

import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
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
import {
  createLogoOverlayDataUrl,
  DEFAULT_QR_DOWNLOAD_SIZE,
  getLogoImageSettings,
  getLogoPixelSize,
} from '@/lib/qr/logo-overlay';
import { useTranslations } from '@/components/providers/RootI18nProvider';

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
  downloadSize?: number;
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
  downloadSize = DEFAULT_QR_DOWNLOAD_SIZE,
  className = '',
}: QRPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [logoOverlaySrc, setLogoOverlaySrc] = useState<string | undefined>();
  const t = useTranslations('qr');

  const tmpl = getTemplate(template);

  const resolvedFgColor = fgColor || tmpl.fgColor;
  const resolvedBgColor = bgColor || tmpl.bgColor;

  const effectiveLevel = logoUrl ? 'H' : errorCorrection;

  useEffect(() => {
    if (!logoUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear overlay when logo removed
      setLogoOverlaySrc(undefined);
      return;
    }

    let cancelled = false;
    const overlaySize = getLogoPixelSize(size);

    createLogoOverlayDataUrl(logoUrl, overlaySize)
      .then((dataUrl) => {
        if (!cancelled) setLogoOverlaySrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setLogoOverlaySrc(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [logoUrl, size]);

  const [downloadLogoOverlaySrc, setDownloadLogoOverlaySrc] = useState<string | undefined>();

  useEffect(() => {
    if (!logoUrl || !showDownload) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear download overlay
      setDownloadLogoOverlaySrc(undefined);
      return;
    }

    let cancelled = false;
    const overlaySize = getLogoPixelSize(downloadSize);

    createLogoOverlayDataUrl(logoUrl, overlaySize)
      .then((dataUrl) => {
        if (!cancelled) setDownloadLogoOverlaySrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setDownloadLogoOverlaySrc(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [logoUrl, downloadSize, showDownload]);

  const previewImageSettings = useMemo(
    () => (logoOverlaySrc ? getLogoImageSettings(logoOverlaySrc, size) : undefined),
    [logoOverlaySrc, size]
  );

  const downloadImageSettings = useMemo(
    () =>
      downloadLogoOverlaySrc
        ? getLogoImageSettings(downloadLogoOverlaySrc, downloadSize)
        : undefined,
    [downloadLogoOverlaySrc, downloadSize]
  );

  const previewQrProps = {
    value: url,
    size,
    marginSize: margin,
    bgColor: resolvedBgColor,
    fgColor: resolvedFgColor,
    level: effectiveLevel,
    imageSettings: previewImageSettings,
  };

  const downloadQrProps = {
    value: url,
    size: downloadSize,
    marginSize: margin,
    bgColor: resolvedBgColor,
    fgColor: resolvedFgColor,
    level: effectiveLevel,
    imageSettings: downloadImageSettings,
  };

  const ensureDownloadCanvas = useCallback(async () => {
    if (!showCanvas) {
      setShowCanvas(true);
      await new Promise((r) => setTimeout(r, 150));
    }
    if (showDownload && downloadCanvasRef.current) {
      await new Promise((r) => setTimeout(r, logoUrl ? 200 : 50));
      return downloadCanvasRef.current;
    }
    if (canvasRef.current) {
      return canvasRef.current;
    }
    throw new Error('No QR element found');
  }, [showCanvas, showDownload, logoUrl]);

  const handleDownloadPNG = useCallback(async () => {
    const canvas = await ensureDownloadCanvas();
    await downloadQRAsPNG(null, canvas, filename, size, downloadSize);
  }, [ensureDownloadCanvas, filename, size, downloadSize]);

  const handleDownloadSVG = useCallback(() => {
    downloadQRAsSVG(svgRef.current, filename);
  }, [filename]);

  const handleDownloadPDF = useCallback(async () => {
    const canvas = await ensureDownloadCanvas();
    await downloadQRAsPDF(null, canvas, filename, size, downloadSize);
  }, [ensureDownloadCanvas, filename, size, downloadSize]);

  const handlePrint = useCallback(async () => {
    const canvas = await ensureDownloadCanvas();
    await downloadQRPrint(null, canvas, filename, size, downloadSize);
  }, [ensureDownloadCanvas, filename, size, downloadSize]);

  return (
    <div className={`relative flex flex-col items-center gap-4 ${className}`}>
      {showTemplateLabel && (
        <span className="text-muted-foreground text-sm font-medium">{tmpl.label}</span>
      )}

      <div className="relative rounded-lg border bg-white p-4 shadow-sm">
        <QRCodeSVG
          ref={svgRef}
          {...previewQrProps}
          style={{ display: showCanvas ? 'none' : 'block' }}
        />
        {showCanvas && <QRCodeCanvas ref={canvasRef} {...previewQrProps} />}
      </div>

      {showDownload && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute left-[-9999px] top-0 overflow-hidden opacity-0"
          >
            <QRCodeCanvas ref={downloadCanvasRef} {...downloadQrProps} />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPNG}>
              <Download className="mr-1 h-4 w-4" />
              {t('downloadPNG')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadSVG}>
              <Download className="mr-1 h-4 w-4" />
              {t('downloadSVG')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="mr-1 h-4 w-4" />
              {t('downloadPDF')}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Eye className="mr-1 h-4 w-4" />
              {t('print')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
