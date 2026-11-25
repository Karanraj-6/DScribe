import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Search, Plus, SlidersHorizontal, Users, BedDouble, UserRoundCheck, ArrowUpRight, MoreHorizontal, Pencil, Trash2, X, Check, ChevronDown, Stethoscope, CalendarDays, Menu, RotateCcw } from './icons.jsx';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const EMPTY = { name: '', age: '', gender: '', ward: '', department: '', doctor: '', admission_date: '' };
function todayInIndia() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const values = Object.fromEntries(parts.map(({ type, value }) => [type, value])); return `${values.year}-${values.month}-${values.day}`; }
const fieldLabels = { name: 'Name', age: 'Age', gender: 'Gender', ward: 'Ward', department: 'Department', doctor: 'Doctor', admission_date: 'Admission date' };

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = data.detail;
    const message = Array.isArray(detail) ? detail.map((e) => `${fieldLabels[e.loc?.at(-1)] || e.loc?.at(-1) || 'Field'}: ${e.msg}`).join(' · ') : detail || 'Something went wrong. Please try again.';
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

function App() {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState({ genders: [], wards: [], departments: [], doctors: [] });
  const [filters, setFilters] = useState({ search: '', ward: '', department: '', doctor: '', status: '' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      params.set('limit', '500');
      const pickers = await request('/api/options');
      setOptions(pickers);
      const data = await request(`/api/patients?${params}`);
      const offsets = [];
      for (let offset = 500; offset < data.total; offset += 500) offsets.push(offset);
      const remaining = await Promise.all(offsets.map((offset) => { const page = new URLSearchParams(params); page.set('offset', String(offset)); return request(`/api/patients?${page}`); }));
      setPatients([...data.items, ...remaining.flatMap((page) => page.items)]); setTotal(data.total);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [filters, refreshTick]);

  useEffect(() => { const t = setTimeout(load, filters.search ? 250 : 0); return () => clearTimeout(t); }, [load]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 3600); return () => clearTimeout(t); }, [notice]);

  const admitted = useMemo(() => patients.filter((p) => p.status === 'Admitted').length, [patients]);
  const wardsInUse = useMemo(() => new Set(patients.filter((p) => p.status === 'Admitted').map((p) => p.ward)).size, [patients]);
  const edit = (patient) => { setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, patient[k] ?? '']))); setFormError(''); setModal({ kind: 'edit', patient }); };
  const openAdd = () => { setForm(EMPTY); setFormError(''); setModal({ kind: 'add' }); };
  const closeModal = () => { if (!saving) setModal(null); };
  const changeForm = (e) => setForm((old) => ({ ...old, [e.target.name]: e.target.value }));

  async function savePatient(e) {
    e.preventDefault(); setFormError('');
    const name = form.name.trim();
    if (!name || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name)) return setFormError('Enter a name using letters only. Separate name parts with spaces.');
    if (form.age === '' || !/^\d+$/.test(String(form.age)) || Number(form.age) < 0 || Number(form.age) > 120) return setFormError('Age is required and must be a whole number from 0 to 120.');
    for (const key of ['gender', 'ward', 'department', 'doctor']) if (!form[key]) return setFormError(`${fieldLabels[key]} is required.`);
    if (!form.admission_date) return setFormError('Admission date is required.');
    if (form.admission_date > todayInIndia()) return setFormError('Admission date cannot be in the future.');
    setSaving(true);
    try {
      const body = { ...form, name, age: Number(form.age) };
      if (modal.kind === 'add') await request('/api/patients', { method: 'POST', body: JSON.stringify(body) });
      else await request(`/api/patients/${modal.patient.id}`, { method: 'PUT', body: JSON.stringify(body) });
      setModal(null); setNotice(modal.kind === 'add' ? 'Patient added successfully.' : 'Patient details updated.'); setRefreshTick((n) => n + 1);
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  async function discharge(patient) {
    try { await request(`/api/patients/${patient.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Discharged' }) }); setNotice(`${patient.name} marked as discharged.`); setRefreshTick((n) => n + 1); }
    catch (err) { setError(err.message); }
  }
  async function remove(patient) {
    if (!window.confirm(`Delete ${patient.name}'s patient record? This cannot be undone.`)) return;
    try { await request(`/api/patients/${patient.id}`, { method: 'DELETE' }); setNotice('Patient record deleted.'); setRefreshTick((n) => n + 1); }
    catch (err) { setError(err.message); }
  }
  const clearFilters = () => setFilters({ search: '', ward: '', department: '', doctor: '', status: '' });
  const activeFilter = Object.values(filters).some(Boolean);

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={21} strokeWidth={2.5}/></div><span>careflow<span className="brand-dot">.</span></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className="nav-link active"><Users size={18}/><span>Patient admissions</span><span className="nav-count">{total}</span></button>
      <div className="sidebar-bottom"><div className="sidebar-note"><div className="note-icon"><Stethoscope size={17}/></div><div><b>Care, coordinated.</b><span>Patient records in one place.</span></div></div><div className="profile"><div className="avatar">CF</div><div className="profile-text"><b>Care team</b><span>Hospital workspace</span></div><MoreHorizontal size={19}/></div></div>
    </aside>
    {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu size={20}/></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><b>Patient admissions</b></div><div className="top-right"><span className="today-label"><span className="online-dot"/> All systems operational</span><div className="top-avatar">CT</div></div></header>
      <div className="content-wrap">
        <div className="page-heading"><div><div className="eyebrow">HOSPITAL OPERATIONS <span>·</span> PATIENT CARE</div><h1>Patient admissions</h1><p>Keep track of everyone in your care, all in one place.</p></div><button className="primary-btn" onClick={openAdd}><Plus size={17} strokeWidth={2.5}/> Add patient</button></div>
        <section className="stats-grid" aria-label="Patient summary"><Stat icon={<Users size={19}/>} label="Total patients" value={total} detail="Matching your view" tone="green"/><Stat icon={<BedDouble size={19}/>} label="Currently admitted" value={admitted} detail="Active admissions" tone="blue"/><Stat icon={<UserRoundCheck size={19}/>} label="Wards in use" value={wardsInUse} detail="With active patients" tone="peach"/></section>
        <section className="list-section">
          <div className="list-heading"><div><h2>Patient directory</h2><p>Manage admissions, assignments and patient status.</p></div><button className="refresh-btn" onClick={() => setRefreshTick((n) => n + 1)} title="Refresh list"><RotateCcw size={15}/> Refresh</button></div>
          <div className="toolbar"><label className="search-box"><Search size={17}/><input placeholder="Search patients by name..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}/>{filters.search && <button aria-label="Clear search" onClick={() => setFilters({...filters, search:''})}><X size={15}/></button>}</label><div className="filter-label"><SlidersHorizontal size={15}/><span>Filter by</span></div><SelectFilter label="All wards" value={filters.ward} options={options.wards} onChange={(v) => setFilters({...filters, ward:v})}/><SelectFilter label="All departments" value={filters.department} options={options.departments} onChange={(v) => setFilters({...filters, department:v})}/><SelectFilter label="All doctors" value={filters.doctor} options={options.doctors} onChange={(v) => setFilters({...filters, doctor:v})}/><SelectFilter label="Any status" value={filters.status} options={['Admitted','Discharged']} onChange={(v) => setFilters({...filters, status:v})}/>{activeFilter && <button className="clear-btn" onClick={clearFilters}>Clear</button>}</div>
          {error && <div className="error-banner"><span>{error}</span><button onClick={() => setRefreshTick((n) => n + 1)}>Retry</button></div>}
          <div className="table-wrap"><table><thead><tr><th>PATIENT</th><th>WARD & DEPARTMENT</th><th>DOCTOR</th><th>ADMITTED</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {loading && <tr><td colSpan="6"><div className="loading-state"><span className="spinner"/> Loading patient records...</div></td></tr>}
            {!loading && !error && patients.length === 0 && <tr><td colSpan="6"><div className="empty-state"><div className="empty-icon"><Users size={22}/></div><b>{activeFilter ? 'No patients match these filters' : 'No patient records yet'}</b><span>{activeFilter ? 'Try adjusting your search or clearing a filter.' : 'Add your first patient to get started.'}</span>{activeFilter ? <button className="text-action" onClick={clearFilters}>Clear filters</button> : <button className="text-action" onClick={openAdd}>Add a patient <ArrowUpRight size={14}/></button>}</div></td></tr>}
            {!loading && patients.map((p) => <PatientRow key={p.id} patient={p} onEdit={edit} onDelete={remove} onDischarge={discharge}/>)}
          </tbody></table></div>
          <div className="table-footer"><span>Showing <b>{patients.length ? 1 : 0}–{patients.length}</b> of <b>{total}</b> patients</span><span className="secure-label"><span className="secure-dot"/> Records securely stored</span></div>
        </section>
        <footer className="footer">Careflow <span>·</span> Patient admission management <span className="footer-right">Designed for thoughtful care</span></footer>
      </div>
    </main>
    {notice && <div className="toast"><span className="toast-check"><Check size={15}/></span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}
    {modal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><div className="eyebrow">PATIENT RECORD</div><h2 id="modal-title">{modal.kind === 'add' ? 'Add a patient' : 'Edit patient details'}</h2><p>{modal.kind === 'add' ? 'Enter the patient’s admission details below.' : 'Update the details for this patient.'}</p></div><button className="icon-btn close-btn" onClick={closeModal} aria-label="Close"><X size={19}/></button></div><form onSubmit={savePatient} noValidate><div className="form-grid"><Field label="Patient name" required><input name="name" value={form.name} onChange={changeForm} placeholder="e.g. Aanya Patel" autoFocus/></Field><Field label="Age" required><input name="age" type="number" min="0" max="120" step="1" value={form.age} onChange={changeForm} placeholder="Age in years"/></Field><Field label="Gender" required><Select name="gender" value={form.gender} onChange={changeForm} options={options.genders} placeholder="Select gender"/></Field><Field label="Ward" required><Select name="ward" value={form.ward} onChange={changeForm} options={options.wards} placeholder="Select ward"/></Field><Field label="Department" required><Select name="department" value={form.department} onChange={changeForm} options={options.departments} placeholder="Select department"/></Field><Field label="Doctor" required><Select name="doctor" value={form.doctor} onChange={changeForm} options={options.doctors} placeholder="Select doctor"/></Field><Field label="Admission date" required><div className="date-input"><input name="admission_date" type="date" max={todayInIndia()} value={form.admission_date} onChange={changeForm}/><CalendarDays size={16}/></div></Field></div>{formError && <div className="form-error">{formError}</div>}<div className="modal-foot"><span><span className="required-star">*</span> Required fields</span><div><button type="button" className="secondary-btn" onClick={closeModal} disabled={saving}>Cancel</button><button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : modal.kind === 'add' ? <><Plus size={16}/> Add patient</> : <><Check size={16}/> Save changes</>}</button></div></div></form></section></div>}
  </div>;
}

function Stat({ icon, label, value, detail, tone }) { return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><div className="stat-value">{value}<small>{detail}</small></div></div><div className="stat-spark"><span/><span/><span/><span/><span/></div></article>; }
function SelectFilter({ label, value, options, onChange }) { return <div className={`select-filter ${value ? 'selected' : ''}`}><select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}><option value="">{label}</option>{options.map((v) => <option key={v} value={v}>{v}</option>)}</select><ChevronDown size={14}/></div>; }
function PatientRow({ patient: p, onEdit, onDelete, onDischarge }) { const initials = p.name.split(/\s+/).slice(0,2).map((n) => n[0]).join('').toUpperCase(); return <tr><td><div className="patient-cell"><div className={`patient-avatar avatar-${(p.name.charCodeAt(0) || 0)%5}`}>{initials}</div><div className="patient-info"><b>{p.name}</b><span>{p.age} years <i>·</i> {p.gender}</span></div></div></td><td><div className="ward-cell"><b>{p.ward}</b><span>{p.department}</span></div></td><td><div className="doctor-cell"><div className="doctor-icon"><Stethoscope size={14}/></div><span>{p.doctor}</span></div></td><td><div className="date-cell">{new Date(`${p.admission_date}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></td><td><span className={`status-pill ${p.status === 'Admitted' ? 'admitted' : 'discharged'}`}><span/>{p.status}</span></td><td><div className="row-actions"><button title="Edit patient" aria-label={`Edit ${p.name}`} onClick={() => onEdit(p)}><Pencil size={15}/></button>{p.status === 'Admitted' && <button className="discharge-action" title="Mark as discharged" aria-label={`Discharge ${p.name}`} onClick={() => onDischarge(p)}><Check size={16}/></button>}<button className="delete-action" title="Delete patient" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p)}><Trash2 size={15}/></button></div></td></tr>; }
function Field({ label, required, children }) { return <label className="form-field"><span>{label}{required && <em> *</em>}</span>{children}</label>; }
function Select({ name, value, onChange, options, placeholder }) { return <div className="form-select"><select name={name} value={value} onChange={onChange}><option value="">{placeholder}</option>{options.map((o) => <option key={o}>{o}</option>)}</select><ChevronDown size={15}/></div>; }

createRoot(document.getElementById('root')).render(<App/>);





