"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";

const MIN_DOT = 2;
const MAX_DOT = 24;
const MIN_SPACING = 3;
const MAX_SPACING = 28;
const OUTPUT_PADDING_X = 24;

type ColorMode = "mono" | "color";

type HalftoneSettings = {
  dotSize: number;
  spacing: number;
  angle: number;
  brightness: number;
  contrast: number;
  saturation: number;
  invert: boolean;
  colorMode: ColorMode;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function revokeBlobUrl(url: string | null) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function drawHalftone(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  settings: HalftoneSettings,
  targetWidth: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const ratio = (img.naturalHeight || img.height || 1) / (img.naturalWidth || img.width || 1);
  const width = Math.max(1, Math.round(targetWidth));
  const height = Math.max(1, Math.round(width * ratio));
  canvas.width = width;
  canvas.height = height;

  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = width;
  sampleCanvas.height = height;
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) return;

  sampleCtx.imageSmoothingEnabled = true;
  sampleCtx.filter = [
    `brightness(${settings.brightness}%)`,
    `contrast(${settings.contrast}%)`,
    `saturate(${settings.saturation}%)`,
  ].join(" ");
  sampleCtx.drawImage(img, 0, 0, width, height);

  const data = sampleCtx.getImageData(0, 0, width, height).data;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  const angleRad = (settings.angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const halfW = width / 2;
  const halfH = height / 2;
  const maxRadius = Math.min(settings.dotSize, settings.spacing) / 2;

  for (let y = -halfH; y < halfH; y += settings.spacing) {
    for (let x = -halfW; x < halfW; x += settings.spacing) {
      const rx = Math.round(cos * x - sin * y + halfW);
      const ry = Math.round(sin * x + cos * y + halfH);
      const sx = clamp(rx, 0, width - 1);
      const sy = clamp(ry, 0, height - 1);
      const idx = (sy * width + sx) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3] / 255;
      let lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      lum = lum * a + (1 - a);
      if (settings.invert) lum = 1 - lum;
      const radius = clamp((1 - lum) * maxRadius, 0, maxRadius);
      if (radius <= 0.1) continue;
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.fillStyle =
        settings.colorMode === "color"
          ? `rgba(${r}, ${g}, ${b}, ${a})`
          : "#000";
      ctx.fill();
    }
  }
}

