import { useState } from 'react';
import { X, Camera, Loader2, Scale, Ruler, Percent, StickyNote, CalendarDays, ChevronDown, ChevronUp, Dumbbell, Check, ArrowUpDown, Heart, Zap } from 'lucide-react';
import { useAddBodyProgress, uploadProgressPhoto } from '@/hooks/useBodyProgress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AddBodyProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

type UnitType = 'cm' | 'inch';

function BigField({ icon: Icon, label, value, onChange, placeholder, suffix }: {
  icon: any;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  suffix: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <div className={cn(
      "p-3.5 rounded-xl border transition-all space-y-1.5",
      filled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/40"
    )}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", filled ? "text-primary" : "text-muted-foreground")} />
        <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      </div>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="bg-transparent text-2xl font-bold w-full outline-none placeholder:text-muted-foreground/20"
          placeholder={placeholder}
        />
        <span className="absolute right-0 bottom-1 text-xs text-muted-foreground/40 font-medium">{suffix}</span>
      </div>
    </div>
  );
}

function SmallField({ label, value, onChange, placeholder, unit, filled }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  unit: string;
  filled: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-2.5 transition-all",
      filled ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"
    )}>
      <label className="text-[10px] font-medium text-muted-foreground block mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="bg-transparent text-base font-bold w-full outline-none placeholder:text-muted-foreground/20 pr-7"
          placeholder={placeholder}
        />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40">{unit}</span>
      </div>
    </div>
  );
}

export function AddBodyProgressModal({ isOpen, onClose, clientId }: AddBodyProgressModalProps) {
  const { toast } = useToast();
  const addProgress = useAddBodyProgress();

  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [biceps, setBiceps] = useState('');
  const [thighs, setThighs] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [unit, setUnit] = useState<UnitType>('cm');

  const toCm = (v: string) => {
    if (!v.trim()) return null;
    const num = Number(v);
    return unit === 'inch' ? Math.round(num * 2.54 * 10) / 10 : num;
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 4));
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setRecordedAt(new Date().toISOString().split('T')[0]);
    setWeight(''); setHeight(''); setBodyFat(''); setChest(''); setWaist('');
    setHips(''); setBiceps(''); setThighs(''); setNotes('');
    setPhotos([]); setShowMeasurements(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const photoPaths: string[] = [];
      for (const photo of photos) {
        const path = await uploadProgressPhoto(clientId, photo);
        photoPaths.push(path);
      }

      const toNum = (v: string) => v.trim() ? Number(v) : null;

      await addProgress.mutateAsync({
        client_id: clientId,
        recorded_at: recordedAt,
        weight: toNum(weight),
        height: toCm(height),
        body_fat: toNum(bodyFat),
        chest: toCm(chest),
        waist: toCm(waist),
        hips: toCm(hips),
        biceps: toCm(biceps),
        thighs: toCm(thighs),
        notes: notes.trim() || undefined,
        photo_paths: photoPaths,
      });

      toast({ title: 'Progress entry added' });
      resetForm();
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const measurementFields = [
    { label: 'Height', value: height, onChange: setHeight, placeholderCm: '170', placeholderIn: '67' },
    { label: 'Chest', value: chest, onChange: setChest, placeholderCm: '96', placeholderIn: '38' },
    { label: 'Waist', value: waist, onChange: setWaist, placeholderCm: '82', placeholderIn: '32' },
    { label: 'Hips', value: hips, onChange: setHips, placeholderCm: '95', placeholderIn: '37' },
    { label: 'Biceps', value: biceps, onChange: setBiceps, placeholderCm: '35', placeholderIn: '14' },
    { label: 'Thighs', value: thighs, onChange: setThighs, placeholderCm: '55', placeholderIn: '22' },
  ];
  const filledMeasurements = measurementFields.filter(m => m.value.trim()).length;
  const filledTotal = [weight, bodyFat, ...measurementFields.map(m => m.value)].filter(v => v.trim()).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%', opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="relative w-full sm:max-w-md max-h-[80vh] overflow-y-auto bg-card border border-border rounded-t-2xl sm:rounded-2xl pb-20 sm:pb-5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden sticky top-0 bg-card z-20">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">New Entry</h2>
                <p className="text-[11px] text-muted-foreground">
                  {filledTotal > 0 ? `${filledTotal} field${filledTotal > 1 ? 's' : ''} filled` : 'Track your progress'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all",
                  filledTotal > 0
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-90"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </button>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Date pill */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border">
            <CalendarDays className="h-4 w-4 text-primary shrink-0" />
            <input
              type="date"
              value={recordedAt}
              onChange={e => setRecordedAt(e.target.value)}
              className="bg-transparent text-sm font-medium w-full outline-none"
            />
          </div>

          {/* Primary metrics — Weight & Body Fat */}
          <div className="grid grid-cols-2 gap-3">
            <BigField icon={Scale} label="Weight" value={weight} onChange={setWeight} placeholder="72.5" suffix="kg" />
            <BigField icon={Percent} label="Body Fat" value={bodyFat} onChange={setBodyFat} placeholder="18.0" suffix="%" />
          </div>

          {/* BMI auto-calculation */}
          {weight.trim() && height.trim() && (() => {
            const w = Number(weight);
            const hCm = unit === 'inch' ? Number(height) * 2.54 : Number(height);
            if (w > 0 && hCm > 0) {
              const bmi = w / ((hCm / 100) ** 2);
              const bmiVal = Math.round(bmi * 10) / 10;
              const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
              const color = bmi < 18.5 ? 'text-yellow-500' : bmi < 25 ? 'text-green-500' : bmi < 30 ? 'text-orange-500' : 'text-destructive';
              return (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-2">
                    <Heart className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">BMI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{bmiVal}</span>
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted", color)}>{category}</span>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Body Measurements — Collapsible */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMeasurements(!showMeasurements)}
              className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Body Measurements</span>
                {filledMeasurements > 0 && (
                  <span className="text-[10px] font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                    {filledMeasurements}/{measurementFields.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {showMeasurements && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setUnit(u => u === 'cm' ? 'inch' : 'cm'); }}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg bg-muted/60 border border-border transition-colors"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {unit}
                  </button>
                )}
                {showMeasurements
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </button>
            <AnimatePresence>
              {showMeasurements && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                    {measurementFields.map(m => (
                      <SmallField
                        key={m.label}
                        label={m.label}
                        value={m.value}
                        onChange={m.onChange}
                        placeholder={unit === 'cm' ? m.placeholderCm : m.placeholderIn}
                        unit={unit}
                        filled={m.value.trim().length > 0}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-0.5">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-dark w-full min-h-[52px] resize-none text-sm rounded-xl"
              placeholder="How are you feeling? Any changes to diet or routine..."
              rows={2}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Photos</label>
              </div>
              <span className="text-[10px] text-muted-foreground/50">{photos.length}/4</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {photos.map((file, idx) => (
                <div key={idx} className="relative h-[72px] w-[72px] rounded-xl overflow-hidden border border-border group">
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 active:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="h-[72px] w-[72px] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 active:bg-primary/10 transition-all gap-0.5">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">Add</span>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
