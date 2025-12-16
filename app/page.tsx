'use client';

import { useEffect, useRef, useState } from 'react';

interface TransaksiMasuk {
  id: string;
  deskripsi: string;
  nominal: number;
  tanggal: string;
}

interface TransaksiKeluar {
  id: string;
  deskripsi: string;
  nominal: number;
  tanggal: string;
}

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

const today = new Date();
const currentMonthStr = String(today.getMonth()); // 0-11
const currentYearStr = String(today.getFullYear());

export default function Home() {
  const [transaksiMasuk, setTransaksiMasuk] = useState<TransaksiMasuk[]>([]);
  const [transaksiKeluar, setTransaksiKeluar] = useState<TransaksiKeluar[]>([]);
  const [deskripsiMasuk, setDeskripsiMasuk] = useState('');
  const [nominalMasuk, setNominalMasuk] = useState('');
  const [deskripsiKeluar, setDeskripsiKeluar] = useState('');
  const [nominalKeluar, setNominalKeluar] = useState('');
  const [saldoAwal, setSaldoAwal] = useState('0');
  const [isEditSaldoOpen, setIsEditSaldoOpen] = useState(false);
  const [keteranganList, setKeteranganList] = useState<string[]>([]);
  const [keteranganBaru, setKeteranganBaru] = useState('');
  const [showFormKeterangan, setShowFormKeterangan] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const downloadCounterRef = useRef<number>(1);
  const lastDownloadDateRef = useRef<string>('');

  const formatRupiah = (angka: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const filterByMonthYear = (tanggal: string) => {
    if ((!selectedMonth || selectedMonth === 'all') &&
        (!selectedYear || selectedYear === 'all')) {
      return true;
    }
    if (!tanggal) return true;
    const d = new Date(tanggal);
    if (Number.isNaN(d.getTime())) return true;
    const monthIndex = selectedMonth === 'all' ? null : parseInt(selectedMonth, 10); // 0-11
    const yearValue = selectedYear === 'all' ? null : parseInt(selectedYear, 10);
    const monthMatch = monthIndex === null ? true : d.getMonth() === monthIndex;
    const yearMatch = yearValue === null ? true : d.getFullYear() === yearValue;
    return monthMatch && yearMatch;
  };

  const filteredTransaksiMasuk = transaksiMasuk.filter((item) =>
    filterByMonthYear(item.tanggal),
  );

  const filteredTransaksiKeluar = transaksiKeluar.filter((item) =>
    filterByMonthYear(item.tanggal),
  );

  const totalMasuk = filteredTransaksiMasuk.reduce(
    (sum, item) => sum + item.nominal,
    0,
  );

  const totalKeluar = filteredTransaksiKeluar.reduce(
    (sum, item) => sum + item.nominal,
    0,
  );

  const saldo = (parseFloat(saldoAwal) || 0) + totalMasuk - totalKeluar;

  useEffect(() => {
    const loadData = async () => {
      try {
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          }
        } catch (error) {
          console.error('Gagal load user:', error);
        }

        try {
          const res = await fetch('/api/laporan');
          if (res.ok) {
            const data = await res.json() as {
              saldoAwal?: string;
              keteranganList?: string[];
              transaksiMasuk?: TransaksiMasuk[];
              transaksiKeluar?: TransaksiKeluar[];
            };

            if (data.saldoAwal !== undefined) {
              setSaldoAwal(data.saldoAwal);
            }

            if (Array.isArray(data.keteranganList) && data.keteranganList.length > 0) {
              setKeteranganList(data.keteranganList);
            }

            if (Array.isArray(data.transaksiMasuk)) {
              setTransaksiMasuk(data.transaksiMasuk);
            }

            if (Array.isArray(data.transaksiKeluar)) {
              setTransaksiKeluar(data.transaksiKeluar);
            }
          }
        } catch (error) {
          console.error('Gagal load laporan dari API:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  //logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAdmin = user?.role === 'admin';

  const saveLaporan = async (
    overrides?: Partial<{
      transaksiMasuk: TransaksiMasuk[];
      transaksiKeluar: TransaksiKeluar[];
      saldoAwal: string;
      keteranganList: string[];
    }>,
  ) => {
    if (!isAdmin) return;

    const payload = {
      transaksiMasuk,
      transaksiKeluar,
      saldoAwal,
      keteranganList,
      ...overrides,
    };

    try {
      await fetch('/api/laporan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Gagal menyimpan laporan ke database:', error);
    }
  };
  
  const handleDownloadPdf = async () => {
    if (typeof window === 'undefined') return;

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const lineHeight = 6;
      let y = 15;

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate(),
      ).padStart(2, '0')}`;
      if (lastDownloadDateRef.current !== dateStr) {
        lastDownloadDateRef.current = dateStr;
        downloadCounterRef.current = 1;
      }
      const fileName = `laporan-badminton-${dateStr}(${downloadCounterRef.current}).pdf`;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Laporan Badminton 2025', pageWidth / 2, y, {
        align: 'center',
      });
      y += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      // Keterangan
      doc.text('Keterangan:', margin, y);
      y += lineHeight;

      if (keteranganList.length === 0) {
        doc.text('- (belum ada keterangan)', margin + 4, y);
        y += lineHeight;
      } else {
        keteranganList.forEach((item, index) => {
          const text = `${index + 1}. ${item}`;
          doc.text(text, margin + 4, y);
          y += lineHeight;
        });
      }

      y += lineHeight;

      const ringkasan = [
        `Saldo Awal : ${formatRupiah(parseFloat(saldoAwal) || 0)}`,
        `Saldo Total: ${formatRupiah(saldo)}`,
        `Total Masuk: ${formatRupiah(totalMasuk)}`,
        `Total Keluar: ${formatRupiah(totalKeluar)}`,
      ];

      ringkasan.forEach((row) => {
        doc.text(row, margin, y);
        y += lineHeight;
      });

      y += lineHeight;

      doc.setFont('helvetica', 'bold');
      doc.text('Daftar Uang Masuk', margin, y);
      doc.text('Daftar Uang Keluar', pageWidth / 2 + 5, y);
      doc.setFont('helvetica', 'normal');
      y += lineHeight;

      const maxRows = Math.max(
        filteredTransaksiMasuk.length,
        filteredTransaksiKeluar.length,
      );

      for (let i = 0; i < maxRows; i += 1) {
        const masuk = filteredTransaksiMasuk[i];
        const keluar = filteredTransaksiKeluar[i];

        if (masuk) {
          const textMasuk = `${i + 1}. ${masuk.deskripsi} - ${formatRupiah(
            masuk.nominal,
          )}`;
          doc.text(textMasuk, margin, y);
        }

        if (keluar) {
          const textKeluar = `${i + 1}. ${keluar.deskripsi} - ${formatRupiah(
            keluar.nominal,
          )}`;
          doc.text(textKeluar, pageWidth / 2 + 5, y);
        }

        y += lineHeight;

        if (y > 280 && i < maxRows - 1) {
          doc.addPage();
          y = 15;
        }
      }

      doc.save(fileName);
      downloadCounterRef.current += 1;
    } catch (error) {
      console.error('Gagal generate PDF:', error);
      alert('Gagal membuat PDF. Silakan coba lagi.');
    }
  };

  const handleTambahMasuk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskripsiMasuk || !nominalMasuk || parseFloat(nominalMasuk) <= 0) {
      alert('Mohon isi deskripsi dan nominal dengan benar!');
      return;
    }

    const newTransaksi: TransaksiMasuk = {
      id: Date.now().toString(),
      deskripsi: deskripsiMasuk,
      nominal: parseFloat(nominalMasuk),
      tanggal: new Date().toISOString(),
    };

    const updated = [...transaksiMasuk, newTransaksi];
    setTransaksiMasuk(updated);
    void saveLaporan({ transaksiMasuk: updated });
    setDeskripsiMasuk('');
    setNominalMasuk('');
  };

  const handleTambahKeluar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskripsiKeluar || !nominalKeluar || parseFloat(nominalKeluar) <= 0) {
      alert('Mohon isi deskripsi dan nominal dengan benar!');
      return;
    }

    const newTransaksi: TransaksiKeluar = {
      id: Date.now().toString(),
      deskripsi: deskripsiKeluar,
      nominal: parseFloat(nominalKeluar),
      tanggal: new Date().toISOString(),
    };

    const updated = [...transaksiKeluar, newTransaksi];
    setTransaksiKeluar(updated);
    void saveLaporan({ transaksiKeluar: updated });
    setDeskripsiKeluar('');
    setNominalKeluar('');
  };

  const handleHapusMasuk = (id: string) => {
    const updated = transaksiMasuk.filter((item) => item.id !== id);
    setTransaksiMasuk(updated);
    void saveLaporan({ transaksiMasuk: updated });
  };

  const handleHapusKeluar = (id: string) => {
    const updated = transaksiKeluar.filter((item) => item.id !== id);
    setTransaksiKeluar(updated);
    void saveLaporan({ transaksiKeluar: updated });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-4xl md:text-3xl font-bold text-gray-800 mb-1">
            Laporan Badminton IP 2025
          </h1>
        </div>

        <div className="mb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">
                Bulan:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2 py-1 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="0">Januari</option>
                <option value="1">Februari</option>
                <option value="2">Maret</option>
                <option value="3">April</option>
                <option value="4">Mei</option>
                <option value="5">Juni</option>
                <option value="6">Juli</option>
                <option value="7">Agustus</option>
                <option value="8">September</option>
                <option value="9">Oktober</option>
                <option value="10">November</option>
                <option value="11">Desember</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">
                Tahun:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-2 py-1 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={currentYearStr}>{currentYearStr}</option>
                <option value={String(Number(currentYearStr) + 1)}>
                  {String(Number(currentYearStr) + 1)}
                </option>
                <option value={String(Number(currentYearStr) - 1)}>
                  {String(Number(currentYearStr) - 1)}
                </option>
                <option value="all">Semua</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && user.role === 'admin' ? (
              <>
                <span className="text-xs md:text-sm text-gray-600">
                  Admin: <strong>{user.username}</strong>
                </span>
                <a
                  href="/change-password"
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Ganti Password
                </a> 
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <a
                href="/login"
                className="px-3 py-1.5 rounded-lg border border-indigo-500 text-indigo-600 text-xs font-semibold hover:bg-indigo-50 transition"
              >
                Anda admin?
              </a>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="w-4 h-4"
              >
                <path d="M6 9V4h12v5" />
                <rect x="5" y="9" width="14" height="8" rx="1" />
                <path d="M8 17h8v3H8z" />
                <path d="M7 12h1" />
              </svg>
              <span>Download</span>
            </button>
          </div>
        </div>

        <div className="print-laporan print-only">

          <div className="print-section">
            <div className="print-section-title">Keterangan:</div>
            <div className="print-section-content">
              {keteranganList.length > 0 ? (
                <ol className="list-decimal list-inside">
                  {keteranganList
                    .filter((item) => item.trim() !== '')
                    .map((item, index) => (
                      <li key={index} className="print-list-item">
                        {item}
                      </li>
                    ))}
                </ol>
              ) : (
                <p>-</p>
              )}
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">Saldo Awal:</div>
            <div className="print-section-content">
              {formatRupiah(parseFloat(saldoAwal) || 0)}
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">Saldo Total:</div>
            <div className="print-section-content">
              {formatRupiah(saldo)}
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">Total Masuk:</div>
            <div className="print-section-content">
              {formatRupiah(totalMasuk)}
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">Total Keluar:</div>
            <div className="print-section-content">
              {formatRupiah(totalKeluar)}
            </div>
          </div>

          <div className="print-grid-2">
            <div>
              <div className="print-section-title">Daftar Uang Masuk</div>
              <div className="print-section-content">
                {transaksiMasuk.length > 0 ? (
                  <ol className="list-decimal list-inside">
                    {transaksiMasuk.map((item, index) => (
                      <li key={item.id} className="print-list-item">
                        {item.deskripsi} - {formatRupiah(item.nominal)}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>-</p>
                )}
              </div>
            </div>
            <div>
              <div className="print-section-title">Daftar Uang Keluar</div>
              <div className="print-section-content">
                {transaksiKeluar.length > 0 ? (
                  <ol className="list-decimal list-inside">
                    {transaksiKeluar.map((item, index) => (
                      <li key={item.id} className="print-list-item">
                        {item.deskripsi} - {formatRupiah(item.nominal)}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>-</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div ref={reportRef} className="screen-only">
          <div className="bg-white rounded-2xl shadow-md p-4 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">Keterangan:</p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowFormKeterangan((prev) => !prev)}
                className="no-print px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
              >
                {showFormKeterangan ? 'x' : '+ Tambah'}
              </button>
            )}
          </div>

          {isAdmin && showFormKeterangan && (
            <form
              className="no-print flex flex-col sm:flex-row gap-2 mb-3"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = keteranganBaru.trim();
                if (!trimmed) return;
                setKeteranganList((prev) => {
                  const updated = [...prev, trimmed];
                  void saveLaporan({ keteranganList: updated });
                  return updated;
                });
                setKeteranganBaru('');
              }}
            >
              <input
                type="text"
                value={keteranganBaru}
                onChange={(e) => setKeteranganBaru(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Contoh: Iuran per Anggota: Rp. 50.000"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
              >
                Simpan
              </button>
            </form>
          )}

          {keteranganList.length > 0 ? (
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
              {keteranganList.map((item, index) => (
                <li key={index} className="flex items-start justify-between gap-2">
                  <span className="flex-1">{item}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        setKeteranganList((prev) => {
                          const updated = prev.filter((_, i) => i !== index);
                          void saveLaporan({ keteranganList: updated });
                          return updated;
                        })
                      }
                      className="no-print text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                      aria-label="Hapus keterangan"
                    >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M9 3a1 1 0 0 0-.894.553L7.382 5H4a1 1 0 1 0 0 2h.08l.84 11.063A2 2 0 0 0 6.914 20h10.172a2 2 0 0 0 1.994-1.937L19.92 7H20a1 1 0 1 0 0-2h-3.382l-.724-1.447A1 1 0 0 0 15 3H9zm2 5a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1zm-3 1a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-7a1 1 0 0 0-1-1zm7 0a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1z" />
                    </svg>
                    </button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Belum ada keterangan, klik tombol &quot;Tambah List&quot; untuk menambahkan.
            </p>
          )}
          </div>

          {/* Saldo */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-2 border-indigo-200">
          <div className="flex items-start justify-between mb-4">
    <div>
              <h2 className="text-lg font-semibold text-gray-600 mb-1">Saldo Total</h2>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsEditSaldoOpen((prev) => !prev)}
                className="no-print inline-flex items-center justify-center rounded-full p-2 border border-gray-300 text-gray-600 hover:text-indigo-600 hover:border-indigo-400 bg-white shadow-sm transition text-xs"
              >
                {isEditSaldoOpen ? 'Batal' : 'Edit'}
              </button>
            )}
          </div>

          <div className="text-center md:text-left">
            <div className={`text-4xl md:text-5xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatRupiah(saldo)}
            </div>

            {isEditSaldoOpen && (
              <div className="no-print mt-4 max-w-xs">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Set Saldo Sebelumnya (Rp)
                </label>
                <input
                  type="number"
                  value={saldoAwal}
                  onChange={(e) => setSaldoAwal(e.target.value)}
                  className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="1000"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Ini adalah saldo yang sudah ada sebelum perhitungan hari ini.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void saveLaporan({ saldoAwal });
                    setIsEditSaldoOpen(false);
                  }}
                  className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                >
                  Simpan
                </button>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 max-w-md">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Masuk</p>
                <p className="text-2xl font-bold text-green-600">{formatRupiah(totalMasuk)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Keluar</p>
                <p className="text-2xl font-bold text-red-600">{formatRupiah(totalKeluar)}</p>
              </div>
            </div>
          </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
              Uang Masuk
            </h2>
            {isAdmin && (
              <form onSubmit={handleTambahMasuk} className="no-print mb-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi
                  </label>
                  <input
                    type="text"
                    value={deskripsiMasuk}
                    onChange={(e) => setDeskripsiMasuk(e.target.value)}
                    placeholder="nama anggota yg iuran"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    value={nominalMasuk}
                    onChange={(e) => setNominalMasuk(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                >
                  + Tambah Uang Masuk
                </button>
              </form>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Daftar Uang Masuk</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredTransaksiMasuk.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">Belum ada transaksi masuk</p>
                ) : (
                  filteredTransaksiMasuk.map((item) => (
                    <div
                      key={item.id}
                      className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.deskripsi}</p>
                        <p className="text-sm text-gray-500">
                          {item.tanggal ? new Date(item.tanggal).toLocaleString('id-ID') : ''}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-green-600">{formatRupiah(item.nominal)}</p>
                        {isAdmin && (
                          <button
                            onClick={() => handleHapusMasuk(item.id)}
                            className="no-print text-red-500 hover:text-red-700 text-sm mt-1"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-red-200">
            <h2 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
              Uang Keluar
            </h2>
            {isAdmin && (
              <form onSubmit={handleTambahKeluar} className="no-print mb-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi (bayar lapangan, dll)
                  </label>
                  <input
                    type="text"
                    value={deskripsiKeluar}
                    onChange={(e) => setDeskripsiKeluar(e.target.value)}
                    placeholder="Contoh: Bayar lapangan, Beli shuttlecock"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    value={nominalKeluar}
                    onChange={(e) => setNominalKeluar(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                >
                  + Tambah Uang Keluar
                </button>
              </form>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Daftar Uang Keluar</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredTransaksiKeluar.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">Belum ada transaksi keluar</p>
                ) : (
                  filteredTransaksiKeluar.map((item) => (
                    <div
                      key={item.id}
                      className="bg-red-50 border border-red-200 rounded-lg p-3 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-black">{item.deskripsi}</p>
                        <p className="text-sm text-black">
                          {item.tanggal ? new Date(item.tanggal).toLocaleString('id-ID') : ''}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-red-600">{formatRupiah(item.nominal)}</p>
                        {isAdmin && (
                          <button
                            onClick={() => handleHapusKeluar(item.id)}
                            className="no-print text-red-500 hover:text-red-700 text-sm mt-1"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
