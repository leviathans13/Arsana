import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Upload, Calendar, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateOutgoingLetter } from '@/hooks/useApi';
import Layout from '@/components/Layout/Layout';
import Link from 'next/link';
import { CreateOutgoingLetterRequest } from '@/types';

export default function CreateOutgoingLetterPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const createLetterMutation = useCreateOutgoingLetter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateOutgoingLetterRequest>();

  const isInvitation = watch('isInvitation');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const onSubmit = async (data: CreateOutgoingLetterRequest) => {
    try {
      const formData = {
        ...data,
        // Convert datetime-local input to ISO string
        sentDate: new Date(data.sentDate).toISOString(),
        // Convert event date if it exists
        eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : undefined,
        // Convert checkbox string to boolean
        isInvitation: Boolean(data.isInvitation),
        file: selectedFile || undefined,
      };

      await createLetterMutation.mutateAsync(formData);
      router.push('/letters/outgoing');
    } catch (error) {
      console.error('Failed to create letter:', error);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/letters/outgoing"
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tambah Surat Keluar</h1>
            <p className="text-gray-600">Masukkan informasi surat keluar baru</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Informasi Surat
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Surat <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('letterNumber', { required: 'Nomor surat wajib diisi' })}
                  type="text"
                  className="input"
                  placeholder="Masukkan nomor surat"
                />
                {errors.letterNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.letterNumber.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  {...register('category')}
                  className="input"
                >
                  <option value="GENERAL">Umum</option>
                  <option value="INVITATION">Undangan</option>
                  <option value="OFFICIAL">Resmi</option>
                  <option value="ANNOUNCEMENT">Pengumuman</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subjek <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('subject', { required: 'Subjek wajib diisi' })}
                  type="text"
                  className="input"
                  placeholder="Masukkan subjek surat"
                />
                {errors.subject && (
                  <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Penerima <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('recipient', { required: 'Penerima wajib diisi' })}
                  type="text"
                  className="input"
                  placeholder="Masukkan nama penerima"
                />
                {errors.recipient && (
                  <p className="mt-1 text-sm text-red-600">{errors.recipient.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Dikirim <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('sentDate', { required: 'Tanggal dikirim wajib diisi' })}
                  type="datetime-local"
                  className="input"
                />
                {errors.sentDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.sentDate.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <input
                {...register('isInvitation')}
                type="checkbox"
                id="isInvitation"
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="isInvitation" className="ml-2 text-sm font-medium text-gray-700">
                Ini adalah undangan/acara
              </label>
            </div>

            {isInvitation && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-md font-medium text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Detail Acara
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal & Waktu Acara
                    </label>
                    <input
                      {...register('eventDate')}
                      type="datetime-local"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              File Lampiran
            </h2>
            
            {!selectedFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
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
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <span className="text-sm font-medium text-gray-900">
                    Klik untuk mengunggah file
                  </span>
                  <span className="text-sm text-gray-500 mt-1">
                    PDF, DOC, DOCX, JPG, JPEG, PNG (maks. 10MB)
                  </span>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/letters/outgoing"
              className="btn btn-secondary"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={createLetterMutation.isLoading}
              className="btn btn-primary"
            >
              {createLetterMutation.isLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}