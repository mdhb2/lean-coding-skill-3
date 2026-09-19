# LCS3 — Runtime Coding Agentic yang Deterministik

LCS3 adalah penerus clean-slate dari proyek LCS (Lean Coding Skills) lama. Perilaku berguna dari sistem workflow lama tetap dipertahankan, tapi mekanisme rapuh yang bergantung penuh pada LLM diganti dengan runtime deterministik.

> Bukan upgrade in-place. Tidak backward compatible dengan state, schema, atau mekanisme workflow `.lcs/` lama. Legacy LCS diperlakukan murni sebagai referensi read-only.

## Kenapa LCS3 dibuat

LCS lama sangat bergantung pada LLM untuk membaca dan mengeksekusi instruksi Markdown dengan benar demi mengelola state, ID, dependency, dan transisi lifecycle. Ini menimbulkan risiko nyata:

- state rusak karena instruksi salah diterapkan
- schema drift antar skill, template, validator, dan fixture
- sumber kebenaran (source of truth) ganda/konflik
- context yang dimuat berlebihan (boros token)
- penanganan dependency dan konflik yang rapuh
- keamanan multi-worker yang lemah
- otonomi AFK (kerja tanpa pengawasan) yang belum lengkap

LCS3 menyelesaikan ini dengan memindahkan pekerjaan mekanis, stateful, dan sensitif-integritas ke runtime deterministik, sementara LLM difokuskan ke hal yang memang jadi kekuatannya: menangani ambiguitas, sintesis, judgment, dan penulisan kode.

## Prinsip inti

1. **Determinisme** — mutasi state, ID, transisi lifecycle, lease, pengecekan dependency/konflik dijalankan sebagai kode runtime, bukan instruksi bahasa natural yang bisa salah dibaca LLM.
2. **Otonomi** — pekerjaan AFK berjalan dan mengoreksi diri sendiri (dalam batas retry tertentu) tanpa perlu campur tangan manusia yang tidak perlu.
3. **Efisiensi** — agent hanya memuat context yang relevan untuk task saat ini lewat Context Capsule, bukan seluruh proyek.
4. **Kualitas** — pengecekan kualitas bersifat modular, selektif, native, dan bisa diverifikasi (Quality Overlay), dimuat hanya saat relevan.
5. **Belajar tanpa merusak diri** — telemetry dan project memory memberi masukan untuk kerja berikutnya, tapi tidak pernah diam-diam mengubah skill, manifest, schema, atau kebijakan kanonis.
6. **Kontinuitas perilaku, bukan pewarisan arsitektur** — setiap skill LCS lama diinventarisasi dan diklasifikasikan secara eksplisit (`REWRITE` / `MERGE` / `DROP` / `REPLACED_BY_RUNTIME`) sebelum skill `lcs3-*` mana pun dibuat. Tidak ada rename mekanis lalu dipakai apa adanya.

## Arsitektur singkat

```text
Referensi LCS lama (read-only)
        |
        v
Legacy Skill Migration Matrix
        |
        v
Skill LCS3 / reasoning LLM
        |
        v
Lapisan workflow / kebijakan
        |
        v
Runtime lcs3 deterministik
        |
   +----+----------------------+
   |            |              |
Markdown/YAML  SQLite       Derived view
kanonis        state         / cache
               runtime
```

- **Artifact kanonis** (Markdown/YAML dengan metadata terstruktur) adalah sumber kebenaran yang bisa dibaca manusia: PRD, SRS, task, ADR.
- **State eksekusi dinamis** (claim, lease, status task, telemetry) disimpan di SQLite, bukan ditulis ulang berkali-kali dalam Markdown.
- **Artifact derivatif** (traceability view, laporan task-coverage, Context Capsule) bersifat cache yang bisa dibangkitkan ulang — tidak pernah lebih tinggi otoritasnya dari sumber kanonisnya.

## Kemampuan utama

- CLI deterministik tunggal (`lcs3`) dengan subsistem internal modular, Node.js/TypeScript.
- Root proyek-lokal di `.lcs3/` (bukan `.lcs/`).
- Routing workflow adaptif berdasarkan kompleksitas + risiko — kerja sederhana/risiko rendah lewat jalur pendek, kerja kompleks/risiko tinggi dapat spesifikasi dan review lebih dalam.
- Pemisahan eksekusi AFK/HITL, dengan retry terklasifikasi dan terbatas untuk kegagalan yang bisa dipulihkan.
- Penanganan dependency, konflik, claim, dan lease yang deterministik untuk eksekusi multi-worker yang aman.
- Loop review → fix dengan temuan `FIX-###` yang bisa dilacak.
- Quality Overlay native (`ui-quality`, `code-quality`, `security-basic`), dimuat hanya saat relevan dengan task.
- Project memory sebagai bukti advisory — tidak pernah diam-diam dinaikkan jadi aturan proyek-wide; promosi ke ADR bersifat eksplisit.
- Telemetry lokal dan proposal self-improvement berbasis bukti — hanya berupa proposal, tidak pernah diterapkan otomatis.
- Traceability requirement yang deterministik dan bisa dibangkitkan ulang (`SRC-###` → `FR-###` → `AC-###` → task/test).

## Traceability requirement

Requirement dilacak dengan ID stabil yang tidak pernah dinomori ulang, di seluruh pipeline:

```
SRC-### (source requirement) → FR-### (functional requirement) → AC-### (acceptance criterion) → TASK-### (task implementasi) → test
```

Rentang "must preserve" PRD saat ini: `SRC-001` .. `SRC-069`.

## Status proyek

**Fase: PRD / pengerasan arsitektur pra-SRS.**

Sebelum implementasi besar dimulai:

1. Legacy Skill Migration Matrix harus lengkap dan disetujui.
2. Posisi format artifact / OKF harus final.
3. Kontrak fase workflow dan lifecycle task harus final.
4. Desain runtime deterministik/SQLite harus cukup detail untuk diimplementasikan.
5. PRD sudah direview dan SRS/pemecahan task turunannya sudah dibuat.

Artifact kanonis untuk work item aktif ada di:

```text
.lcs/work-items/{timestamp}-{slug}/
  prd.md              # PRD kanonis
  srs.md              # spesifikasi siap-implementasi
  task-coverage.md     # view traceability derivatif
  task/task-###.md      # task implementasi individual
```

## Bukan tujuan LCS3

- Bukan rename mekanis skill `lcs-*` lama menjadi `lcs3-*`.
- Tidak backward compatible dengan path, schema, atau state `.lcs/` lama.
- Tidak memperlakukan mekanisme, status, atau validator LCS lama sebagai requirement LCS3 — legacy hanya referensi perilaku.

## English

Read [README.md](./README.md) for the English version.
