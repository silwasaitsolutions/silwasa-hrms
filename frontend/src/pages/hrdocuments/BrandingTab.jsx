import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Upload, Trash2, ImageOff } from 'lucide-react';
import * as hrApi from '../../api/hrDocuments.js';
import Spinner from '../../components/ui/Spinner.jsx';

function ImageCard({ kind, label, hint, hasImage }) {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let current = null;
    let cancelled = false;
    if (hasImage) {
      hrApi.fetchAssetUrl(kind).then((u) => { if (cancelled) URL.revokeObjectURL(u); else { current = u; setUrl(u); } }).catch(() => setUrl(null));
    } else {
      setUrl(null);
    }
    return () => { cancelled = true; if (current) URL.revokeObjectURL(current); };
  }, [kind, hasImage]);

  const refresh = (data) => queryClient.setQueryData(['hr-settings'], data);
  const uploadMutation = useMutation({ mutationFn: (file) => hrApi.uploadAsset(kind, file), onSuccess: refresh });
  const removeMutation = useMutation({ mutationFn: () => hrApi.removeAsset(kind), onSuccess: refresh });

  const onPick = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) return setError('Please choose a PNG or JPG image');
    if (file.size > 2 * 1024 * 1024) return setError('Image must be 2 MB or smaller');
    setError(null);
    uploadMutation.mutate(file);
  };

  const apiError = uploadMutation.error?.response?.data?.message || removeMutation.error?.response?.data?.message;

  return (
    <div className="card p-5">
      <p className="font-medium text-slate-900">{label}</p>
      <p className="text-xs text-slate-500 mb-3">{hint}</p>
      <div className="h-28 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
        {url ? <img src={url} alt={label} className="max-h-24 max-w-full object-contain" /> : (
          <div className="text-slate-400 text-sm flex items-center gap-2"><ImageOff size={18} /> Not set</div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPick} />
      <div className="flex gap-2 mt-3">
        <button className="btn-secondary" disabled={uploadMutation.isPending} onClick={() => inputRef.current.click()}>
          <Upload size={16} /> {uploadMutation.isPending ? 'Uploading...' : hasImage ? 'Replace' : 'Upload'}
        </button>
        {hasImage && <button className="btn-secondary text-red-600" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate()}><Trash2 size={16} /> Remove</button>}
      </div>
      {(error || apiError) && <p className="text-sm text-red-600 mt-2">{error || apiError}</p>}
    </div>
  );
}

const FIELDS = [
  ['companyName', 'Company name', 'company_name'],
  ['phone', 'Phone', 'phone'],
  ['email', 'Email', 'email'],
  ['website', 'Website', 'website'],
  ['registrationNo', 'Registration / CIN / GST no.', 'registration_no'],
  ['footerText', 'Footer text (printed on every page)', 'footer_text'],
  ['signatoryName', 'Authorized signatory name', 'signatory_name'],
  ['signatoryDesignation', 'Authorized signatory designation', 'signatory_designation'],
  ['currencySymbol', 'Currency symbol (e.g. ₹)', 'currency_symbol'],
  ['currencyWord', 'Currency name for amounts in words', 'currency_word'],
];

export default function BrandingTab() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['hr-settings'], queryFn: hrApi.getSettings });
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm();

  // Reset the form only when the saved TEXT values change (not when just an image is uploaded,
  // which would otherwise wipe edits the admin has typed but not saved yet).
  const textValues = useMemo(() => {
    if (!settings) return null;
    const values = { address: settings.address || '' };
    FIELDS.forEach(([name, , column]) => { values[name] = settings[column] || ''; });
    return values;
  }, [settings]);
  const signature = JSON.stringify(textValues);
  useEffect(() => {
    if (textValues) reset(textValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, reset]);

  const saveMutation = useMutation({
    mutationFn: hrApi.updateSettings,
    onSuccess: (data) => queryClient.setQueryData(['hr-settings'], data),
  });

  if (isLoading) return <Spinner className="mx-auto my-12" />;

  const errMsg = saveMutation.error?.response?.data;
  const message = errMsg?.details?.fieldErrors ? Object.values(errMsg.details.fieldErrors).flat().join(', ') : errMsg?.message;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="card p-5 space-y-4 lg:col-span-2">
        <p className="font-medium text-slate-900">Company details used on every document</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.slice(0, 1).map(([name, label]) => (
            <div key={name} className="sm:col-span-2"><label className="label">{label}</label><input className="input" {...register(name)} /></div>
          ))}
          <div className="sm:col-span-2">
            <label className="label">Address (each line is printed on its own line)</label>
            <textarea className="input" rows={3} {...register('address')} />
          </div>
          {FIELDS.slice(1).map(([name, label]) => (
            <div key={name}><label className="label">{label}</label><input className="input" {...register(name)} /></div>
          ))}
        </div>
        {saveMutation.isError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{message || 'Could not save'}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saveMutation.isPending || !isDirty}>{saveMutation.isPending ? 'Saving...' : 'Save details'}</button>
          {saveMutation.isSuccess && !isDirty && <span className="text-sm text-green-600">Saved</span>}
        </div>
      </form>

      <div className="space-y-6">
        <ImageCard kind="logo" label="Company logo" hint="PNG or JPG, up to 2 MB. Shown at the top-left of the first page." hasImage={!!settings?.has_logo} />
        <ImageCard kind="signature" label="Authorized signature" hint="PNG (transparent background works best) or JPG, up to 2 MB. Printed above the signatory name." hasImage={!!settings?.has_signature} />
      </div>
    </div>
  );
}
