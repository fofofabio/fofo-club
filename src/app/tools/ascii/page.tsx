"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";

const CHARSETS = {
  standard: " .:-=+*#%@",
  dense: " .'`^\",:;Il!i~+_-?][}{1)(|\\/*tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
} as const;

type CharsetKey = keyof typeof CHARSETS;

const MIN_COLS = 30;
const MAX_COLS = 160;
const CHAR_ASPECT = 0.55;
const OUTPUT_PADDING_X = 24;
const BASE_FONT_SIZE = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function revokeBlobUrl(url: string | null) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function getOutputSize(img: HTMLImageElement, cols: number) {
  const width = clamp(Math.round(cols), MIN_COLS, MAX_COLS);
  const baseWidth = img.naturalWidth || img.width || 1;
  const baseHeight = img.naturalHeight || img.height || 1;
  const ratio = baseHeight / baseWidth;
  const height = Math.max(1, Math.round(width * ratio * CHAR_ASPECT));
  return { width, height };
}

function applyKernel(
  source: Float32Array,
  width: number,
  height: number,
  kernel: number[],
): Float32Array {
  const out = new Float32Array(source.length);
  const maxX = width - 1;
  const maxY = height - 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      let k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const sy = clamp(y + ky, 0, maxY);
        for (let kx = -1; kx <= 1; kx++) {
          const sx = clamp(x + kx, 0, maxX);
          acc += source[sy * width + sx] * kernel[k++];
        }
      }
      out[y * width + x] = acc;
    }
  }

  return out;
}

function applySharpen(
  source: Float32Array,
  width: number,
  height: number,
  amount: number,
): Float32Array {
  if (amount <= 0) return source;
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const sharpened = applyKernel(source, width, height, kernel);
  const out = new Float32Array(source.length);
  for (let i = 0; i < source.length; i++) {
    out[i] = clamp01(source[i] + (sharpened[i] - source[i]) * amount);
  }
  return out;
}

function detectEdges(source: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(source.length);
  const maxX = width - 1;
  const maxY = height - 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const y0 = clamp(y - 1, 0, maxY);
      const y1 = y;
      const y2 = clamp(y + 1, 0, maxY);
      const x0 = clamp(x - 1, 0, maxX);
      const x1 = x;
      const x2 = clamp(x + 1, 0, maxX);

      const a00 = source[y0 * width + x0];
      const a01 = source[y0 * width + x1];
      const a02 = source[y0 * width + x2];
      const a10 = source[y1 * width + x0];
      const a12 = source[y1 * width + x2];
      const a20 = source[y2 * width + x0];
      const a21 = source[y2 * width + x1];
      const a22 = source[y2 * width + x2];

      const gx = -a00 - 2 * a10 - a20 + a02 + 2 * a12 + a22;
      const gy = -a00 - 2 * a01 - a02 + a20 + 2 * a21 + a22;
      const mag = Math.hypot(gx, gy);
      out[y * width + x] = clamp01(mag / 4);
    }
  }

  return out;
}

type AsciiSettings = {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  grayscale: boolean;
  sepia: boolean;
  invertColors: boolean;
  sharpness: number;
  edgeStrength: number;
  threshold: number;
  spaceDensity: number;
};

