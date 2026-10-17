import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LocateFixed, ExternalLink } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import * as officesApi from '../../api/offices.js';
import { getCurrentPosition, mapLink } from '../../utils/geolocation.js';

export const MIN_RADIUS = 150;
export const MAX_RADIUS = 400;

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  address: z.string().optional(),
  latitude: z.coerce.number({ invalid_type_error: 'Enter a latitude' }).min(-90, 'Between -90 and 90').max(90, 'Between -90 and 90'),
  longitude: z.coerce.number({ invalid_type_error: 'Enter a longitude' }).min(-180, 'Between -180 and 180').max(180, 'Between -180 and 180'),
  radiusM: z.coerce.number().int('Whole metres only').min(MIN_RADIUS, `Minimum ${MIN_RADIUS} m`).max(MAX_RADIUS, `Maximum ${MAX_RADIUS} m`),
  isActive: z.boolean(),
});

export default function OfficeFormModal({ open, onClose, office }) {
  const isEdit = !!office;
  const queryClient = useQueryClient();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setLocError(null);
    reset(
      office
        ? {
            name: office.name, address: office.address || '',
            latitude: office.latitude, longitude: office.longitude,
            radiusM: office.radius_m, isActive: office.is_active,
          }
        : { name: '', address: '', latitude: '', longitude: '', radiusM: 200, isActive: true }
    );
  }, [open, office, reset]);

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? officesApi.updateOffice(office.id, payload) : officesApi.createOffice(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      onClose();
    },
  });

  const useMyLocation = async () => {
    setLocating(true);
    setLocError(null);
    try {
      const pos = await getCurrentPosition();
      setValue('latitude', Number(pos.latitude.toFixed(6)), { shouldValidate: true });
      setValue('longitude', Number(pos.longitude.toFixed(6)), { shouldValidate: true });
    } catch (err) {
      setLocError(err.message);
    } finally {
      setLocating(false);
    }
  };

  const lat = watch('latitude');
  const lng = watch('longitude');
  const hasCoords = lat !== '' && lng !== '' && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Office' : 'Add Office'}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div>
          <label className="label">Office name</label>
          <input className="input" placeholder="e.g. Head Office" {...register('name')} />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Address (optional)</label>
          <input className="input" {...register('address')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Latitude</label>
            <input className="input" inputMode="decimal" placeholder="28.613900" {...register('latitude')} />
            {errors.latitude && <p className="text-xs text-red-600 mt-1">{errors.latitude.message}</p>}
          </div>
          <div>
            <label className="label">Longitude</label>
            <input className="input" inputMode="decimal" placeholder="77.209000" {...register('longitude')} />
            {errors.longitude && <p className="text-xs text-red-600 mt-1">{errors.longitude.message}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary" onClick={useMyLocation} disabled={locating}>
            <LocateFixed size={16} /> {locating ? 'Locating...' : 'Use my current location'}
          </button>
          {hasCoords && (
            <a href={mapLink(lat, lng)} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1">
              Check on map <ExternalLink size={14} />
            </a>
          )}
        </div>
        {locError && <p className="text-sm text-red-600">{locError}</p>}
        <p className="text-xs text-slate-500 -mt-2">
          Tip: stand at the office entrance and use "Use my current location", or copy coordinates from Google Maps (right-click → first line).
        </p>

        <div>
          <label className="label">Allowed radius (metres)</label>
          <input type="number" className="input" min={MIN_RADIUS} max={MAX_RADIUS} {...register('radiusM')} />
          <p className="text-xs text-slate-500 mt-1">Employees must be within this distance to check in or out ({MIN_RADIUS}–{MAX_RADIUS} m).</p>
          {errors.radiusM && <p className="text-xs text-red-600 mt-1">{errors.radiusM.message}</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isActive')} /> Active (inactive offices cannot be used for check-in)
        </label>

        {mutation.isError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {mutation.error?.response?.data?.details?.fieldErrors
              ? Object.values(mutation.error.response.data.details.fieldErrors).flat().join(', ')
              : mutation.error?.response?.data?.message || 'Something went wrong'}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Office'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
