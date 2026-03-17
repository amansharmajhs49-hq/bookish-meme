import { useState, useMemo, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  Activity, TrendingDown, TrendingUp, Minus,
  ChevronDown, Award, Scale,
  BarChart2, LineChart, Camera, Upload, X, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ProgressEntry {
  id: string;
  recorded_at: string;
  weight: number | null;
  height: number | null;
  body_fat: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  biceps: number | null;
  thighs: number | null;
  notes: string | null;
  photo_paths?: string[];
}

interface PortalProgressSectionProps {
  progress: ProgressEntry[];
  expanded: boolean;
  onToggle: () => void;
  clientId: string;
  onProgressRefresh?: () => void;
}

type Metric = 'weight' | 'body_fat' | 'waist' | 'chest' | 'biceps' | 'thighs';

const METRICS: { key: Metric; label: string; unit: string; lowerIsBetter: boolean }[] = [
  { key: 'weight',    label: 'Weight',    unit: 'kg', lowerIsBetter: true  },
  { key: 'body_fat',  label: 'Body Fat',  unit: '%',  lowerIsBetter: true  },
  { key: 'waist',     label: 'Waist',     unit: 'cm', lowerIsBetter: true  },
  { key: 'chest',     label: 'Chest',     unit: 'cm', lowerIsBetter: false },
  { key: 'biceps',    label: 'Biceps',    unit: 'cm', lowerIsBetter: false },
  { key: 'thighs',    label: 'Thighs',    unit: 'cm', lowerIsBetter: false },
];

function delta(current: number | null, previous: number | null, lowerIsBetter: boolean) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return { dir: 'same', val: 0 };
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  return { dir: good ? 'good' : 'bad', val: diff };
}

function DeltaBadge({ d }: { d: ReturnType<typeof delta> }) {
  if (!d || d.dir === 'same') return <Minus className="h-3 w-3 text-muted-foreground" />;
  const good = d.dir === 'good';
  return (
    <span className={cn('flex items-center gap-0.5 text-[10px] font-semibold', good ? 'text-emerald-500' : 'text-destructive')}>
      {good ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
      {d.val > 0 ? '+' : ''}{d.val.toFixed(1)}
    </span>
  );
}

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-[11px]">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-foreground">{val != null ? `${val} ${unit}` : '—'}</p>
    </div>
  );
}

function BMIGauge({ bmi }: { bmi: number }) {
  const pct = Math.min(100, Math.max(0, ((bmi - 15) / (40 - 15)) * 100));
  const category =
    bmi < 18.5 ? { label: 'Underweight', color: 'text-amber-500', bg: 'bg-amber-500' } :
    bmi < 25   ? { label: 'Normal',       color: 'text-emerald-500', bg: 'bg-emerald-500' } :
    bmi < 30   ? { label: 'Overweight',   color: 'text-orange-500',  bg: 'bg-orange-500'  } :
                 { label: 'Obese',         color: 'text-destructive', bg: 'bg-destructive'  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Scale className="h-3.5 w-3.5 text-primary" /> BMI
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">{bmi.toFixed(1)}</span>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted', category.color)}>
            {category.label}
          </span>
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative h-2 rounded-full overflow-hidden" style={{
        background: 'linear-gradient(to right, #f59e0b 0%, #22c55e 30%, #22c55e 55%, #f97316 70%, #ef4444 100%)'
      }}>
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-foreground shadow-sm transition-all"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>15</span>
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>40</span>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">Healthy range: 18.5 – 24.9</p>
    </div>
  );
}