export default function HalftonePage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dotSize, setDotSize] = useState(10);
  const [spacing, setSpacing] = useState(12);
  const [angle, setAngle] = useState(15);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(120);
  const [saturation, setSaturation] = useState(90);
  const [invert, setInvert] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>("mono");
  const [outputWidth, setOutputWidth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const settings = useMemo(
    () => ({
      dotSize,
      spacing,
      angle,
      brightness,
      contrast,
      saturation,
      invert,
      colorMode,
    }),
    [dotSize, spacing, angle, brightness, contrast, saturation, invert, colorMode],
  );

  useEffect(() => {
    if (!imageUrl) {
      setImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = imageUrl;
    return () => {
      img.onload = null;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const el = outputRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setOutputWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!image || !canvasRef.current || !outputWidth) return;
    const width = Math.max(200, Math.floor(outputWidth - OUTPUT_PADDING_X));
    drawHalftone(image, canvasRef.current, settings, width);
  }, [image, outputWidth, settings]);

  useEffect(() => () => revokeBlobUrl(imageUrl), [imageUrl]);

  const updateImageUrl = (next: string | null) => {
    setImageUrl((prev) => {
      revokeBlobUrl(prev);
      return next;
    });
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    updateImageUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    updateImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const loadSample = () => {
    updateImageUrl("/grid/2.png");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <PageTransition>
      <div className="flex min-h-dvh flex-col">
        <main className="relative isolate mx-auto w-full max-w-6xl px-6 py-10 sm:py-14 flex-1">
          <SectionFade once threshold={0.12}>
            <header className="mb-6 sm:mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="meta text-fofo-blue">TOOLS / HALFTONE</p>
                <h1 className="mt-1 font-semibold leading-tight tracking-tight text-3xl sm:text-4xl">
                  Halftone
                </h1>
                <p className="mt-2 max-w-2xl text-black/60">
                  Print-style dots with adjustable rhythm, contrast, and color.
                </p>
              </div>
              <Link
                href="/tools"
                aria-label="Back to tools"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-fofo-blue text-white shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fofo-blue/60"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </header>

            <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
              <div className="card p-5">
                <div className="meta text-fofo-blue">input</div>
                <div className="mt-3">
                  <label className="text-sm text-black/70">Image file</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="mt-2 w-full text-sm text-black/70"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={loadSample}
                    className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/70 transition hover:-translate-y-0.5 hover:shadow"
                  >
                    Use sample
                  </button>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/70 transition hover:-translate-y-0.5 hover:shadow"
                  >
                    Clear
                  </button>
                </div>

                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Selected preview"
                    className="mt-4 w-full rounded-xl border border-black/10 object-cover"
                  />
                ) : (
                  <p className="mt-4 text-sm text-black/50">Pick an image or try the sample.</p>
                )}

                <div className="mt-6 border-t border-black/10 pt-4">
                  <div className="meta text-fofo-blue">controls</div>

                  <label className="mt-3 block text-sm text-black/70">Dot size</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={MIN_DOT}
                      max={MAX_DOT}
                      step={1}
                      value={dotSize}
                      onChange={(event) => setDotSize(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{dotSize}px</span>
                  </div>

                  <label className="mt-4 block text-sm text-black/70">Spacing</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={MIN_SPACING}
                      max={MAX_SPACING}
                      step={1}
                      value={spacing}
                      onChange={(event) => setSpacing(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{spacing}px</span>
                  </div>

                  <label className="mt-4 block text-sm text-black/70">Angle</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      step={1}
                      value={angle}
                      onChange={(event) => setAngle(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{angle}°</span>
                  </div>

                  <label className="mt-4 block text-sm text-black/70">Brightness</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={200}
                      step={1}
                      value={brightness}
                      onChange={(event) => setBrightness(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{brightness}%</span>
                  </div>

                  <label className="mt-4 block text-sm text-black/70">Contrast</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={200}
                      step={1}
                      value={contrast}
                      onChange={(event) => setContrast(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{contrast}%</span>
                  </div>

                  <label className="mt-4 block text-sm text-black/70">Saturation</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={200}
                      step={1}
                      value={saturation}
                      onChange={(event) => setSaturation(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{saturation}%</span>
                  </div>

                  <label className="mt-4 block text-sm text-black/70">Color mode</label>
                  <select
                    value={colorMode}
                    onChange={(event) => setColorMode(event.target.value as ColorMode)}
                    className="mt-2 w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-sm text-black/70"
                  >
                    <option value="mono">Mono</option>
                    <option value="color">Color</option>
                  </select>

                  <label className="mt-4 flex items-center gap-2 text-sm text-black/70">
                    <input
                      type="checkbox"
                      checked={invert}
                      onChange={(event) => setInvert(event.target.checked)}
                      className="h-4 w-4 rounded border-black/20"
                    />
                    Invert dots
                  </label>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="meta text-fofo-blue">output</div>
                    <p className="mt-1 text-sm text-black/60">
                      {image ? "Adjust sliders to tune the dot grid." : "Upload an image to render."}
                    </p>
                  </div>
                </div>

                <div
                  ref={outputRef}
                  className="mt-4 min-h-[55vh] max-h-[70vh] overflow-auto rounded-xl border border-black/10 bg-white p-3"
                >
                  {image ? (
                    <canvas ref={canvasRef} className="w-full h-auto rounded-lg" />
                  ) : (
                    <p className="text-sm text-black/50">No output yet.</p>
                  )}
                </div>
              </div>
            </div>
          </SectionFade>
        </main>
      </div>
    </PageTransition>
  );
}
