import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Download, 
  Calendar,
  Send,
  User,
  Tag,
  MapPin,
  Clock,
  AlertTriangle,
  Info,
  FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOutgoingLetter, useDeleteOutgoingLetter } from '@/hooks/useApi';
import Layout from '@/components/Layout/Layout';
import FileDownload from '@/components/FileDownload';
import { formatDate, formatDateTime } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

const natureStyles = {
  BIASA: { bg: 'bg-gray-100', text: 'text-gray-800' },
  TERBATAS: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  RAHASIA: { bg: 'bg-red-100', text: 'text-red-800' },
  SANGAT_RAHASIA: { bg: 'bg-red-200', text: 'text-red-900' },
  PENTING: { bg: 'bg-orange-100', text: 'text-orange-800' },
};

const natureLabels = {
  BIASA: 'Biasa',
  TERBATAS: 'Terbatas',
  RAHASIA: 'Rahasia',
  SANGAT_RAHASIA: 'Sangat Rahasia',
  PENTING: 'Penting',
};

const DetailItem = ({ icon: Icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) => (
  <div>
    <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </label>
    <div className="text-base text-gray-800 font-medium pl-6">
      {children}
    </div>
  </div>
);

export default function OutgoingLetterDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { data: letter, isLoading, error } = useOutgoingLetter(id as string);
  const deleteLetterMutation = useDeleteOutgoingLetter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleDelete = async () => {
    if (!letter) return;
    
    toast.promise(
      deleteLetterMutation.mutateAsync(letter.id),
      {
        loading: 'Menghapus surat...',
        success: () => {
          router.push('/letters/outgoing');
          return 'Surat keluar berhasil dihapus.';
        },
        error: 'Gagal menghapus surat keluar.',
      }
    );
    setShowDeleteConfirm(false);
  };

  if (loading || isLoading) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Memuat detail surat...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) return null;

  if (error || !letter) {
    return (
      <Layout>
        <div className="text-center py-12">
            <Image 
                src="/images/not-found.svg" 
                alt="Not Found" 
                width={150} 
                height={150} 
                className="mx-auto mb-6"
            />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Surat Tidak Ditemukan</h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">Surat yang Anda cari mungkin telah dihapus, dipindahkan, atau tidak pernah ada.</p>
          <Link href="/letters/outgoing" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Daftar Surat
          </Link>
        </div>
      </Layout>
    );
  }

  const natureStyle = natureStyles[letter.letterNature as keyof typeof natureStyles] || natureStyles.BIASA;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/letters/outgoing"
            className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Surat Keluar
          </Link>
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold leading-tight text-gray-900 truncate">
                {letter.subject}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Nomor: <span className="font-medium text-gray-700">{letter.letterNumber}</span>
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
              <Link
                href={`/letters/outgoing/edit/${letter.id}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Letter Information */}
            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <Send className="h-5 w-5 text-green-600" />
                  </div>
                  Informasi Surat
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                  <DetailItem icon={Clock} label="Tanggal Pembuatan">
                    {formatDate(letter.createdDate)}
                  </DetailItem>
                  
                  <DetailItem icon={Clock} label="Tanggal Surat">
                    {formatDate(letter.letterDate)}
                  </DetailItem>
                  
                  {letter.executionDate && (
                    <DetailItem icon={Clock} label="Tanggal Pelaksanaan">
                      {formatDate(letter.executionDate)}
                    </DetailItem>
                  )}
                  
                  <DetailItem icon={User} label="Pengirim">
                    {letter.sender}
                  </DetailItem>
                  
                  <DetailItem icon={User} label="Penerima">
                    {letter.recipient}
                  </DetailItem>
                  
                  <DetailItem icon={User} label="Pengolah">
                    {letter.processor}
                  </DetailItem>
                  
                  <DetailItem icon={Tag} label="Sifat Surat">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${natureStyle.bg} ${natureStyle.text}`}>
                      {natureLabels[letter.letterNature as keyof typeof natureLabels]}
                    </span>
                  </DetailItem>
                  
                  <DetailItem icon={Tag} label="Klasifikasi Keamanan">
                    {letter.securityClass}
                  </DetailItem>
                  
                  {letter.classificationCode && (
                    <DetailItem icon={Tag} label="Kode Klasifikasi">
                      {letter.classificationCode}
                    </DetailItem>
                  )}
                  
                  {letter.serialNumber && (
                    <DetailItem icon={Tag} label="Nomor Urut">
                      {letter.serialNumber}
                    </DetailItem>
                  )}
                </div>
                
                {letter.note && (
                  <div className="mt-6">
                    <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                      <Info className="h-4 w-4 mr-2" />
                      Catatan
                    </label>
                    <div className="p-4 bg-gray-50 rounded-lg text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                      {letter.note}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Event Information */}
            {letter.isInvitation && (
              <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg mr-3">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    Informasi Acara
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {letter.eventDate && (
                      <DetailItem icon={Calendar} label="Tanggal Acara">
                        {formatDate(letter.eventDate)}
                      </DetailItem>
                    )}
                    
                    {letter.eventTime && (
                      <DetailItem icon={Clock} label="Waktu Acara">
                        {letter.eventTime}
                      </DetailItem>
                    )}
                    
                    {letter.eventLocation && (
                      <DetailItem icon={MapPin} label="Lokasi Acara">
                        {letter.eventLocation}
                      </DetailItem>
                    )}
                  </div>
                  
                  {letter.eventNotes && (
                    <div className="mt-6">
                      <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                        <Info className="h-4 w-4 mr-2" />
                        Catatan Acara
                      </label>
                      <div className="p-4 bg-gray-50 rounded-lg text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                        {letter.eventNotes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* File Attachment */}
            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                File Lampiran
              </h3>
              <FileDownload 
                letterId={letter.id}
                letterType="outgoing"
                fileName={letter.fileName}
              />
            </div>

            {/* Metadata */}
            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Dibuat oleh</span>
                  <span className="font-medium text-gray-800">{letter.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tanggal dibuat</span>
                  <span className="font-medium text-gray-800">{formatDate(letter.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Terakhir diubah</span>
                  <span className="font-medium text-gray-800">{formatDate(letter.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 transition-opacity" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 transform transition-all">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Hapus Surat
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Apakah Anda yakin ingin menghapus surat "{letter.subject}"? Tindakan ini tidak dapat dibatalkan.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteLetterMutation.isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:w-auto sm:text-sm disabled:bg-red-300"
                >
                  {deleteLetterMutation.isLoading ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}