function imageToAscii(
  img: HTMLImageElement,
  cols: number,
  charset: string,
  settings: AsciiSettings,
): string {
  const { width, height } = getOutputSize(img, cols);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = true;
  const filter = [
    `brightness(${settings.brightness}%)`,
    `contrast(${settings.contrast}%)`,
    `saturate(${settings.saturation}%)`,
    `hue-rotate(${settings.hue}deg)`,
    `grayscale(${settings.grayscale ? 100 : 0}%)`,
    `sepia(${settings.sepia ? 100 : 0}%)`,
  ].join(" ");
  ctx.filter = filter;
  ctx.drawImage(img, 0, 0, width, height);

  const data = ctx.getImageData(0, 0, width, height).data;
  const luminance = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    let r = data[idx];
    let g = data[idx + 1];
    let b = data[idx + 2];
    const a = data[idx + 3] / 255;
    if (settings.invertColors) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    let lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    lum = lum * a + (1 - a);
    luminance[i] = clamp01(lum);
  }

  let adjusted = applySharpen(luminance, width, height, settings.sharpness / 100);
  if (settings.edgeStrength > 0) {
    const edges = detectEdges(adjusted, width, height);
    const edgeAmount = settings.edgeStrength / 100;
    for (let i = 0; i < adjusted.length; i++) {
      adjusted[i] = clamp01(adjusted[i] - edges[i] * edgeAmount);
    }
  }

  if (settings.spaceDensity > 0) {
    const gamma = 1 - (settings.spaceDensity / 100) * 0.6;
    for (let i = 0; i < adjusted.length; i++) {
      adjusted[i] = clamp01(Math.pow(adjusted[i], gamma));
    }
  }

  if (settings.threshold > 0) {
    const t = settings.threshold / 100;
    for (let i = 0; i < adjusted.length; i++) {
      adjusted[i] = adjusted[i] >= t ? 1 : 0;
    }
  }

  const scale = Math.max(1, charset.length - 1);
  const lines: string[] = [];
  for (let y = 0; y < height; y++) {
    let row = "";
    for (let x = 0; x < width; x++) {
      const lum = adjusted[y * width + x];
      const raw = Math.round(lum * scale);
      const idx = scale - raw;
      row += charset[idx] ?? " ";
    }
    lines.push(row);
  }

  return lines.join("\n");
}

