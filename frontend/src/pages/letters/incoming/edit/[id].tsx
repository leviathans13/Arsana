import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Upload, Calendar, X, FileText, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIncomingLetter, useUpdateIncomingLetter } from '@/hooks/useApi';
import Layout from '@/components/Layout/Layout';
import Link from 'next/link';
import { CreateIncomingLetterRequest, LetterCategory } from '@/types';
import { toast } from 'react-hot-toast';

export default function EditIncomingLetterPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch existing letter data
  const { data: letterData, isLoading: fetchingLetter, error: fetchError } = useIncomingLetter(id as string);
  const updateLetterMutation = useUpdateIncomingLetter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateIncomingLetterRequest>();

  const isInvitation = watch('isInvitation');

  // Populate form with existing data
  useEffect(() => {
    if (letterData && letterData.data) {
      const letter = letterData.data;
      reset({
        letterNumber: letter.letterNumber,
        letterDate: letter.letterDate ? new Date(letter.letterDate).toISOString().split('T')[0] : '',
        letterNature: letter.letterNature || 'BIASA',
        subject: letter.subject,
        sender: letter.sender,
        recipient: letter.recipient,
        processor: letter.processor,
        note: letter.note || '',
        receivedDate: new Date(letter.receivedDate).toISOString().split('T')[0],
        isInvitation: letter.isInvitation,
        eventDate: letter.eventDate ? new Date(letter.eventDate).toISOString().split('T')[0] : '',
        eventTime: letter.eventTime || '',
        eventLocation: letter.eventLocation || '',
        eventNotes: letter.eventNotes || '',
      });
    }
  }, [letterData, reset]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const onSubmit = async (data: CreateIncomingLetterRequest) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Proper data formatting for backend
      const formData = {
        ...data,
        // Ensure dates are properly formatted as ISO strings
        receivedDate: new Date(data.receivedDate).toISOString(),
        letterDate: data.letterDate ? new Date(data.letterDate).toISOString() : undefined,
        eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : undefined,
        // Ensure boolean conversion
        isInvitation: Boolean(data.isInvitation),
        // Handle optional fields properly
        note: data.note || undefined,
        eventTime: data.eventTime || undefined,
        eventLocation: data.eventLocation || undefined,
        eventNotes: data.eventNotes || undefined,
        // Ensure required fields for invitation
        ...(data.isInvitation && !data.eventDate && { eventDate: undefined }),
        file: selectedFile || undefined,
      };

      await updateLetterMutation.mutateAsync({ 
        id: id as string, 
        data: formData 
      });
      
      toast.success('Surat masuk berhasil diperbarui');
      router.push(`/letters/incoming/${id}`);
    } catch (error) {
      console.error('Error updating letter:', error);
      toast.error('Gagal memperbarui surat masuk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Hanya file PDF, DOC, dan DOCX yang diperbolehkan');
        event.target.value = '';
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        event.target.value = '';
        return;
      }
      
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

  if (loading || fetchingLetter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Memuat data surat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (fetchError || !letterData?.data) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Data Tidak Ditemukan</h2>
            <p className="text-red-600 mb-4">Surat yang Anda cari tidak ditemukan atau telah dihapus.</p>
            <Link 
              href="/letters/incoming" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daftar Surat
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href={`/letters/incoming/${id}`}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Surat Masuk</h1>
                <p className="text-sm text-gray-600">
                  Perbarui informasi surat masuk #{letterData.data.letterNumber}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Informasi Dasar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Letter Number */}
              <div>
                <label htmlFor="letterNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Surat *
                </label>
                <input
                  type="text"
                  id="letterNumber"
                  {...register('letterNumber', { 
                    required: 'Nomor surat harus diisi',
                    minLength: { value: 3, message: 'Nomor surat minimal 3 karakter' }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.letterNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Contoh: 001/SK/2024"
                />
                {errors.letterNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.letterNumber.message}</p>
                )}
              </div>

              {/* Received Date */}
              <div>
                <label htmlFor="receivedDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Diterima *
                </label>
                <input
                  type="date"
                  id="receivedDate"
                  {...register('receivedDate', { required: 'Tanggal diterima harus diisi' })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.receivedDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.receivedDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.receivedDate.message}</p>
                )}
              </div>

              {/* Letter Date */}
              <div>
                <label htmlFor="letterDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Surat
                </label>
                <input
                  type="date"
                  id="letterDate"
                  {...register('letterDate')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Letter Nature */}
              <div>
                <label htmlFor="letterNature" className="block text-sm font-medium text-gray-700 mb-2">
                  Sifat Surat
                </label>
                <select
                  id="letterNature"
                  {...register('letterNature')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="BIASA">Biasa</option>
                  <option value="TERBATAS">Terbatas</option>
                  <option value="RAHASIA">Rahasia</option>
                  <option value="SANGAT_RAHASIA">Sangat Rahasia</option>
                  <option value="PENTING">Penting</option>
                </select>
              </div>

              {/* Subject */}
              <div className="md:col-span-2">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subjek/Perihal *
                </label>
                <input
                  type="text"
                  id="subject"
                  {...register('subject', { 
                    required: 'Subjek surat harus diisi',
                    minLength: { value: 5, message: 'Subjek minimal 5 karakter' }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.subject ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Masukkan subjek atau perihal surat"
                />
                {errors.subject && (
                  <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
                )}
              </div>

              {/* Sender */}
              <div>
                <label htmlFor="sender" className="block text-sm font-medium text-gray-700 mb-2">
                  Pengirim *
                </label>
                <input
                  type="text"
                  id="sender"
                  {...register('sender', { 
                    required: 'Pengirim harus diisi',
                    minLength: { value: 2, message: 'Nama pengirim minimal 2 karakter' }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.sender ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Nama pengirim surat"
                />
                {errors.sender && (
                  <p className="mt-1 text-sm text-red-600">{errors.sender.message}</p>
                )}
              </div>

              {/* Recipient */}
              <div>
                <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
                  Penerima *
                </label>
                <input
                  type="text"
                  id="recipient"
                  {...register('recipient', { 
                    required: 'Penerima harus diisi',
                    minLength: { value: 2, message: 'Nama penerima minimal 2 karakter' }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.recipient ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Nama penerima surat"
                />
                {errors.recipient && (
                  <p className="mt-1 text-sm text-red-600">{errors.recipient.message}</p>
                )}
              </div>

              {/* Processor */}
              <div>
                <label htmlFor="processor" className="block text-sm font-medium text-gray-700 mb-2">
                  Pengolah *
                </label>
                <input
                  type="text"
                  id="processor"
                  {...register('processor', { 
                    required: 'Pengolah harus diisi',
                    minLength: { value: 2, message: 'Nama pengolah minimal 2 karakter' }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.processor ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Nama pengolah surat"
                />
                {errors.processor && (
                  <p className="mt-1 text-sm text-red-600">{errors.processor.message}</p>
                )}
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  id="note"
                  rows={3}
                  {...register('note')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                  placeholder="Tambahkan catatan tambahan (opsional)"
                />
              </div>
            </div>
          </div>

          {/* Invitation Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Detail Acara (Jika Undangan)</h2>
            </div>
            
            <div className="space-y-4">
              {/* Is Invitation Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isInvitation"
                  {...register('isInvitation')}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <label htmlFor="isInvitation" className="ml-2 block text-sm text-gray-700">
                  Surat ini berisi undangan acara
                </label>
              </div>

              {/* Event details - only show if it's an invitation */}
              {isInvitation && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Acara *
                    </label>
                    <input
                      type="date"
                      id="eventDate"
                      {...register('eventDate', {
                        required: isInvitation ? 'Tanggal acara harus diisi untuk undangan' : false
                      })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                        errors.eventDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors.eventDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.eventDate.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="eventTime" className="block text-sm font-medium text-gray-700 mb-2">
                      Waktu Acara
                    </label>
                    <input
                      type="time"
                      id="eventTime"
                      {...register('eventTime')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="eventLocation" className="block text-sm font-medium text-gray-700 mb-2">
                      Lokasi Acara
                    </label>
                    <input
                      type="text"
                      id="eventLocation"
                      {...register('eventLocation')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Lokasi atau tempat acara"
                    />
                  </div>

                  <div>
                    <label htmlFor="eventNotes" className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan Acara
                    </label>
                    <textarea
                      id="eventNotes"
                      rows={3}
                      {...register('eventNotes')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                      placeholder="Catatan tambahan untuk acara (opsional)"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">File Dokumen</h2>
            </div>
            
            <div className="space-y-4">
              {/* Current file */}
              {letterData.data.fileName && !selectedFile && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{letterData.data.fileName}</p>
                        <p className="text-xs text-gray-500">File saat ini</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* File input */}
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                  {letterData.data.fileName ? 'Ganti File Dokumen' : 'Upload File Dokumen'} (Opsional)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Klik untuk upload</span> atau drag dan drop
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX (Max. 10MB)</p>
                    </div>
                    <input
                      id="file"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              {/* Selected file preview */}
              {selectedFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                        <p className="text-xs text-blue-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-end gap-3">
              <Link
                href={`/letters/incoming/${id}`}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}