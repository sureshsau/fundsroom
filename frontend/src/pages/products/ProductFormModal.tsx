import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle, Plus, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { productsApi, stockTypesApi } from '../../api';
import type { StockType, Product } from '../../types';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  sku: z.string().min(1, 'SKU required'),
  stockTypeId: z.string().optional(),
  category: z.string().optional(),
  unitPrice: z.coerce.number().min(0, 'Price must be non-negative'),
  currentStock: z.coerce.number().int().min(0),
  minimumStock: z.coerce.number().int().min(0),
  warehouseLocation: z.string().optional(),
});

type Form = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  product?: Partial<Product>;
}

export const ProductFormModal: React.FC<Props> = ({ onClose, onSuccess, product }) => {
  const isEdit = !!product?.id;
  const [stockTypes, setStockTypes] = useState<StockType[]>([]);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [addingType, setAddingType] = useState(false);

  const [imageUrl, setImageUrl] = useState<string>(product?.imageUrl || '');
  const [uploadingImage, setUploadingImage] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name || '',
      sku: product?.sku || '',
      stockTypeId: product?.stockTypeId || '',
      category: product?.category || '',
      unitPrice: product?.unitPrice || 0,
      currentStock: product?.currentStock || 0,
      minimumStock: product?.minimumStock || 0,
      warehouseLocation: product?.warehouseLocation || '',
    },
  });

  useEffect(() => {
    fetchStockTypes();
  }, []);

  const fetchStockTypes = async () => {
    try {
      const res = await stockTypesApi.list();
      setStockTypes(res.data.data || []);
    } catch {
      toast.error('Failed to load stock types');
    }
  };

  const handleCreateStockType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    try {
      setAddingType(true);
      const res = await stockTypesApi.create({ name: newTypeName.trim() });
      const created = res.data.data;
      toast.success(`Stock type "${created.name}" created!`);
      setStockTypes(prev => [...prev, created]);
      setValue('stockTypeId', created.id);
      setValue('category', created.name);
      setNewTypeName('');
      setShowAddType(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create stock type');
    } finally {
      setAddingType(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const res = await productsApi.uploadImage(file);
      const uploadedUrl = res.data.data.imageUrl;
      setImageUrl(uploadedUrl);
      toast.success('Picture uploaded to Cloudinary!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
  };

  const onSubmit = async (data: Form) => {
    try {
      const selectedType = stockTypes.find(t => t.id === data.stockTypeId);
      const payload = {
        ...data,
        stockTypeId: data.stockTypeId || null,
        category: selectedType ? selectedType.name : data.category,
        imageUrl: imageUrl || null,
      };

      if (isEdit && product?.id) {
        await productsApi.update(product.id, payload as Record<string, unknown>);
        toast.success('Product updated successfully!');
      } else {
        await productsApi.create(payload as Record<string, unknown>);
        toast.success('Product created successfully!');
      }
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Stock Item' : 'Add New Stock Item'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Picture Upload to Cloudinary */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Stock Item Picture (Cloudinary)</label>
            {imageUrl ? (
              <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                <img
                  src={imageUrl}
                  alt="Stock Preview"
                  style={{
                    width: '100%',
                    maxHeight: '180px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #e2e8f0)',
                  }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="btn btn-secondary btn-icon"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                    color: '#fff',
                  }}
                  title="Remove Picture"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.5rem',
                  border: '2px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  cursor: uploadingImage ? 'not-allowed' : 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  transition: 'all 0.2s',
                }}
              >
                {uploadingImage ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8' }}>
                    <Loader2 size={24} className="animate-spin" />
                    <span>Uploading to Cloudinary...</span>
                  </div>
                ) : (
                  <>
                    <ImageIcon size={32} style={{ color: '#818cf8', marginBottom: '8px' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
                      Click to upload stock picture
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                      Supports PNG, JPG, WEBP (Max 5MB)
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Stock Item Name</label>
              <input {...register('name')} className={`form-input ${errors.name ? 'error' : ''}`} placeholder="e.g. Mechanical Keyboard" />
              {errors.name && <div className="form-error"><AlertCircle size={12} />{errors.name.message}</div>}
            </div>
            <div className="form-group">
              <label className="form-label required">SKU / Code</label>
              <input {...register('sku')} className={`form-input ${errors.sku ? 'error' : ''}`} placeholder="e.g. KB-MECH-001" />
              {errors.sku && <div className="form-error"><AlertCircle size={12} />{errors.sku.message}</div>}
            </div>
          </div>

          {/* Dynamic Stock Type Selection */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Dynamic Stock Type</label>
              <button
                type="button"
                onClick={() => setShowAddType(!showAddType)}
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Add New Type
              </button>
            </div>

            {showAddType ? (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  className="form-input"
                  placeholder="Enter custom stock type name..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateStockType}
                  disabled={addingType || !newTypeName.trim()}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {addingType ? 'Adding...' : 'Save Type'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddType(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <select {...register('stockTypeId')} className="form-input">
                <option value="">-- Select Dynamic Stock Type --</option>
                {stockTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Unit Price (₹)</label>
              <input {...register('unitPrice')} type="number" step="0.01" className={`form-input ${errors.unitPrice ? 'error' : ''}`} placeholder="1200" />
              {errors.unitPrice && <div className="form-error"><AlertCircle size={12} />{errors.unitPrice.message}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse Location</label>
              <input {...register('warehouseLocation')} className="form-input" placeholder="e.g. Rack A-01" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Current Stock</label>
              <input {...register('currentStock')} type="number" className="form-input" placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Minimum Stock Alert</label>
              <input {...register('minimumStock')} type="number" className="form-input" placeholder="10" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isSubmitting || uploadingImage} className="btn btn-primary">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Stock Item' : 'Add Stock Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