export function PortalProgressSection({ progress, expanded, onToggle, clientId, onProgressRefresh }: PortalProgressSectionProps) {
  const [activeMetric, setActiveMetric] = useState<Metric>('weight');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [formData, setFormData] = useState({ weight: '', body_fat: '', waist: '', chest: '', biceps: '', thighs: '', notes: '' });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleSubmitEntry = async () => {
    const hasData = Object.values(formData).some(v => v.trim() !== '') || selectedPhoto;
    if (!hasData) { setUploadStatus('Please enter at least one measurement or photo'); return; }
    setUploading(true);
    setUploadStatus('Saving...');
    try {
      const photoPaths: string[] = [];
      if (selectedPhoto) {
        const ext = selectedPhoto.name.split('.').pop();
        const path = `${clientId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('progress-photos').upload(path, selectedPhoto);
        if (uploadErr) throw uploadErr;
        photoPaths.push(path);
      }
      const entry: any = {
        client_id: clientId,
        recorded_at: new Date().toISOString(),
        photo_paths: photoPaths,
      };
      if (formData.weight) entry.weight = parseFloat(formData.weight);
      if (formData.body_fat) entry.body_fat = parseFloat(formData.body_fat);
      if (formData.waist) entry.waist = parseFloat(formData.waist);
      if (formData.chest) entry.chest = parseFloat(formData.chest);
      if (formData.biceps) entry.biceps = parseFloat(formData.biceps);
      if (formData.thighs) entry.thighs = parseFloat(formData.thighs);
      if (formData.notes) entry.notes = formData.notes;
      const { error } = await supabase.from('body_progress').insert(entry);
      if (error) throw error;
      setUploadStatus('Saved!');
      setFormData({ weight: '', body_fat: '', waist: '', chest: '', biceps: '', thighs: '', notes: '' });
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setShowAddForm(false);
      onProgressRefresh?.();
      setTimeout(() => setUploadStatus(''), 2000);
    } catch (err: any) {
      setUploadStatus(err.message || 'Failed to save');
    } finally {
      setUploading(false);
    }
  };

  // Sort oldest → newest for charts
  const sorted = useMemo(() =>
    [...progress].sort((a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    ), [progress]);

  const latest  = progress[0];   // newest first
  const previous = progress[1];

  // Available metrics (those with at least 1 non-null value)
  const availableMetrics = useMemo(() =>
    METRICS.filter(m => sorted.some(e => e[m.key] != null)),
    [sorted]
  );

  // Chart data for active metric
  const chartData = useMemo(() =>
    sorted
      .filter(e => e[activeMetric] != null)
      .map(e => ({
        date: format(parseISO(e.recorded_at), 'd MMM'),
        value: e[activeMetric],
      })),
    [sorted, activeMetric]
  );

  // Overall change (first → latest)
  const overallChange = useMemo(() => {
    const first = sorted.find(e => e[activeMetric] != null)?.[activeMetric];
    const last  = [...sorted].reverse().find(e => e[activeMetric] != null)?.[activeMetric];
    if (first == null || last == null || first === last) return null;
    return { from: first, to: last, diff: last - first };
  }, [sorted, activeMetric]);

  const currentMetric = METRICS.find(m => m.key === activeMetric)!;

  // BMI
  const bmi = useMemo(() => {
    if (!latest?.weight || !(latest as any).height) return null;
    return latest.weight / (((latest as any).height / 100) ** 2);
  }, [latest]);

  // Achievement: longest streak of improvement
  const streak = useMemo(() => {
    let s = 0, max = 0;
    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i][activeMetric];
      const prev = sorted[i - 1][activeMetric];
      if (cur != null && prev != null) {
        const improved = currentMetric.lowerIsBetter ? cur < prev : cur > prev;
        s = improved ? s + 1 : 0;
        max = Math.max(max, s);
      }
    }
    return max;
  }, [sorted, activeMetric, currentMetric]);

  const yDomain = useMemo(() => {
    const vals = chartData.map(d => d.value as number).filter(v => v != null);
    if (!vals.length) return ['auto', 'auto'];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.2, 1);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [chartData]);

  if (progress.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Body Progress</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">0</span>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </button>
        {expanded && (
          <div className="px-4 pb-5 pt-2 text-center space-y-1">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">No progress entries yet</p>
            <p className="text-xs text-muted-foreground/60">Your trainer will add your measurements here</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors active:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Body Progress</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium">
            {progress.length}
          </span>
          {/* Latest weight teaser */}
          {latest?.weight && !expanded && (
            <span className="text-[10px] text-muted-foreground ml-1">
              · {latest.weight} kg
              {previous?.weight && (
                <span className={cn('ml-1', latest.weight < previous.weight ? 'text-emerald-500' : 'text-destructive')}>
                  {latest.weight < previous.weight ? '↓' : '↑'}
                  {Math.abs(latest.weight - previous.weight).toFixed(1)}
                </span>
              )}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 space-y-4">

              {/* ── Log check-in button ── */}
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
              >
                <Camera className="h-4 w-4" />
                {showAddForm ? 'Cancel' : 'Log today\'s check-in'}
              </button>

              {/* ── Add entry form ── */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's measurements</p>

                      {/* Photo upload */}
                      <div>
                        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                        {photoPreview ? (
                          <div className="relative">
                            <img src={photoPreview} alt="" className="w-full h-40 object-cover rounded-xl" />
                            <button onClick={() => { setSelectedPhoto(null); setPhotoPreview(null); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => fileInputRef.current?.click()} className="w-full h-28 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                            <Upload className="h-6 w-6" />
                            <span className="text-xs font-medium">Add progress photo</span>
                          </button>
                        )}
                      </div>

                      {/* Measurements grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'weight', label: 'Weight (kg)', placeholder: '75.5' },
                          { key: 'body_fat', label: 'Body Fat (%)', placeholder: '18.0' },
                          { key: 'waist', label: 'Waist (cm)', placeholder: '80' },
                          { key: 'chest', label: 'Chest (cm)', placeholder: '95' },
                          { key: 'biceps', label: 'Biceps (cm)', placeholder: '35' },
                          { key: 'thighs', label: 'Thighs (cm)', placeholder: '55' },
                        ].map(field => (
                          <div key={field.key}>
                            <label className="text-[10px] text-muted-foreground font-medium">{field.label}</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder={field.placeholder}
                              value={formData[field.key as keyof typeof formData]}
                              onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full mt-0.5 px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="text-[10px] text-muted-foreground font-medium">Notes (optional)</label>
                        <input
                          type="text"
                          placeholder="How are you feeling today?"
                          value={formData.notes}
                          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full mt-0.5 px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </div>

                      {uploadStatus && (
                        <p className={cn('text-xs text-center font-medium', uploadStatus === 'Saved!' ? 'text-emerald-500' : uploadStatus === 'Saving...' ? 'text-muted-foreground' : 'text-destructive')}>
                          {uploadStatus}
                        </p>
                      )}

                      <button
                        onClick={handleSubmitEntry}
                        disabled={uploading}
                        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploading ? 'Saving...' : 'Save check-in'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Latest snapshot pills ── */}
              {latest && (
                <div className="grid grid-cols-3 gap-2">
                  {availableMetrics.slice(0, 6).map(m => {
                    const val = latest[m.key];
                    const prevVal = previous?.[m.key] ?? null;
                    const d = delta(val, prevVal, m.lowerIsBetter);
                    if (val == null) return null;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setActiveMetric(m.key)}
                        className={cn(
                          'rounded-xl p-2.5 text-left transition-all border',
                          activeMetric === m.key
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-muted/40 border-border/50 hover:border-border'
                        )}
                      >
                        <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{m.label}</p>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-sm font-bold text-foreground">{val}</span>
                          <span className="text-[9px] text-muted-foreground">{m.unit}</span>
                        </div>
                        <DeltaBadge d={d} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Chart section ── */}
              {chartData.length >= 2 && (
                <div className="rounded-2xl border border-border bg-muted/20 p-3 space-y-3">

                  {/* Chart header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {currentMetric.label} over time
                      </p>
                      {overallChange && (
                        <p className={cn('text-[11px] font-medium mt-0.5',
                          (currentMetric.lowerIsBetter ? overallChange.diff < 0 : overallChange.diff > 0)
                            ? 'text-emerald-500' : 'text-destructive'
                        )}>
                          {overallChange.from}{currentMetric.unit} → {overallChange.to}{currentMetric.unit}
                          {' '}({overallChange.diff > 0 ? '+' : ''}{overallChange.diff.toFixed(1)}{currentMetric.unit} total)
                        </p>
                      )}
                    </div>
                    {/* Chart type toggle */}
                    <div className="flex rounded-lg bg-muted p-0.5 gap-0.5">
                      <button
                        onClick={() => setChartType('area')}
                        className={cn('p-1.5 rounded-md transition-colors', chartType === 'area' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground')}
                      >
                        <LineChart className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setChartType('bar')}
                        className={cn('p-1.5 rounded-md transition-colors', chartType === 'bar' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground')}
                      >
                        <BarChart2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metric tabs */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    {availableMetrics.map(m => (
                      <button
                        key={m.key}
                        onClick={() => setActiveMetric(m.key)}
                        className={cn(
                          'shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all',
                          activeMetric === m.key
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Chart */}
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'area' ? (
                        <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                          <defs>
                            <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}    />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false} tickLine={false}
                          />
                          <YAxis
                            domain={yDomain as any}
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false} tickLine={false}
                            tickFormatter={v => `${v}`}
                          />
                          <Tooltip content={<ChartTooltip unit={currentMetric.unit} />} />
                          <Area
                            type="monotone"
                            dataKey="value"
                            name={currentMetric.label}
                            stroke="hsl(var(--primary))"
                            fill="url(#pg)"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: 'hsl(var(--card))', strokeWidth: 2.5, stroke: 'hsl(var(--primary))' }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                            connectNulls
                          />
                        </AreaChart>
                      ) : (
                        <BarChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false} tickLine={false}
                          />
                          <YAxis
                            domain={yDomain as any}
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false} tickLine={false}
                          />
                          <Tooltip content={<ChartTooltip unit={currentMetric.unit} />} />
                          <Bar
                            dataKey="value"
                            name={currentMetric.label}
                            fill="hsl(var(--primary))"
                            fillOpacity={0.8}
                            radius={[5, 5, 0, 0]}
                            maxBarSize={36}
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* Streak badge */}
                  {streak >= 2 && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                      <Award className="h-4 w-4 text-emerald-500 shrink-0" />
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {streak} consecutive improvements in {currentMetric.label.toLowerCase()}!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── BMI gauge ── */}
              {bmi && <BMIGauge bmi={bmi} />}

              {/* ── Entry history ── */}
              {progress.length > 1 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-0.5">
                    All entries
                  </p>
                  <div className="space-y-2">
                    {progress.map((entry, i) => {
                      const prev = progress[i + 1];
                      const measurements = [
                        { label: 'Weight',   val: entry.weight,   prev: prev?.weight,   unit: 'kg', low: true  },
                        { label: 'Body Fat', val: entry.body_fat, prev: prev?.body_fat, unit: '%',  low: true  },
                        { label: 'Chest',    val: entry.chest,    prev: prev?.chest,    unit: 'cm', low: false },
                        { label: 'Waist',    val: entry.waist,    prev: prev?.waist,    unit: 'cm', low: true  },
                        { label: 'Biceps',   val: entry.biceps,   prev: prev?.biceps,   unit: 'cm', low: false },
                        { label: 'Thighs',   val: entry.thighs,   prev: prev?.thighs,   unit: 'cm', low: false },
                      ].filter(m => m.val != null);

                      return (
                        <div key={entry.id} className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            {format(parseISO(entry.recorded_at), 'dd MMM yyyy')}
                          </p>
                          {measurements.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5">
                              {measurements.map(m => {
                                const d = delta(m.val, m.prev ?? null, m.low);
                                return (
                                  <div key={m.label} className="space-y-0.5">
                                    <p className="text-[9px] text-muted-foreground">{m.label}</p>
                                    <div className="flex items-baseline gap-0.5">
                                      <span className="text-xs font-bold">{m.val}</span>
                                      <span className="text-[9px] text-muted-foreground">{m.unit}</span>
                                    </div>
                                    <DeltaBadge d={d} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {entry.notes && (
                            <p className="text-[11px] text-muted-foreground italic border-t border-border/60 pt-2">
                              "{entry.notes}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
