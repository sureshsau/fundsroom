import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle } from 'lucide-react';
import { customersApi } from '../../api';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  mobile: z.string().min(10, 'Valid mobile required'),
  email: z.string().email().optional().or(z.literal('')),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  address: z.string().optional(),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
});

type Form = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  customer?: Partial<Form> & { id?: string };
}

export const CustomerFormModal: React.FC<Props> = ({ onClose, onSuccess, customer }) => {
  const isEdit = !!customer?.id;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: customer?.name || '',
      mobile: customer?.mobile || '',
      email: customer?.email || '',
      businessName: customer?.businessName || '',
      gstNumber: customer?.gstNumber || '',
      customerType: customer?.customerType || 'RETAIL',
      address: customer?.address || '',
      status: customer?.status || 'LEAD',
      notes: customer?.notes || '',
      followUpDate: customer?.followUpDate ? customer.followUpDate.split('T')[0] : '',
    },
  });

  const onSubmit = async (data: Form) => {
    if (isEdit && customer?.id) {
      await customersApi.update(customer.id, data as Record<string, unknown>);
    } else {
      await customersApi.create(data as Record<string, unknown>);
    }
    onSuccess();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Full Name</label>
              <input {...register('name')} className={`form-input ${errors.name ? 'error' : ''}`} placeholder="Rajesh Verma" />
              {errors.name && <div className="form-error"><AlertCircle size={12} />{errors.name.message}</div>}
            </div>
            <div className="form-group">
              <label className="form-label required">Mobile</label>
              <input {...register('mobile')} className={`form-input ${errors.mobile ? 'error' : ''}`} placeholder="9876543210" />
              {errors.mobile && <div className="form-error"><AlertCircle size={12} />{errors.mobile.message}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input {...register('email')} type="email" className="form-input" placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input {...register('businessName')} className="form-input" placeholder="ABC Traders" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Customer Type</label>
              <select {...register('customerType')} className="form-select">
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Status</label>
              <select {...register('status')} className="form-select">
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">GST Number</label>
              <input {...register('gstNumber')} className="form-input" placeholder="27AABCT1234A1Z5" />
            </div>
            <div className="form-group">
              <label className="form-label">Follow-up Date</label>
              <input {...register('followUpDate')} type="date" className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input {...register('address')} className="form-input" placeholder="12, Industrial Area, Mumbai" />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-input" rows={3} placeholder="Any notes about this customer..." style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
