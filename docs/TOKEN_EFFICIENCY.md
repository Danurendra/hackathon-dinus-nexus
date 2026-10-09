# AI Token Efficiency & Measurement

## Tujuan

Mengukur penggunaan token dan mengoptimalkan biaya/pemakaian tanpa menurunkan akurasi. Efisiensi token merupakan salah satu kriteria penilaian resmi; karena itu, klaim optimasi harus disertai pengukuran.

## Logging yang disarankan

Untuk setiap pemanggilan provider, simpan jika metadata tersedia:

- task/run ID dan step ID.
- provider/model identifier yang tidak mengandung secret.
- timestamp dan latency.
- input token dan output token dari usage metadata provider.
- status sukses/gagal.
- jumlah retry.
- kategori tugas/worker.
- estimasi biaya jika rate dan aturan kalkulasinya sudah diverifikasi.

Jangan mengarang token count. Jika provider tidak mengembalikan usage, tandai nilai sebagai `unavailable` atau gunakan estimator dan jelaskan bahwa itu estimasi.

## Optimasi prioritas

1. **Route dengan aturan bila cukup.** Gunakan validasi sederhana dan deterministik tanpa memanggil LLM jika tidak diperlukan.
2. **Retrieval selektif.** Ambil record/dokumen yang relevan saja.
3. **Ringkas konteks secara terukur.** Jangan mengirim ulang seluruh riwayat atau database pada setiap langkah.
4. **Structured outputs.** Minta format data yang ringkas dan valid untuk field yang dibutuhkan.
5. **Tool results compact.** Kirim kolom penting dan ID sumber, bukan dump besar.
6. **Batasi retries.** Gunakan retry hanya untuk error yang dapat dipulihkan dan tentukan batas.
7. **Simpan hasil.** Gunakan task/history untuk menghindari investigasi ulang yang tidak perlu.
8. **Pisahkan deterministic calculations.** Gunakan kode untuk rekonsiliasi, statistik, validasi schema, dan perhitungan sederhana.
9. **Model selection.** Pemilihan model berdasarkan kemampuan dan token cost: `TBD` sampai provider/model panitia diketahui dan diuji.

## Baseline experiment

Bandingkan baseline dan optimized approach dengan input serta dataset yang sama.

Catat:
- akurasi/tingkat keberhasilan task.
- input/output token aktual atau estimasi yang ditandai.
- latency.
- jumlah pemanggilan model/tool.
- error/failure rate.
- kelengkapan source/evidence.

Template hasil:

| Test case | Approach | Success/accuracy | Input tokens | Output tokens | Latency | Notes |
|---|---|---:|---:|---:|---:|---|
| TBD | Baseline | TBD | TBD | TBD | TBD | Belum diukur |
| TBD | Optimized | TBD | TBD | TBD | TBD | Belum diukur |

Jangan menyimpulkan penghematan atau mempertahankan akurasi sebelum pengujian dilakukan.

## Dashboard token

Tampilkan agregat dan penggunaan per task bila metadata tersedia. Jelaskan apakah angka berasal dari provider atau estimator. Jangan menampilkan API key, prompt sensitif, atau isi dokumen privat di dashboard usage.
