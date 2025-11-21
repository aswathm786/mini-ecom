/**
 * Coupons Page
 * 
 * Admin page for managing discount coupons with full CRUD operations.
 */

import { useState } from 'react';
import { useCoupons, Coupon, CouponType } from '../hooks/useCoupons';
import { useAdminApi } from '../hooks/useAdminApi';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';
import { FiPlus, FiEdit, FiTrash2, FiSave, FiX, FiCheck, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import { formatCurrency } from '../../lib/format';

export function CouponsPage() {
  const { coupons, loading, error, createCoupon, updateCoupon, deleteCoupon, refetch } = useCoupons();
  const api = useAdminApi();
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [enablingFeature, setEnablingFeature] = useState(false);
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    type: 'flat',
    description: '',
    flatAmount: 0,
    percentage: 0,
    maxDiscount: 0,
    buyX: 0,
    getY: 0,
    getYProductId: '',
    firstOrderOnly: false,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    maxUses: undefined,
    maxUsesPerUser: undefined,
    minOrderAmount: 0,
    applicableCategories: [],
    applicableProducts: [],
    excludedProducts: [],
    isActive: true,
  });

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleEnableCoupons = async () => {
    setEnablingFeature(true);
    try {
      await api.patch('/settings/advanced/commerce/coupons', { enabled: true });
      addToast('Coupon feature enabled successfully! Refreshing...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to enable coupon feature', 'error');
      setEnablingFeature(false);
    }
  };

  const handleCreate = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      type: 'flat',
      description: '',
      flatAmount: 0,
      percentage: 0,
      maxDiscount: 0,
      buyX: 0,
      getY: 0,
      getYProductId: '',
      firstOrderOnly: false,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      maxUses: undefined,
      maxUsesPerUser: undefined,
      minOrderAmount: 0,
      applicableCategories: [],
      applicableProducts: [],
      excludedProducts: [],
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      ...coupon,
      validFrom: coupon.validFrom instanceof Date 
        ? coupon.validFrom.toISOString().split('T')[0]
        : new Date(coupon.validFrom).toISOString().split('T')[0],
      validUntil: coupon.validUntil instanceof Date
        ? coupon.validUntil.toISOString().split('T')[0]
        : new Date(coupon.validUntil).toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    const success = await deleteCoupon(id);
    if (success) {
      addToast('Coupon deleted successfully', 'success');
    } else {
      addToast('Failed to delete coupon', 'error');
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.code || formData.code.trim().length < 3) {
      addToast('Coupon code must be at least 3 characters', 'error');
      return;
    }

    if (!formData.validFrom || !formData.validUntil) {
      addToast('Please set validity dates', 'error');
      return;
    }

    if (new Date(formData.validUntil) < new Date(formData.validFrom)) {
      addToast('End date must be after start date', 'error');
      return;
    }

    // Type-specific validation
    if (formData.type === 'flat' && (!formData.flatAmount || formData.flatAmount <= 0)) {
      addToast('Please enter a valid flat discount amount', 'error');
      return;
    }

    if (formData.type === 'percentage' && (!formData.percentage || formData.percentage <= 0 || formData.percentage > 100)) {
      addToast('Please enter a valid percentage (1-100)', 'error');
      return;
    }

    try {
      const couponData: Omit<Coupon, '_id' | 'createdAt' | 'updatedAt'> = {
        code: formData.code.toUpperCase().trim(),
        type: formData.type!,
        description: formData.description,
        validFrom: new Date(formData.validFrom!),
        validUntil: new Date(formData.validUntil!),
        isActive: formData.isActive ?? true,
        ...(formData.type === 'flat' && { flatAmount: formData.flatAmount }),
        ...(formData.type === 'percentage' && {
          percentage: formData.percentage,
          maxDiscount: formData.maxDiscount,
        }),
        ...(formData.type === 'buy_x_get_y' && {
          buyX: formData.buyX,
          getY: formData.getY,
          getYProductId: formData.getYProductId,
        }),
        ...(formData.type === 'first_order' && { firstOrderOnly: true }),
        ...(formData.maxUses && { maxUses: formData.maxUses }),
        ...(formData.maxUsesPerUser && { maxUsesPerUser: formData.maxUsesPerUser }),
        ...(formData.minOrderAmount && { minOrderAmount: formData.minOrderAmount }),
        ...(formData.applicableCategories && formData.applicableCategories.length > 0 && {
          applicableCategories: formData.applicableCategories,
        }),
        ...(formData.applicableProducts && formData.applicableProducts.length > 0 && {
          applicableProducts: formData.applicableProducts,
        }),
        ...(formData.excludedProducts && formData.excludedProducts.length > 0 && {
          excludedProducts: formData.excludedProducts,
        }),
      };

      if (editingCoupon?._id) {
        const updated = await updateCoupon(editingCoupon._id, couponData);
        if (updated) {
          addToast('Coupon updated successfully', 'success');
          setShowModal(false);
        } else {
          addToast('Failed to update coupon', 'error');
        }
      } else {
        const created = await createCoupon(couponData);
        if (created) {
          addToast('Coupon created successfully', 'success');
          setShowModal(false);
        } else {
          addToast('Failed to create coupon', 'error');
        }
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save coupon', 'error');
    }
  };

  const formatDate = (date: string | Date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Check if the error indicates the feature is disabled
  const isFeatureDisabled = error && (error.toLowerCase().includes('feature') || error.toLowerCase().includes('disabled') || error.toLowerCase().includes('forbidden'));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-600 mt-1">Manage discount coupons and promotional codes</p>
        </div>
        <Button variant="primary" onClick={handleCreate} disabled={isFeatureDisabled}>
          <FiPlus className="mr-2" />
          Create Coupon
        </Button>
      </div>

      {isFeatureDisabled && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-lg p-5">
          <div className="flex items-start">
            <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                Coupon Feature Disabled
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                The coupon feature is currently disabled. Enable it to create and manage discount coupons for your store.
              </p>
              <Button 
                variant="primary" 
                onClick={handleEnableCoupons}
                disabled={enablingFeature}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {enablingFeature ? 'Enabling...' : 'Enable Coupon Feature'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && !isFeatureDisabled && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Uses</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No coupons found. Create your first coupon to get started.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{coupon.code}</div>
                    {coupon.description && (
                      <div className="text-xs text-gray-500">{coupon.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {coupon.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coupon.type === 'flat' && coupon.flatAmount && formatCurrency(coupon.flatAmount)}
                    {coupon.type === 'percentage' && coupon.percentage && `${coupon.percentage}%`}
                    {coupon.type === 'buy_x_get_y' && `Buy ${coupon.buyX} Get ${coupon.getY}`}
                    {coupon.type === 'first_order' && 'First Order'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {coupon.maxUses ? `${coupon.maxUses} total` : 'Unlimited'}
                    {coupon.maxUsesPerUser && `, ${coupon.maxUsesPerUser} per user`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {coupon.isActive ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center w-fit">
                        <FiCheck className="mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 flex items-center w-fit">
                        <FiXCircle className="mr-1" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(coupon)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => coupon._id && handleDelete(coupon._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="SAVE20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as CouponType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="flat">Flat Amount</option>
                    <option value="percentage">Percentage</option>
                    <option value="buy_x_get_y">Buy X Get Y</option>
                    <option value="first_order">First Order</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional description"
                />
              </div>

              {/* Type-specific fields */}
              {formData.type === 'flat' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Flat Discount Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.flatAmount || 0}
                    onChange={(e) => setFormData({ ...formData, flatAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              {formData.type === 'percentage' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Percentage (%) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.percentage || 0}
                      onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Discount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.maxDiscount || 0}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {formData.type === 'buy_x_get_y' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Buy X *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.buyX || 0}
                      onChange={(e) => setFormData({ ...formData, buyX: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Get Y *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.getY || 0}
                      onChange={(e) => setFormData({ ...formData, getY: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product ID (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.getYProductId || ''}
                      onChange={(e) => setFormData({ ...formData, getYProductId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Product ID for free item"
                    />
                  </div>
                </div>
              )}

              {/* Validity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Total Uses
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUses || ''}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Uses Per User
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUsesPerUser || ''}
                    onChange={(e) => setFormData({ ...formData, maxUsesPerUser: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minOrderAmount || 0}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave}>
                <FiSave className="mr-2" />
                {editingCoupon ? 'Update' : 'Create'} Coupon
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

