'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Blocks, Check, ChevronRight, Eye, EyeOff, Fingerprint, KeyRound, Loader2, LockKeyhole, Mail, Moon, ShieldCheck, Sparkles, Sun, Workflow } from 'lucide-react';
import { loginAccount, loginDemo } from '@/lib/login';
import styles from './login.module.css';

export function LoginScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [key, setKey] = useState('');
  const [mode, setMode] = useState<'account' | 'demo'>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const configuredKey = process.env.NEXT_PUBLIC_DINUSNEXUS_API_KEY;

  async function submit(value: string) {
    if (busy) return;
    setError(''); setBusy(true);
    try {
      if (mode === 'account') await loginAccount(email, password);
      else await loginDemo(value);
      setPassword(''); setKey(''); router.push('/');
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Tidak dapat masuk. Silakan coba lagi.'); }
    finally { setBusy(false); }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); void submit(key);
  }

  return (
    <div className={styles.screen} data-theme={theme}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="DinusNexus — buka workspace">
          <span className={styles.brandIcon}><Blocks size={23} strokeWidth={1.8} /></span>
          <span>Dinus<span className={styles.brandAccent}>Nexus</span><small>THE CONNECTED CAMPUS</small></span>
        </Link>
        <div className={styles.headerActions}>
          <span className={styles.prototype}>HACKATHON PROTOTYPE</span>
          <button type="button" className={styles.themeButton} aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.story} aria-labelledby="story-title">
          <div className={styles.eyebrow}><span /> ONE CAMPUS. ONE INTELLIGENCE.</div>
          <h1 id="story-title">Kampus terhubung.<br />Kerja lebih <span>bermakna.</span></h1>
          <p className={styles.intro}>Satukan konteks, bukti, dan keputusan dalam satu workspace. Rekan kerja digital untuk operasional kampus Anda.</p>

          <div className={styles.visual}>
            <div className={styles.visualHeading}><span><Blocks size={14} /> CAMPUS INTELLIGENCE</span><span className={styles.synthetic}>SYNTHETIC</span></div>
            <svg className={styles.campus} viewBox="0 0 600 310" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="login-ground" x1="300" y1="60" x2="300" y2="290" gradientUnits="userSpaceOnUse"><stop stopColor="#dce7fc" /><stop offset="1" stopColor="#eef0ff" /></linearGradient>
                <linearGradient id="login-roof" x1="220" y1="50" x2="350" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#a5b4fc" /><stop offset="1" stopColor="#6366f1" /></linearGradient>
                <pattern id="login-windows" width="14" height="16" patternUnits="userSpaceOnUse"><rect x="4" y="4" width="4" height="7" rx="1" fill="#c7d2fe" /></pattern>
              </defs>
              <path d="M300 64 551 177 300 293 49 177Z" fill="url(#login-ground)" stroke="#c7d2fe" />
              <path d="m100 178 200 92 200-92M150 154l200 92M201 130l199 93M250 109l200 92M100 201l250-115M150 223l250-115M200 247l249-115M250 270l250-115" stroke="#c7d2fe" strokeOpacity=".55" />
              <path d="m70 178 230 105 230-105M300 78v205" stroke="white" strokeWidth="10" />
              <path d="m153 172 145 64 146-64M191 151l107 47 110-50" stroke="#818cf8" strokeWidth="2" strokeDasharray="5 7" className={styles.flow} />
              <g><path d="m231 114 69 31v83l-69-32Z" fill="#818cf8" /><path d="m300 145 69-31v82l-69 32Z" fill="#4f46e5" /><path d="m231 114 69-32 69 32-69 31Z" fill="url(#login-roof)" /><path d="m239 127 52 23v61l-52-24Z" fill="url(#login-windows)" /><path d="m309 149 50-24v62l-50 24Z" fill="url(#login-windows)" /><path d="m259 101 41-19 40 19-40 19Z" fill="#e0e7ff" /><path d="M300 82V56" stroke="#6366f1" strokeWidth="3" /><circle cx="300" cy="52" r="5" fill="#22d3ee" /></g>
              <g><path d="m139 163 42 19v45l-42-19Z" fill="#a5b4fc" /><path d="m181 182 42-19v45l-42 19Z" fill="#818cf8" /><path d="m139 163 42-19 42 19-42 19Z" fill="#e0e7ff" /><path d="m148 176 25 12v28l-25-12Z" fill="url(#login-windows)" /></g>
              <g><path d="m391 156 39 18v43l-39-18Z" fill="#a5b4fc" /><path d="m430 174 39-18v43l-39 18Z" fill="#818cf8" /><path d="m391 156 39-18 39 18-39 18Z" fill="#e0e7ff" /><path d="m399 169 24 11v26l-24-11Z" fill="url(#login-windows)" /></g>
              {[ [112, 177], [240, 240], [369, 239], [492, 178], [210, 133], [390, 128] ].map(([x, y]) => <g key={`${x}-${y}`}><path d={`M${x} ${y}v-14`} stroke="#6c9a92" strokeWidth="3" /><ellipse cx={x} cy={y - 19} rx="10" ry="13" fill="#99d5c0" /><ellipse cx={x - 3} cy={y - 23} rx="6" ry="8" fill="#b5e8d4" /></g>)}
              <ellipse cx="300" cy="252" rx="22" ry="10" fill="#c7d2fe" /><ellipse cx="300" cy="252" rx="12" ry="5" fill="#818cf8" />
            </svg>
            <div className={`${styles.floatingCard} ${styles.evidenceCard}`}><span className={styles.smallIcon}><ShieldCheck size={17} /></span><div><strong>Evidence-first</strong><small>Setiap temuan punya sumber</small></div><Check size={14} /></div>
            <div className={`${styles.floatingCard} ${styles.workerCard}`}><span className={styles.workerIcon}><Workflow size={17} /></span><div><strong>IT Helpdesk</strong><small>Workflow + history persisten</small></div></div>
            <div className={styles.visualFooter}><span className={styles.decorativeDot} /> Ilustrasi konsep · bukan telemetri live <ArrowUpRight size={14} /></div>
          </div>
          <div className={styles.features}><span><ShieldCheck size={16} /> Bukti yang transparan</span><span><Workflow size={16} /> Human-in-the-loop</span></div>
        </section>

        <section className={styles.formPanel} aria-labelledby="login-title">
          <div className={styles.formTop}><span className={styles.accessIcon}><Fingerprint size={27} strokeWidth={1.5} /></span><span className={styles.accessBadge}>{mode === 'account' ? 'WORKSPACE ACCESS' : 'DEMO ACCESS'}</span></div>
          <h2 id="login-title">Selamat datang kembali<span>.</span></h2>
          <p className={styles.formIntro}>Ruang kerja Anda, selangkah lebih dekat.<br />{mode === 'account' ? 'Masuk dengan akun Anda untuk mulai bekerja.' : 'Gunakan API key khusus demo untuk mulai bekerja.'}</p>

          <div className={styles.modeSwitch} role="group" aria-label="Metode masuk">
            <button type="button" aria-pressed={mode === 'account'} disabled={busy} onClick={() => { setMode('account'); setError(''); setVisible(false); }}>Akun workspace</button>
            <button type="button" aria-pressed={mode === 'demo'} disabled={busy} onClick={() => { setMode('demo'); setError(''); setVisible(false); }}>API key demo</button>
          </div>

          <form onSubmit={onSubmit} className={styles.form}>
            {mode === 'account' ? <>
              <label htmlFor="login-email">Email</label>
              <div className={styles.inputWrap}><Mail size={18} aria-hidden="true" /><input id="login-email" type="email" placeholder="nama@kampus.ac.id" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} required maxLength={254} disabled={busy} autoComplete="username" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : undefined} /></div>
              <label htmlFor="login-password" className={styles.passwordLabel}>Password</label>
              <div className={styles.inputWrap}><LockKeyhole size={18} aria-hidden="true" /><input id="login-password" type={visible ? 'text' : 'password'} placeholder="Masukkan password Anda" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} required maxLength={128} disabled={busy} autoComplete="current-password" aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : undefined} /><button type="button" aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              <p className={styles.hint}>Akun dikelola admin proyek. SSO kampus belum terhubung.</p>
            </> : <>
              <label htmlFor="demo-key">API key demo <span>Wajib</span></label>
              <div className={styles.inputWrap}><KeyRound size={18} aria-hidden="true" /><input id="demo-key" type={visible ? 'text' : 'password'} placeholder="Masukkan key akses Anda" value={key} onChange={(event) => { setKey(event.target.value); setError(''); }} required maxLength={512} disabled={busy} autoComplete="off" spellCheck={false} aria-describedby={error ? 'key-hint login-error' : 'key-hint'} aria-invalid={Boolean(error)} /><button type="button" aria-label={visible ? 'Sembunyikan API key' : 'Tampilkan API key'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              <p id="key-hint" className={styles.hint}>Gunakan key backend khusus demo, bukan key provider AI atau key produksi.</p>
            </>}
            {error && <p id="login-error" role="alert" className={styles.error}>{error}</p>}
            <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? <><Loader2 size={18} className={styles.spinner} /> Memverifikasi akses...</> : <>Masuk ke workspace <ArrowRight size={18} /></>}</button>
          </form>

          {mode === 'demo' && <>
            <div className={styles.divider}><span />atau gunakan konfigurasi lokal<span /></div>
            <button type="button" className={styles.demoButton} disabled={busy || !configuredKey} onClick={() => void submit(configuredKey ?? '')}><Sparkles size={17} /> Gunakan akses demo <ChevronRight size={16} /></button>
            {!configuredKey && <p className={styles.hint}>Akses cepat belum dikonfigurasi. Masukkan key demo di atas.</p>}
          </>}
          <details className={styles.help}><summary>Belum punya akses?</summary><p>{mode === 'account' ? 'Minta admin proyek membuat akun workspace melalui perintah lokal. Belum tersedia registrasi publik, reset password mandiri, atau SSO kampus.' : 'Minta API key demo dari pengelola proyek.'} Backend dan PostgreSQL harus aktif; origin frontend harus diizinkan melalui CORS.</p></details>

          <div className={styles.securityNote}><ShieldCheck size={19} /><p><strong>{mode === 'account' ? 'Password di-hash · sesi terverifikasi.' : 'Akses demo · bukan identitas akun.'}</strong>{mode === 'account' ? 'Sesi berlaku 8 jam dan dicabut saat keluar. Token tersimpan selama sesi tab, bukan password. Workspace bersama menggunakan data SYNTHETIC.' : 'Key tersimpan selama sesi tab. Jangan gunakan key produksi atau provider AI. Data workspace bersifat SYNTHETIC.'}</p></div>
        </section>
      </div>
      <footer className={styles.footer}><span>© {new Date().getFullYear()} DinusNexus · Built for a smarter campus.</span><span>AI-assisted. Human-centered.</span></footer>
    </div>
  );
}
