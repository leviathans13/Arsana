import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Upload, Calendar, X, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateIncomingLetter } from '@/hooks/useApi';
import Layout from '@/components/Layout/Layout';
import Link from 'next/link';
import { CreateIncomingLetterRequest, LetterCategory } from '@/types';
import { toast } from 'react-hot-toast';

export default function CreateIncomingLetterPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const createLetterMutation = useCreateIncomingLetter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateIncomingLetterRequest>();

  const isInvitation = watch('isInvitation');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const onSubmit = async (data: CreateIncomingLetterRequest) => {
    try {
      // Proper data formatting for backend
      const formData = {
        ...data,
        // Ensure dates are properly formatted as ISO strings
        receivedDate: new Date(data.receivedDate).toISOString(),
        letterDate: data.letterDate ? new Date(data.letterDate).toISOString() : undefined,
        eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : undefined,
        // Ensure boolean conversion
        isInvitation: Boolean(data.isInvitation),
        // Handle optional fields
        note: data.note || undefined,
        eventTime: data.eventTime || undefined,
        eventLocation: data.eventLocation || undefined,
        eventNotes: data.eventNotes || undefined,
        file: selectedFile || undefined,
      };

      await createLetterMutation.mutateAsync(formData);
      toast.success('Surat masuk berhasil ditambahkan!');
      router.push('/letters/incoming');
    } catch (error) {
      console.error('Failed to create letter:', error);
      toast.error('Gagal membuat surat masuk. Silakan coba lagi.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/letters/incoming"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="section-title">Tambah Surat Masuk</h1>
            <p className="section-description">Masukkan informasi surat masuk baru</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="card p-6 animate-slide-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary-600" />
              Informasi Surat
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label form-label-required">
                  Nomor Surat
                </label>
                <input
                  {...register('letterNumber', { 
                    required: 'Nomor surat wajib diisi',
                    minLength: { value: 3, message: 'Nomor surat minimal 3 karakter' }
                  })}
                  type="text"
                  className={`input ${errors.letterNumber ? 'input-error' : ''}`}
                  placeholder="Contoh: 001/SK/2024"
                />
                {errors.letterNumber && (
                  <p className="form-error">{errors.letterNumber.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Kategori
                </label>
                <select
                  {...register('category')}
                  className="input"
                  defaultValue="GENERAL"
                >
                  <option value="GENERAL">Umum</option>
                  <option value="INVITATION">Undangan</option>
                  <option value="OFFICIAL">Resmi</option>
                  <option value="ANNOUNCEMENT">Pengumuman</option>
                </select>
              </div>

              <div className="md:col-span-2 form-group">
                <label className="form-label form-label-required">
                  Subjek Surat
                </label>
                <input
                  {...register('subject', { 
                    required: 'Subjek wajib diisi',
                    minLength: { value: 5, message: 'Subjek minimal 5 karakter' }
                  })}
                  type="text"
                  className={`input ${errors.subject ? 'input-error' : ''}`}
                  placeholder="Masukkan subjek surat"
                />
                {errors.subject && (
                  <p className="form-error">{errors.subject.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">
                  Pengirim
                </label>
                <input
                  {...register('sender', { 
                    required: 'Pengirim wajib diisi',
                    minLength: { value: 2, message: 'Nama pengirim minimal 2 karakter' }
                  })}
                  type="text"
                  className={`input ${errors.sender ? 'input-error' : ''}`}
                  placeholder="Nama pengirim atau instansi"
                />
                {errors.sender && (
                  <p className="form-error">{errors.sender.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">
                  Tanggal Diterima
                </label>
                <input
                  {...register('receivedDate', { 
                    required: 'Tanggal diterima wajib diisi',
                    validate: (value) => {
                      const date = new Date(value);
                      const now = new Date();
                      if (date > now) {
                        return 'Tanggal tidak boleh di masa depan';
                      }
                      return true;
                    }
                  })}
                  type="datetime-local"
                  className={`input ${errors.receivedDate ? 'input-error' : ''}`}
                  max={new Date().toISOString().slice(0, 16)}
                />
                {errors.receivedDate && (
                  <p className="form-error">{errors.receivedDate.message}</p>
                )}
              </div>

              <div className="md:col-span-2 form-group">
                <label className="form-label">
                  Deskripsi
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="input"
                  placeholder="Masukkan deskripsi tambahan (opsional)"
                />
              </div>
            </div>
          </div>

          {/* Invitation Section */}
          <div className="card p-6 animate-slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center mb-6">
              <input
                {...register('isInvitation')}
                type="checkbox"
                id="isInvitation"
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="isInvitation" className="ml-3 text-sm font-medium text-gray-700">
                Ini adalah undangan/acara
              </label>
            </div>

            {isInvitation && (
              <div className="space-y-6 border-t pt-6 animate-fade-in">
                <h3 className="text-md font-semibold text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                  Detail Acara
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label className="form-label">
                      Tanggal & Waktu Acara
                    </label>
                    <input
                      {...register('eventDate', {
                        validate: (value) => {
                          if (isInvitation && !value) {
                            return 'Tanggal acara wajib diisi untuk undangan';
                          }
                          if (value) {
                            const eventDate = new Date(value);
                            const receivedDate = new Date(watch('receivedDate'));
                            if (eventDate <= receivedDate) {
                              return 'Tanggal acara harus setelah tanggal diterima';
                            }
                          }
                          return true;
                        }
                      })}
                      type="datetime-local"
                      className={`input ${errors.eventDate ? 'input-error' : ''}`}
                    />
                    {errors.eventDate && (
                      <p className="form-error">{errors.eventDate.message}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Lokasi Acara
                    </label>
                    <input
                      {...register('eventLocation')}
                      type="text"
                      className="input"
                      placeholder="Masukkan lokasi acara"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* File Upload Section */}
          <div className="card p-6 animate-slide-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Upload className="h-5 w-5 mr-2 text-primary-600" />
              File Lampiran
            </h2>
            
            {!selectedFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 hover:bg-primary-50 transition-all duration-200">
                <input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <label
                  htmlFor="file"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="h-16 w-16 text-gray-400 mb-4" />
                  <span className="text-lg font-medium text-gray-900 mb-2">
                    Klik untuk mengunggah file
                  </span>
                  <span className="text-sm text-gray-500">
                    atau seret dan lepas file di sini
                  </span>
                  <span className="text-xs text-gray-400 mt-2">
                    PDF, DOC, DOCX, JPG, JPEG, PNG (maksimal 10MB)
                  </span>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-success-50 to-success-100 rounded-xl border border-success-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-success-200 rounded-lg flex items-center justify-center">
                      <Upload className="h-6 w-6 text-success-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-danger-600 hover:text-danger-800 p-2 hover:bg-white rounded-lg transition-colors"
                  title="Hapus file"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 animate-slide-in" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/letters/incoming"
              className="btn btn-secondary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Batal
            </Link>
            <button
              type="submit"
              disabled={createLetterMutation.isLoading}
              className="btn btn-primary"
            >
              {createLetterMutation.isLoading ? (
                <>
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Simpan Surat
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}