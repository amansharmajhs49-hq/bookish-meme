import { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  X,
  Scale,
  Ruler,
  Percent,
  Calendar,
  StickyNote,
  Heart,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useBodyProgress, useDeleteBodyProgress, getProgressPhotoUrl, BodyProgressEntry } from '@/hooks/useBodyProgress';
import { AddBodyProgressModal } from '@/components/AddBodyProgressModal';
import { formatDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface BodyProgressSectionProps {
  clientId: string;
}

function TrendIndicator({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const formatted = (diff > 0 ? '+' : '') + diff.toFixed(1);
  return diff > 0
    ? <span className="flex items-center gap-0.5 text-[10px] text-green-500"><TrendingUp className="h-3 w-3" />{formatted}</span>
    : <span className="flex items-center gap-0.5 text-[10px] text-destructive"><TrendingDown className="h-3 w-3" />{formatted}</span>;
}

function StatPill({ label, value, unit, previous, icon: Icon }: {
  label: string;
  value: number | null;
  unit: string;
  previous?: number | null;
  icon?: any;
}) {
  if (value == null) return null;
  return (
    <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-primary" />}
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold">{value}</span>
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
      <TrendIndicator current={value} previous={previous ?? null} />
    </div>
  );
}

function EntryCard({ entry, previous, photoUrls, onViewPhotos, onDelete }: {
  entry: BodyProgressEntry;
  previous?: BodyProgressEntry;
  photoUrls: Record<string, string>;
  onViewPhotos: (paths: string[]) => void;
  onDelete: (entry: BodyProgressEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const measurements = [
    { label: 'Weight', value: entry.weight, prev: previous?.weight, unit: 'kg' },
    { label: 'Height', value: (entry as any).height, prev: (previous as any)?.height, unit: 'cm' },
    { label: 'Body Fat', value: entry.body_fat, prev: previous?.body_fat, unit: '%' },
    { label: 'Chest', value: entry.chest, prev: previous?.chest, unit: 'cm' },
    { label: 'Waist', value: entry.waist, prev: previous?.waist, unit: 'cm' },
    { label: 'Hips', value: entry.hips, prev: previous?.hips, unit: 'cm' },
    { label: 'Biceps', value: entry.biceps, prev: previous?.biceps, unit: 'cm' },
    { label: 'Thighs', value: entry.thighs, prev: previous?.thighs, unit: 'cm' },
  ].filter(m => m.value != null);

  const hasPhotos = entry.photo_paths && entry.photo_paths.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">{formatDate(entry.recorded_at)}</p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {entry.weight != null && <span>{entry.weight} kg</span>}
              {entry.body_fat != null && <span>• {entry.body_fat}%</span>}
              {measurements.length > 2 && <span>• +{measurements.length - 2} more</span>}
              {hasPhotos && (
                <span className="flex items-center gap-0.5">
                  <ImageIcon className="h-3 w-3" />
                  {entry.photo_paths!.length}
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Measurements grid */}
          {measurements.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {measurements.map(m => (
                <div key={m.label} className="rounded-lg bg-muted/40 p-2 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold">{m.value}</span>
                    <span className="text-[9px] text-muted-foreground">{m.unit}</span>
                  </div>
                  <TrendIndicator current={m.value!} previous={m.prev ?? null} />
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground italic leading-relaxed">{entry.notes}</p>
            </div>
          )}

          {/* Photos */}
          {hasPhotos && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {entry.photo_paths!.map((path, idx) => (
                <button
                  key={idx}
                  onClick={() => onViewPhotos(entry.photo_paths!)}
                  className="h-20 w-20 rounded-xl overflow-hidden border border-border flex-shrink-0 hover:ring-2 ring-primary transition-all"
                >
                  {photoUrls[path] ? (
                    <img src={photoUrls[path]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-muted flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Delete */}
          <button
            onClick={() => onDelete(entry)}
            className="flex items-center gap-1.5 text-[11px] text-destructive hover:underline"
          >
            <Trash2 className="h-3 w-3" />
            Delete entry
          </button>
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-xl text-[11px]">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function BodyProgressSection({ clientId }: BodyProgressSectionProps) {
  const { data: entries = [], isLoading } = useBodyProgress(clientId);
  const deleteEntry = useDeleteBodyProgress();
  const { toast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[] | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const latest = entries[0];
  const previous = entries[1];

  const chartData = useMemo(() => {
    return [...entries].reverse().map(e => ({
      date: format(parseISO(e.recorded_at), 'dd MMM'),
      Weight: e.weight,
      'Body Fat': e.body_fat,
    }));
  }, [entries]);

  useEffect(() => {
    const loadUrls = async () => {
      const allPaths = entries.flatMap(e => e.photo_paths || []);
      const newUrls: Record<string, string> = {};
      for (const path of allPaths) {
        if (!photoUrls[path]) {
          const url = await getProgressPhotoUrl(path);
          if (url) newUrls[path] = url;
        }
      }
      if (Object.keys(newUrls).length > 0) {
        setPhotoUrls(prev => ({ ...prev, ...newUrls }));
      }
    };
    if (entries.length > 0) loadUrls();
  }, [entries]);

  const handleDelete = async (entry: BodyProgressEntry) => {
    try {
      await deleteEntry.mutateAsync({ id: entry.id, clientId });
      toast({ title: 'Entry deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header — always visible */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-between p-4"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Body Progress
            {entries.length > 0 && (
              <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {entries.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <span
              onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
              className="flex items-center gap-1 text-sm text-primary"
            >
              <Plus className="h-4 w-4" />
              Add
            </span>
            {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                {isLoading ? (
                  <div className="h-20 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <Activity className="h-10 w-10 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No progress entries yet</p>
                    <button onClick={() => setShowAddModal(true)} className="text-sm text-primary hover:underline">
                      Record first entry
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Latest snapshot */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Latest — {formatDate(latest.recorded_at)}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <StatPill label="Weight" value={latest.weight} unit="kg" previous={previous?.weight} icon={Scale} />
                        <StatPill label="Body Fat" value={latest.body_fat} unit="%" previous={previous?.body_fat} icon={Percent} />
                        <StatPill label="Height" value={(latest as any).height} unit="cm" previous={(previous as any)?.height} icon={Ruler} />
                        <StatPill label="Chest" value={latest.chest} unit="cm" previous={previous?.chest} />
                        <StatPill label="Waist" value={latest.waist} unit="cm" previous={previous?.waist} />
                        <StatPill label="Hips" value={latest.hips} unit="cm" previous={previous?.hips} />
                        <StatPill label="Biceps" value={latest.biceps} unit="cm" previous={previous?.biceps} />
                        <StatPill label="Thighs" value={latest.thighs} unit="cm" previous={previous?.thighs} />
                      </div>
                      {/* BMI */}
                      {latest.weight != null && (latest as any).height != null && (() => {
                        const bmi = latest.weight! / (((latest as any).height / 100) ** 2);
                        const bmiVal = Math.round(bmi * 10) / 10;
                        const prevBmi = previous?.weight != null && (previous as any)?.height != null
                          ? Math.round(previous.weight! / (((previous as any).height / 100) ** 2) * 10) / 10
                          : null;
                        const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
                        const color = bmi < 18.5 ? 'text-yellow-500' : bmi < 25 ? 'text-green-500' : bmi < 30 ? 'text-orange-500' : 'text-destructive';
                        return (
                          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/30 border border-border">
                            <div className="flex items-center gap-1.5">
                              <Heart className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-medium text-muted-foreground">BMI</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{bmiVal}</span>
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted ${color}`}>{category}</span>
                              {prevBmi != null && <TrendIndicator current={bmiVal} previous={prevBmi} />}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {latest.notes && (
                      <div className="flex items-start gap-2 bg-muted/30 rounded-xl px-3 py-2.5">
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground italic leading-relaxed">"{latest.notes}"</p>
                      </div>
                    )}

                    {latest.photo_paths && latest.photo_paths.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {latest.photo_paths.map((path, idx) => (
                          <button
                            key={idx}
                            onClick={() => setViewingPhotos(latest.photo_paths)}
                            className="h-20 w-20 rounded-xl overflow-hidden border border-border flex-shrink-0 hover:ring-2 ring-primary transition-all"
                          >
                            {photoUrls[path] ? (
                              <img src={photoUrls[path]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-muted flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {chartData.length >= 2 && (
                      <div className="border-t border-border pt-3 space-y-2">
                        <button
                          onClick={() => setShowChart(!showChart)}
                          className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground"
                        >
                          <span>Weight Trend</span>
                          {showChart ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        {showChart && (
                          <div className="h-36">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="Weight" stroke="hsl(var(--primary))" fill="url(#weightGrad)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--card))', strokeWidth: 2 }} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    )}

                    {entries.length > 1 && (
                      <div className="border-t border-border pt-3 space-y-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          All Entries ({entries.length})
                        </p>
                        <div className="space-y-2 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent">
                          {entries.map((entry, idx) => (
                            <EntryCard
                              key={entry.id}
                              entry={entry}
                              previous={entries[idx + 1]}
                              photoUrls={photoUrls}
                              onViewPhotos={setViewingPhotos}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddBodyProgressModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} clientId={clientId} />

      {viewingPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setViewingPhotos(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20" onClick={() => setViewingPhotos(null)}>
            <X className="h-5 w-5 text-white" />
          </button>
          <div className="flex gap-3 p-4 overflow-x-auto max-w-[90vw]" onClick={e => e.stopPropagation()}>
            {viewingPhotos.map((path, idx) => (
              <div key={idx} className="flex-shrink-0">
                {photoUrls[path] ? (
                  <img src={photoUrls[path]} alt={`Progress ${idx + 1}`} className="max-h-[70vh] rounded-xl border border-white/10" />
                ) : (
                  <div className="h-60 w-48 bg-muted rounded-xl flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