export default function AsciiToolPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ascii, setAscii] = useState("");
  const [outputWidth, setOutputWidth] = useState(0);
  const [charWidthPerFont, setCharWidthPerFont] = useState<number | null>(null);
  const [columns, setColumns] = useState(90);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [hue, setHue] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [sepia, setSepia] = useState(false);
  const [invertColors, setInvertColors] = useState(false);
  const [sharpness, setSharpness] = useState(0);
  const [edgeStrength, setEdgeStrength] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [spaceDensity, setSpaceDensity] = useState(0);
  const [charsetKey, setCharsetKey] = useState<CharsetKey>("standard");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);

  const charset = CHARSETS[charsetKey];

  const outputSize = useMemo(() => {
    if (!image) return null;
    return getOutputSize(image, columns);
  }, [image, columns]);

  const settings = useMemo(
    () => ({
      brightness,
      contrast,
      saturation,
      hue,
      grayscale,
      sepia,
      invertColors,
      sharpness,
      edgeStrength,
      threshold,
      spaceDensity,
    }),
    [
      brightness,
      contrast,
      saturation,
      hue,
      grayscale,
      sepia,
      invertColors,
      sharpness,
      edgeStrength,
      threshold,
      spaceDensity,
    ],
  );

  useEffect(() => {
    if (!imageUrl) {
      setImage(null);
      setAscii("");
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
    if (!image) {
      setAscii("");
      return;
    }
    const next = imageToAscii(image, columns, charset, settings);
    setAscii(next);
  }, [image, columns, charset, settings]);

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
    const el = measureRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const count = el.textContent?.length ?? 1;
    if (rect.width > 0 && count > 0) {
      setCharWidthPerFont(rect.width / count / BASE_FONT_SIZE);
    }
  }, []);

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
    updateImageUrl("/grid/1.png");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onCopy = async () => {
    if (!ascii) return;
    try {
      await navigator.clipboard.writeText(ascii);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const outputFontSize = useMemo(() => {
    if (!outputSize || !outputWidth || !charWidthPerFont) return 8;
    const innerWidth = Math.max(1, outputWidth - OUTPUT_PADDING_X);
    const charTargetWidth = innerWidth / outputSize.width;
    const next = charTargetWidth / charWidthPerFont;
    return clamp(next, 6, 18);
  }, [outputSize, outputWidth, charWidthPerFont]);

  const outputLineHeight = useMemo(() => {
    if (!charWidthPerFont) return outputFontSize;
    return outputFontSize * (charWidthPerFont / CHAR_ASPECT);
  }, [outputFontSize, charWidthPerFont]);

  return (
    <PageTransition>
      <div className="flex min-h-dvh flex-col">
        <main className="relative isolate mx-auto w-full max-w-6xl px-6 py-10 sm:py-14 flex-1">
          <SectionFade once threshold={0.12}>
            <header className="mb-6 sm:mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="meta text-fofo-blue">TOOLS / ASCII</p>
                <h1 className="mt-1 font-semibold leading-tight tracking-tight text-3xl sm:text-4xl">
                  Image to ASCII
                </h1>
                <p className="mt-2 max-w-2xl text-black/60">
                  Upload a photo, tune the knobs, and build your own text art vibe.
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

                  <div className="mt-3 meta text-fofo-blue">ascii mapping</div>

                  <label className="mt-2 block text-sm text-black/70">Characters (width)</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={MIN_COLS}
                      max={MAX_COLS}
                      step={2}
                      value={columns}
                      onChange={(event) => setColumns(Number(event.target.value))}
                      className="w-full"
                    />
                    <input
                      type="number"
                      min={MIN_COLS}
                      max={MAX_COLS}
                      value={columns}
                      onChange={(event) =>
                        setColumns(clamp(Number(event.target.value), MIN_COLS, MAX_COLS))
                      }
                      className="w-20 rounded-md border border-black/10 px-2 py-1 text-sm text-black/70"
                    />
                  </div>

                  <label className="mt-4 block text-sm text-black/70">Character set</label>
                  <select
                    value={charsetKey}
                    onChange={(event) => setCharsetKey(event.target.value as CharsetKey)}
                    className="mt-2 w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-sm text-black/70"
                  >
                    <option value="standard">Standard</option>
                    <option value="dense">Dense</option>
                  </select>

                  <label className="mt-4 block text-sm text-black/70">Space density</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={spaceDensity}
                      onChange={(event) => setSpaceDensity(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{spaceDensity}%</span>
                  </div>

                  <label className="mt-4 block text-sm text-black/70">Threshold (0 = off)</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={threshold}
                      onChange={(event) => setThreshold(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{threshold}%</span>
                  </div>

                  <div className="mt-5 meta text-fofo-blue">image filters</div>

                  <label className="mt-2 block text-sm text-black/70">Brightness</label>
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

                  <label className="mt-4 block text-sm text-black/70">Hue</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={hue}
                      onChange={(event) => setHue(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{hue}deg</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-black/70">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={grayscale}
                        onChange={(event) => setGrayscale(event.target.checked)}
                        className="h-4 w-4 rounded border-black/20"
                      />
                      Grayscale
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sepia}
                        onChange={(event) => setSepia(event.target.checked)}
                        className="h-4 w-4 rounded border-black/20"
                      />
                      Sepia
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={invertColors}
                        onChange={(event) => setInvertColors(event.target.checked)}
                        className="h-4 w-4 rounded border-black/20"
                      />
                      Invert colors
                    </label>
                  </div>

                  <label className="mt-4 block text-sm text-black/70">Sharpness</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={sharpness}
                      onChange={(event) => setSharpness(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{sharpness}%</span>
                  </div>

                  <label className="mt-4 block text-sm text-black/70">Edge detection</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={edgeStrength}
                      onChange={(event) => setEdgeStrength(Number(event.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-black/60">{edgeStrength}%</span>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="meta text-fofo-blue">output</div>
                    <p className="mt-1 text-sm text-black/60">
                      {outputSize
                        ? `Output size: ${outputSize.width} x ${outputSize.height} chars`
                        : "Output updates when an image is loaded."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onCopy}
                    disabled={!ascii}
                    className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/70 transition hover:-translate-y-0.5 hover:shadow disabled:opacity-50"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div
                  ref={outputRef}
                  className="relative mt-4 min-h-[55vh] max-h-[70vh] overflow-auto rounded-xl border border-black/10 bg-white p-3"
                >
                  <span
                    ref={measureRef}
                    className="pointer-events-none absolute opacity-0"
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: `${BASE_FONT_SIZE}px`,
                      whiteSpace: "pre",
                    }}
                    aria-hidden="true"
                  >
                    {"M".repeat(80)}
                  </span>
                  {ascii ? (
                    <pre
                      className="whitespace-pre font-mono text-black/80 leading-none"
                      style={{
                        fontSize: `${outputFontSize}px`,
                        lineHeight: `${outputLineHeight}px`,
                      }}
                    >
                      {ascii}
                    </pre>
                  ) : (
                    <p className="text-sm text-black/50">Upload an image to generate ASCII art.</p>
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
