'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDebounce } from '@/lib/useDebounce';

type ForecastItem = {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
  weather: Array<{ main: string; description: string; icon: string }>;
};

interface WeatherData {
  city: { name: string; country: string };
  forecast: ForecastItem[];
}

function formatWeekday(ts: number, locale = 'en-US') {
  return new Date(ts * 1000).toLocaleDateString(locale, { weekday: 'short' });
}

function c(v: number) {
  return Math.round(v);
}

function WeatherIcon({
  type,
  className,
  size = 40,
  variant = 'solid',
}: {
  type: string;
  className?: string;
  size?: number;
  variant?: 'solid' | 'outline';
}) {
  const t = (type || '').toLowerCase();
  const title = type || 'weather';
  const isOutline = variant === 'outline';
  const fillColor = isOutline ? 'white' : 'currentColor';
  const strokeColor = isOutline ? 'currentColor' : 'none';

  if (t.includes('clear')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={title}
        role="img"
      >
        <title>{title}</title>
        <circle cx="12" cy="12" r="4.5" fill={fillColor} stroke={strokeColor} strokeWidth={isOutline ? 1.6 : 0} />
        <g stroke={isOutline ? strokeColor : 'currentColor'} strokeWidth="1.2" strokeLinecap="round">
          <line x1="12" y1="1.5" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22.5" y2="12" />
          <line x1="4.2" y1="4.2" x2="6" y2="6" />
          <line x1="18" y1="18" x2="19.8" y2="19.8" />
          <line x1="4.2" y1="19.8" x2="6" y2="18" />
          <line x1="18" y1="6" x2="19.8" y2="4.2" />
        </g>
      </svg>
    );
  }

  if (t.includes('cloud')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={title}
        role="img"
      >
        <title>{title}</title>
        <path d="M6 17h11a4 4 0 000-8 5 5 0 00-9-1A4 4 0 006 17z" fill={fillColor} stroke={strokeColor} strokeWidth={isOutline ? 1.4 : 0} />
      </svg>
    );
  }

  if (t.includes('rain') || t.includes('drizzle')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={title}
        role="img"
      >
        <title>{title}</title>
        <path d="M6 14h11a4 4 0 000-8 5 5 0 00-9-1A4 4 0 006 14z" fill={fillColor} stroke={strokeColor} strokeWidth={isOutline ? 1.2 : 0} />
        <g fill={isOutline ? 'currentColor' : 'currentColor'}>
          <path d="M9 18a1 1 0 11-2 0 1 1 0 012 0z" />
          <path d="M14 18a1 1 0 11-2 0 1 1 0 012 0z" />
          <path d="M11.5 19.5c-.6.8-1.6.8-2.2 0-.6-.8-.6-1.9 0-2.7.6-.8 1.6-.8 2.2 0 .6.8.6 1.9 0 2.7z" />
        </g>
      </svg>
    );
  }

  if (t.includes('snow')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={title}
        role="img"
      >
        <title>{title}</title>
        <path d="M6 13h11a4 4 0 000-8 5 5 0 00-9-1A4 4 0 006 13z" fill={fillColor} stroke={strokeColor} strokeWidth={isOutline ? 1.2 : 0} />
        <g stroke={isOutline ? strokeColor : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="15.5" x2="12" y2="20" />
          <line x1="10" y1="17.5" x2="14" y2="17.5" />
        </g>
      </svg>
    );
  }

  if (t.includes('storm') || t.includes('thunder') || t.includes('thunderstorm')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={title}
        role="img"
      >
        <title>{title}</title>
        <path d="M6 13h11a4 4 0 000-8 5 5 0 00-9-1A4 4 0 006 13z" fill={fillColor} stroke={strokeColor} strokeWidth={isOutline ? 1.2 : 0} />
        <path d="M13 11l-2 4h3l-2 5" fill={isOutline ? 'currentColor' : 'currentColor'} />
      </svg>
    );
  }

  // haze / mist / smoke / default
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={title}
      role="img"
    >
      <title>{title}</title>
      <path d="M3 10h14" stroke={isOutline ? strokeColor : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5 14h12" stroke={isOutline ? strokeColor : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7 18h10" stroke={isOutline ? strokeColor : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
export default function WeatherCard({ defaultCity }: { defaultCity: string }) {
  const [city, setCity] = useState(defaultCity);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedCity = useDebounce(city, 500);

  useEffect(() => {
    async function run() {
      if (!debouncedCity) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(debouncedCity)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to fetch weather');
        setWeather(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to fetch weather');
        setWeather(null);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [debouncedCity]);

  const today = useMemo(() => weather?.forecast?.[0], [weather]);

  // Background gradient mapping per condition — return two layered gradients for motion
  function bgForConditionLayers(cond?: string) {
    const c = (cond || '').toLowerCase();
    if (c.includes('clear'))
      return {
        a: 'radial-gradient(80% 60% at 10% 10%, rgba(255,215,84,0.18), transparent 35%)',
        b: 'linear-gradient(180deg, rgba(255,250,240,0.9), rgba(255,245,230,0.65))',
      };
    if (c.includes('cloud'))
      return {
        a: 'radial-gradient(60% 40% at 90% 90%, rgba(100,116,139,0.10), transparent 35%)',
        b: 'linear-gradient(180deg, rgba(247,249,250,0.95), rgba(241,245,249,0.7))',
      };
    if (c.includes('rain') || c.includes('drizzle'))
      return {
        a: 'radial-gradient(70% 50% at 10% 10%, rgba(59,130,246,0.12), transparent 35%)',
        b: 'linear-gradient(180deg, rgba(235,245,255,0.95), rgba(225,238,255,0.6))',
      };
    if (c.includes('snow'))
      return {
        a: 'radial-gradient(60% 40% at 50% 10%, rgba(203,213,225,0.12), transparent 35%)',
        b: 'linear-gradient(180deg, rgba(255,255,255,0.99), rgba(248,250,252,0.8))',
      };
    if (c.includes('storm') || c.includes('thunder'))
      return {
        a: 'radial-gradient(70% 50% at 90% 10%, rgba(99,102,241,0.12), transparent 35%)',
        b: 'linear-gradient(180deg, rgba(245,247,255,0.95), rgba(235,240,255,0.55))',
      };
    return {
      a: 'radial-gradient(80% 60% at 0% 0%, rgba(0,8,255,0.08), transparent 35%)',
      b: 'radial-gradient(60% 50% at 100% 100%, rgba(0,8,255,0.06), transparent 35%)',
    };
  }

  const bgLayers = useMemo(() => bgForConditionLayers(today?.weather?.[0]?.main), [today]);

  function iconBgColorFor(cond?: string) {
    const c = (cond || '').toLowerCase();
    if (c.includes('clear')) return 'rgba(255,215,84,0.12)';
    if (c.includes('cloud')) return 'rgba(100,116,139,0.06)';
    if (c.includes('rain') || c.includes('drizzle')) return 'rgba(59,130,246,0.12)';
    if (c.includes('snow')) return 'rgba(203,213,225,0.10)';
    if (c.includes('storm') || c.includes('thunder')) return 'rgba(99,102,241,0.12)';
    return 'rgba(0,8,255,0.06)';
  }

  const iconBgColor = useMemo(() => iconBgColorFor(today?.weather?.[0]?.main), [today]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white">
      {/* two layered animated backgrounds for a more noticeable effect */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        // avoid mixing the shorthand `background` with `backgroundPosition` animation
        // use backgroundImage + explicit positioning instead
        style={{ backgroundImage: bgLayers.b, backgroundRepeat: 'no-repeat', backgroundPosition: '0% 0%', mixBlendMode: 'normal' }}
        animate={{ backgroundPosition: ['0% 0%', '20% 10%', '0% 0%'] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: bgLayers.a, backgroundRepeat: 'no-repeat', backgroundPosition: '0% 0%', mixBlendMode: 'screen', opacity: 0.95 }}
        animate={{ opacity: [0.7, 1, 0.7], backgroundPosition: ['0% 0%', '10% 20%', '0% 0%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <div className="relative grid gap-10 p-8 lg:grid-cols-2 lg:p-12">
        {/* Left — hero */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <span className="meta text-fofo-blue">WEATHER</span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <div className="mt-6 flex items-end gap-3">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Type a city…"
              className="w-full max-w-md rounded-full border border-black/10 bg-white/70 px-5 py-3 text-base outline-none transition focus:border-fofo-blue/70"
            />
          </div>

          <AnimatePresence mode="wait">
            {loading && (
              <motion.p
                key="loading"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 text-sm text-black/60"
              >
                fetching forecast…
              </motion.p>
            )}

            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 text-sm text-red-500"
              >
                {error}
              </motion.p>
            )}

            {today && !loading && !error && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                className="mt-8"
              >
                <h1 className="font-semibold leading-tight tracking-tight text-3xl md:text-4xl">
                  {weather!.city.name}, {weather!.city.country}
                </h1>

                <div className="mt-6 flex items-center gap-6">
                  <motion.div
                    className="rounded-full p-2"
                    initial={{ scale: 0.96 }}
                    animate={{
                      scale: [0.98, 1.06, 0.98],
                      boxShadow: [
                        '0 0 0 rgba(0,0,0,0)',
                        '0 20px 40px rgba(34,82,255,0.06)',
                        '0 0 0 rgba(0,0,0,0)'
                      ],
                    }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ background: iconBgColor }}
                  >
                    <WeatherIcon
                      type={today.weather[0].main}
                      className="h-20 w-20 text-fofo-blue"
                      size={80}
                      variant="outline"
                    />
                  </motion.div>
                  <div>
                    <div className="text-6xl font-semibold">{c(today.main.temp)}°</div>
                    <div className="mt-1 text-sm text-black/60">
                      {today.weather[0].main} · high {c(today.main.temp_max)}° / low {c(today.main.temp_min)}°
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right — 5-day strip */}
        <div className="flex flex-col">
          <h3 className="meta mb-4 text-black/60">Next days</h3>
          <div className="grid grid-cols-5 gap-3">
            {(weather?.forecast ?? new Array(5).fill(null)).slice(0, 5).map((f, i) => (
              <motion.div
                key={f ? f.dt : i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-2xl border border-black/10 bg-white/70 p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow"
              >
                {f ? (
                  <>
                    <div className="mb-1 text-[11px] uppercase tracking-wide text-black/60">
                      {formatWeekday(f.dt)}
                    </div>
                    <WeatherIcon
                      type={f.weather[0].main}
                      className="mx-auto h-8 w-8 opacity-90 text-fofo-blue"
                      size={32}
                      variant="outline"
                    />
                    <div className="mt-2 text-sm font-semibold">{c(f.main.temp_max)}°</div>
                    <div className="text-xs text-black/50">{c(f.main.temp_min)}°</div>
                  </>
                ) : (
                  // skeleton
                  <div className="flex h-[92px] flex-col items-center justify-center gap-2">
                    <div className="h-3 w-10 rounded bg-black/5" />
                    <div className="h-8 w-8 rounded-full bg-black/5" />
                    <div className="h-3 w-8 rounded bg-black/5" />
                    <div className="h-2 w-6 rounded bg-black/5" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* meta line */}
          <p className="mt-6 text-xs text-black/50">
            Data via OpenWeather · Fofo Club
          </p>
        </div>
      </div>
    </section>
  );
}
