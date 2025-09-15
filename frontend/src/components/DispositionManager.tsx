import React, { useState } from 'react';
import { Plus, Edit, Trash2, FileText, User, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

interface Disposition {
  id: string;
  dispositionTo: string;
  notes?: string;
  createdAt: string;
  incomingLetter: {
    id: string;
    letterNumber: string;
    subject: string;
  };
}

interface DispositionManagerProps {
  incomingLetterId: string;
  letterNumber: string;
  letterSubject: string;
  onDispositionChange?: () => void;
}

const DISPOSITION_OPTIONS = [
  { value: 'UMPEG', label: 'UMPEG' },
  { value: 'PERENCANAAN', label: 'Perencanaan' },
  { value: 'KAUR_KEUANGAN', label: 'Kaur Keuangan' },
  { value: 'KABID', label: 'KABID' },
  { value: 'BIDANG1', label: 'Bidang 1' },
  { value: 'BIDANG2', label: 'Bidang 2' },
  { value: 'BIDANG3', label: 'Bidang 3' },
  { value: 'BIDANG4', label: 'Bidang 4' },
  { value: 'BIDANG5', label: 'Bidang 5' },
];

const DispositionManager: React.FC<DispositionManagerProps> = ({
  incomingLetterId,
  letterNumber,
  letterSubject,
  onDispositionChange
}) => {
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDisposition, setEditingDisposition] = useState<Disposition | null>(null);
  const [formData, setFormData] = useState({
    dispositionTo: '',
    notes: ''
  });
  const { isAuthenticated } = useAuth();
  const token = Cookies.get('authToken');

  // Load dispositions for this letter
  React.useEffect(() => {
    if (token && incomingLetterId) {
      loadDispositions();
    }
  }, [token, incomingLetterId]);

  const loadDispositions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dispositions?incomingLetterId=${incomingLetterId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDispositions(data);
      }
    } catch (error) {
      console.error('Error loading dispositions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dispositionTo) {
      toast.error('Pilih tujuan disposisi');
      return;
    }

    try {
      setLoading(true);
      const method = editingDisposition ? 'PUT' : 'POST';
      const url = editingDisposition 
        ? `/api/dispositions/${editingDisposition.id}`
        : '/api/dispositions';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          ...(editingDisposition ? {} : { incomingLetterId })
        }),
      });

      if (response.ok) {
        toast.success(editingDisposition ? 'Disposisi berhasil diperbarui' : 'Disposisi berhasil dibuat');
        resetForm();
        loadDispositions();
        onDispositionChange?.();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal menyimpan disposisi');
      }
    } catch (error) {
      console.error('Error saving disposition:', error);
      toast.error('Gagal menyimpan disposisi');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (disposition: Disposition) => {
    setEditingDisposition(disposition);
    setFormData({
      dispositionTo: disposition.dispositionTo,
      notes: disposition.notes || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (dispositionId: string) => {
    if (!confirm('Yakin ingin menghapus disposisi ini?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/dispositions/${dispositionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Disposisi berhasil dihapus');
        loadDispositions();
        onDispositionChange?.();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Gagal menghapus disposisi');
      }
    } catch (error) {
      console.error('Error deleting disposition:', error);
      toast.error('Gagal menghapus disposisi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ dispositionTo: '', notes: '' });
    setEditingDisposition(null);
    setShowCreateForm(false);
  };

  const getDispositionLabel = (value: string) => {
    const option = DISPOSITION_OPTIONS.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Disposisi Surat</h3>
              <p className="text-sm text-gray-600">#{letterNumber} - {letterSubject}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Disposisi
          </button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-4">
              {editingDisposition ? 'Edit Disposisi' : 'Tambah Disposisi Baru'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="dispositionTo" className="block text-sm font-medium text-gray-700 mb-2">
                  Tujuan Disposisi *
                </label>
                <select
                  id="dispositionTo"
                  value={formData.dispositionTo}
                  onChange={(e) => setFormData({ ...formData, dispositionTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  required
                >
                  <option value="">Pilih tujuan disposisi...</option>
                  {DISPOSITION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                  placeholder="Tambahkan catatan untuk disposisi (opsional)"
                  maxLength={1000}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      {editingDisposition ? 'Perbarui' : 'Simpan'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Dispositions List */}
        <div className="space-y-3">
          {loading && dispositions.length === 0 ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Memuat disposisi...</p>
            </div>
          ) : dispositions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada disposisi untuk surat ini</p>
              <p className="text-sm text-gray-500 mt-1">Klik "Tambah Disposisi" untuk membuat disposisi baru</p>
            </div>
          ) : (
            dispositions.map((disposition) => (
              <div key={disposition.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-indigo-600 mr-2" />
                      <span className="font-medium text-gray-900">
                        {getDispositionLabel(disposition.dispositionTo)}
                      </span>
                    </div>
                    
                    {disposition.notes && (
                      <div className="flex items-start mb-2">
                        <MessageSquare className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{disposition.notes}</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Dibuat: {new Date(disposition.createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(disposition)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit disposisi"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(disposition.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus disposisi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DispositionManager;