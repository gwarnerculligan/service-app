import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, updateDoc, addDoc } from 'firebase/firestore';
import { 
  Truck, MapPin, AlertCircle, CheckCircle, Plus, LogOut, User, Briefcase, Clock, Users, Navigation, ExternalLink, Camera, FileText, X
} from 'lucide-react';

const apiKey = "";

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDb7Gc5_bycttH0h77Z9xK4Xv4XOpUO0nc",
  authDomain: "serviceapp-94935.firebaseapp.com",
  projectId: "serviceapp-94935",
  storageBucket: "serviceapp-94935.firebasestorage.app",
  messagingSenderId: "1023263281742",
  appId: "1:1023263281742:web:ad61e0af399cf9c2b5a91f",
  measurementId: "G-BBR2KL3Y2J"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'service-app-v1';

const SERVICE_AREAS = [
  "Downtown", "Monkey Junction", "Carolina Beach", "Oleander", "Market St",
  "Castle Hayne", "Porters Neck", "Hampstead", "Leland", "Southport",
  "Midtown", "Pine Valley", "UNCW Area", "Sunset Park", "Ogden",
  "Mayfaire", "Landfall", "Middle Sound", "Bayshore", "Wrightsville Beach",
  "Masonboro", "Murrayville", "Oak Island"
];

const groupCallsByArea = (callsArray) => {
  const grouped = callsArray.reduce((acc, call) => {
    const area = call.area || "Unassigned Area";
    if (!acc[area]) acc[area] = [];
    acc[area].push(call);
    return acc;
  }, {});
  
  return Object.keys(grouped).sort((a, b) => {
    if (a === "Unassigned Area") return 1;
    if (b === "Unassigned Area") return -1;
    return a.localeCompare(b);
  }).reduce((acc, key) => {
    acc[key] = grouped[key];
    return acc;
  }, {});
};

const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

const getCurrentLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
};

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null); 
  const [serviceCalls, setServiceCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const callsRef = collection(db, 'artifacts', appId, 'public', 'data', 'serviceCalls');
    const unsubscribe = onSnapshot(
      callsRef, 
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setServiceCalls(data);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="font-sans">
      {/* BULLDOZER CSS OVERRIDE: Forces full width and black font */}
      <style>{`
        :root, body, #root { 
          width: 100vw !important;
          max-width: 100% !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: #f8fafc !important; 
          text-align: left !important;
        }
        
        /* Force solid black text everywhere */
        h1, h2, h3, h4, p, span, label, input, select, textarea, button, div { 
          color: #000000 !important; 
          opacity: 1 !important; 
        }
        
        /* White text for elements inside blue/green backgrounds */
        .text-white, .text-white *, .bg-blue-600 *, .bg-blue-700 *, .bg-green-600 *, .bg-slate-900 * { 
          color: #ffffff !important; 
        }

        select option { 
          color: #000000 !important; 
          background: #ffffff !important;
        }

        *:focus { outline: none !important; }
      `}</style>

      {!appUser ? (
        <Login onLogin={(name, role) => setAppUser({ name, role })} />
      ) : (
        <div className="min-h-screen bg-slate-100 pb-10 w-full">
          {isLocating && (
            <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50 font-black text-blue-600 text-xl">
              Updating GPS...
            </div>
          )}
          <nav className="bg-blue-700 p-5 shadow-lg sticky top-0 z-10 flex justify-between items-center w-full border-none">
            <div className="flex items-center space-x-3">
              <Truck className="text-white" size={28} /> 
              <span className="font-black text-2xl text-white tracking-tight">ServiceApp</span>
            </div>
            <div className="flex items-center space-x-4 text-base font-bold">
              <span className="hidden sm:inline text-white bg-blue-800 px-3 py-1 rounded-md">{appUser.name} ({appUser.role})</span>
              <button onClick={() => setAppUser(null)} className="p-2 hover:bg-blue-900 rounded-lg text-white transition-colors bg-blue-800 border-none cursor-pointer">
                <LogOut size={22}/>
              </button>
            </div>
          </nav>

          <main className="w-full max-w-none px-4 md:px-8 py-6">
            {appUser.role === 'Office Staff' ? (
              <ManagerView calls={serviceCalls} user={appUser.name} db={db} appId={appId} />
            ) : (
              <DriverView calls={serviceCalls} user={appUser.name} db={db} appId={appId} setLoc={setIsLocating} />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Driver');
  
  const DRIVERS = ["Chris", "Elijah", "Eric", "Garrett", "Jeremy", "Lynwood"];
  const OFFICE_STAFF = ["Brooke", "Garrett", "Hailee", "Jenna", "Kelly", "Logan"];

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setName('');
  };

  const currentNames = role === 'Driver' ? DRIVERS : OFFICE_STAFF;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-200 p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-lg border-4 border-white">
        <div className="flex justify-center mb-6 text-blue-600"><Truck size={80}/></div>
        <h1 className="text-4xl font-black text-center mb-10 text-black uppercase tracking-tighter">ServiceApp Access</h1>
        
        <div className="grid grid-cols-2 gap-5 mb-10">
          <button 
            onClick={() => handleRoleChange('Driver')} 
            className={`p-5 rounded-2xl border-4 flex flex-col items-center transition-all cursor-pointer ${role === 'Driver' ? 'bg-blue-600 border-blue-600 shadow-xl scale-105' : 'bg-slate-50 border-slate-300 hover:border-blue-400 hover:bg-slate-100'}`}
          >
            <Briefcase size={32} className={role === 'Driver' ? 'text-white' : 'text-slate-500'}/>
            <span className={`text-base mt-3 font-black uppercase ${role === 'Driver' ? 'text-white' : 'text-black'}`}>Driver</span>
          </button>
          <button 
            onClick={() => handleRoleChange('Office Staff')} 
            className={`p-5 rounded-2xl border-4 flex flex-col items-center transition-all cursor-pointer ${role === 'Office Staff' ? 'bg-blue-600 border-blue-600 shadow-xl scale-105' : 'bg-slate-50 border-slate-300 hover:border-blue-400 hover:bg-slate-100'}`}
          >
            <User size={32} className={role === 'Office Staff' ? 'text-white' : 'text-slate-500'}/>
            <span className={`text-base mt-3 font-black uppercase ${role === 'Office Staff' ? 'text-white' : 'text-black'}`}>Office Staff</span>
          </button>
        </div>

        <div className="space-y-3 mb-10 text-left">
          <label className="block text-sm font-black text-black uppercase tracking-widest ml-2">Who are you?</label>
          <select 
            className="w-full border-4 border-slate-300 p-5 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none bg-slate-50 cursor-pointer text-black font-black text-xl shadow-inner transition-all appearance-none" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          >
            <option value="" disabled>Choose your name...</option>
            {currentNames.map(member => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => name && onLogin(name, role)} 
          className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-2xl hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all shadow-[0_8px_30px_rgb(37,99,235,0.3)] active:scale-95 uppercase tracking-wider border-none cursor-pointer"
          disabled={!name}
        >
          Launch System
        </button>
      </div>
    </div>
  );
}

function ManagerView({ calls, user, db, appId }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ customerName: '', address: '', phone: '', notes: '', urgency: 'Medium', imageUri: '', area: '' });
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [viewImage, setViewImage] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsScanning(true);
    setScanError('');
    try {
      const compressImage = (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_DIM = 1000;
              if (width > height && width > MAX_DIM) {
                height *= MAX_DIM / width;
                width = MAX_DIM;
              } else if (height > MAX_DIM) {
                width *= MAX_DIM / height;
                height = MAX_DIM;
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
          };
        });
      };

      const compressedDataUrl = await compressImage(file);
      const base64Data = compressedDataUrl.split(',')[1];
      
      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: `Extract service info. Areas: ${SERVICE_AREAS.join(', ')}.` },
            { inlineData: { mimeType: file.type, data: base64Data } }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              customerName: { type: "STRING" },
              address: { type: "STRING" },
              phone: { type: "STRING" },
              notes: { type: "STRING" },
              urgency: { type: "STRING" },
              area: { type: "STRING" }
            }
          }
        }
      };

      const result = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textOutput) {
        const data = JSON.parse(textOutput);
        setForm(prev => ({
          ...prev,
          customerName: data.customerName || prev.customerName,
          address: data.address || prev.address,
          phone: data.phone || prev.phone,
          notes: data.notes || prev.notes,
          urgency: data.urgency || prev.urgency,
          area: SERVICE_AREAS.includes(data.area) ? data.area : prev.area,
          imageUri: compressedDataUrl
        }));
      }
    } catch (err) {
      setScanError("Scan failed.");
    } finally {
      setIsScanning(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.address || !form.area) {
      setScanError("Fill all required fields.");
      return;
    }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'serviceCalls'), { 
        ...form, 
        status: 'open', 
        createdAt: Date.now(), 
        createdBy: user,
        claimedBy: null
      });
      setShow(false);
      setForm({ customerName: '', address: '', phone: '', notes: '', urgency: 'Medium', imageUri: '', area: '' });
    } catch (err) {
      setScanError("Failed to save.");
    }
  };

  return (
    <div className="space-y-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-200">
        <h2 className="text-4xl font-black text-black uppercase tracking-tight">Active Queue</h2>
        <button 
          onClick={() => setShow(!show)} 
          className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl flex items-center justify-center space-x-3 hover:bg-blue-700 transition-all shadow-xl font-black uppercase text-xl border-none cursor-pointer"
        >
          {show ? <span>Cancel Form</span> : <><Plus size={28}/> <span>Add New Job</span></>}
        </button>
      </div>
      
      {show && (
        <form onSubmit={add} className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-2xl border-4 border-slate-300 space-y-10 text-left animate-in fade-in slide-in-from-top-4">
          <div className="bg-blue-50 border-4 border-blue-200 rounded-3xl p-8 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-inner">
            <div className="text-left w-full">
              <h3 className="font-black text-blue-900 flex items-center uppercase text-xl tracking-widest"><Camera size={32} className="mr-4" /> Camera Auto-Fill</h3>
              <p className="text-lg text-blue-800 mt-2 font-bold opacity-80">Snap a photo of the service call sheet to fill this form instantly.</p>
            </div>
            <div className="relative w-full lg:w-auto shrink-0">
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isScanning} capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <button type="button" disabled={isScanning} className="w-full bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-xl uppercase hover:bg-blue-700 shadow-xl border-none active:scale-95 transition-all cursor-pointer">
                {isScanning ? "Scanning..." : "Open Camera"}
              </button>
            </div>
          </div>

          <div className="grid gap-10">
            <div>
              <label className="block text-base font-black text-black uppercase tracking-widest mb-4 ml-2">Customer Name</label>
              <input placeholder="Who is the customer?" className="w-full border-4 border-slate-300 p-6 rounded-2xl text-black font-black text-xl bg-slate-50 focus:border-blue-600 focus:bg-white focus:ring-8 focus:ring-blue-100 outline-none transition-all" required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
            </div>
            <div className="grid lg:grid-cols-2 gap-10">
              <div>
                <label className="block text-base font-black text-black uppercase tracking-widest mb-4 ml-2">Service Area</label>
                <select className="w-full border-4 border-slate-300 p-6 rounded-2xl text-black font-black text-xl bg-slate-50 outline-none focus:border-blue-600 focus:bg-white focus:ring-8 focus:ring-blue-100 appearance-none transition-all cursor-pointer" required value={form.area} onChange={e => setForm({...form, area: e.target.value})} >
                  <option value="" disabled>Select the area...</option>
                  {SERVICE_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-base font-black text-black uppercase tracking-widest mb-4 ml-2">Phone Number</label>
                <input placeholder="Contact info" className="w-full border-4 border-slate-300 p-6 rounded-2xl text-black font-black text-xl bg-slate-50 focus:border-blue-600 focus:bg-white focus:ring-8 focus:ring-blue-100 outline-none transition-all" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-base font-black text-black uppercase tracking-widest mb-4 ml-2">Job Address</label>
              <input placeholder="Street, City, State" className="w-full border-4 border-slate-300 p-6 rounded-2xl text-black font-black text-xl bg-slate-50 focus:border-blue-600 focus:bg-white focus:ring-8 focus:ring-blue-100 outline-none transition-all" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <label className="block text-base font-black text-black uppercase tracking-widest mb-4 ml-2">Notes & Instructions</label>
              <textarea placeholder="Gate codes, gate keys, or specific repair details..." rows={5} className="w-full border-4 border-slate-300 p-6 rounded-2xl text-black font-black text-xl bg-slate-50 focus:border-blue-600 focus:bg-white focus:ring-8 focus:ring-blue-100 outline-none transition-all resize-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>
          <button className="bg-green-600 text-white w-full py-8 rounded-[1.5rem] font-black text-3xl hover:bg-green-700 shadow-[0_15px_40px_rgb(22,163,74,0.4)] uppercase tracking-widest transition-all active:scale-95 border-none mt-6 cursor-pointer">Post Job to Board</button>
        </form>
      )}

      <div className="space-y-12 text-left mt-10">
        {calls.length === 0 ? (
          <div className="text-center py-32 text-slate-500 font-black text-2xl uppercase tracking-[0.2em] bg-white rounded-[2rem] border-8 border-dashed border-slate-200">The Board is Empty</div>
        ) : (
          Object.entries(groupCallsByArea(calls)).map(([area, areaCalls]) => (
            <div key={area} className="space-y-6">
              <div className="flex items-center space-x-4 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-xl w-fit border-none">
                <MapPin size={24} className="text-white" /> 
                <span className="font-black uppercase text-lg tracking-widest text-white">{area} ({areaCalls.length})</span>
              </div>
              <div className="grid gap-8">
                {areaCalls.map(c => (
                  <div key={c.id} className="bg-white p-8 md:p-12 rounded-[2rem] border-4 border-slate-300 border-l-[16px] border-l-blue-600 shadow-2xl flex flex-col md:flex-row justify-between items-start gap-10">
                    <div className="flex-1 w-full">
                      <h3 className="text-4xl md:text-5xl font-black text-black mb-6 uppercase tracking-tight">{c.customerName}</h3>
                      <div className="space-y-4 mb-8 font-black">
                        <p className="flex items-start text-black text-2xl leading-snug"><MapPin size={32} className="mr-4 mt-1 text-blue-600 shrink-0"/> {c.address}</p>
                        {c.phone && <p className="text-blue-700 text-3xl font-black">📞 <span className="ml-4">{c.phone}</span></p>}
                      </div>
                      {c.notes && (
                        <div className="bg-slate-50 p-8 rounded-[1.5rem] border-4 border-slate-200 mb-8 shadow-inner">
                          <span className="text-sm font-black text-slate-500 uppercase tracking-widest block mb-4 underline decoration-slate-400 decoration-4 underline-offset-8">Instructions</span>
                          <p className="text-2xl font-bold text-black leading-relaxed">{c.notes}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-6 items-center mt-8 pt-8 border-t-4 border-slate-100 font-black text-sm uppercase tracking-widest">
                        {c.claimedAtLoc && <a href={`https://www.google.com/maps?q=${c.claimedAtLoc.lat},${c.claimedAtLoc.lng}`} target="_blank" rel="noreferrer" className="text-blue-700 flex items-center bg-blue-50 px-6 py-3 rounded-xl border-4 border-blue-200 hover:bg-blue-100 transition-colors">📍 Start Location</a>}
                        {c.completedAtLoc && <a href={`https://www.google.com/maps?q=${c.completedAtLoc.lat},${c.completedAtLoc.lng}`} target="_blank" rel="noreferrer" className="text-green-700 flex items-center bg-green-50 px-6 py-3 rounded-xl border-4 border-green-200 hover:bg-green-100 transition-colors">✅ End Location</a>}
                        {c.imageUri && <button onClick={() => setViewImage(c.imageUri)} className="text-black flex items-center bg-slate-200 px-6 py-3 rounded-xl border-4 border-slate-300 hover:bg-slate-300 transition-colors cursor-pointer border-none font-black uppercase text-sm">📄 View Scanned Sheet</button>}
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-6 shrink-0 bg-slate-100 p-8 rounded-3xl border-4 border-slate-200">
                      <span className={`text-base uppercase font-black px-6 py-3 rounded-full border-4 shadow-md ${c.status === 'open' ? 'bg-white text-black border-slate-400' : c.status === 'completed' ? 'bg-green-100 text-green-900 border-green-600' : 'bg-blue-100 text-blue-900 border-blue-600'}`}>
                        {c.status}
                      </span>
                      <p className="text-xl font-black text-black flex items-center gap-3 uppercase bg-white px-4 py-2 rounded-xl shadow-sm border-2 border-slate-200"><User size={24} className="text-slate-400"/> {c.claimedBy || 'Open Job'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {viewImage && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4" onClick={() => setViewImage(null)}>
          <div className="relative max-w-6xl w-full max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute -top-16 right-0 text-white hover:text-red-500 p-4 transition-colors border-none cursor-pointer"><X size={64} /></button>
            <img src={viewImage} alt="Sheet" className="max-w-full max-h-[85vh] object-contain rounded-[2rem] bg-white shadow-[0_0_80px_rgba(255,255,255,0.3)] border-[12px] border-white" />
          </div>
        </div>
      )}
    </div>
  );
}

function DriverView({ calls, user, db, appId, setLoc }) {
  const [tab, setTab] = useState('open');
  const [viewImage, setViewImage] = useState(null);
  const available = calls.filter(c => c.status === 'open');
  const mine = calls.filter(c => c.claimedBy === user);
  const team = calls.filter(c => c.status === 'claimed' && c.claimedBy !== user);

  const update = async (id, status, locKey) => {
    setLoc(true);
    const location = await getCurrentLocation();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'serviceCalls', id), { status, claimedBy: user, [locKey]: location });
      if (status === 'claimed') setTab('mine');
    } catch (err) {
      console.error(err);
    } finally {
      setLoc(false);
    }
  };

  return (
    <div className="space-y-10 w-full">
      <div className="flex bg-white rounded-[2rem] p-4 border-8 border-slate-300 shadow-2xl sticky top-24 z-10 w-full">
        {['open', 'mine', 'team'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-6 rounded-2xl text-lg md:text-xl font-black uppercase tracking-widest transition-all border-none cursor-pointer ${tab === t ? 'bg-blue-600 text-white shadow-2xl scale-[1.03] z-20' : 'text-slate-500 hover:bg-slate-100 hover:text-black'}`}>
            {t === 'open' ? `Board (${available.length})` : t === 'mine' ? 'My Jobs' : 'Team'}
          </button>
        ))}
      </div>
      
      <div className="space-y-12 text-left w-full">
        {tab === 'open' && (
          available.length === 0 ? <div className="text-center py-40 text-slate-500 font-black text-3xl uppercase tracking-[0.3em] bg-white rounded-[2rem] border-8 border-dashed border-slate-200">The Board is Clear</div> :
          Object.entries(groupCallsByArea(available)).map(([area, areaCalls]) => (
            <div key={area} className="space-y-6">
              <div className="flex items-center space-x-4 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-xl w-fit border-none">
                <MapPin size={28} className="text-white" /> 
                <span className="font-black uppercase text-xl tracking-widest text-white">{area}</span>
              </div>
              {areaCalls.map(c => (
                <div key={c.id} className="bg-white p-8 md:p-12 rounded-[2.5rem] border-[6px] border-slate-300 shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-bottom-4 transition-all hover:border-blue-400">
                  <h3 className="font-black text-5xl md:text-6xl text-black mb-8 uppercase tracking-tighter leading-none">{c.customerName}</h3>
                  <div className="space-y-8 mb-12 font-black">
                    <p className="flex items-start text-black text-3xl leading-snug"><MapPin size={40} className="mr-6 mt-1 text-blue-600 shrink-0"/> {c.address}</p>
                    {c.phone && <p className="text-blue-700 text-4xl font-black underline decoration-[8px] decoration-blue-100 ml-2"><a href={`tel:${c.phone.replace(/[^0-9]/g, '')}`}>📞 <span className="ml-4">{c.phone}</span></a></p>}
                    {c.notes && (
                      <div className="bg-yellow-50 p-10 rounded-3xl border-[6px] border-yellow-300 text-black shadow-inner">
                        <span className="font-black text-lg uppercase tracking-widest text-yellow-900 block mb-4 underline decoration-yellow-400 decoration-[6px] underline-offset-[12px]">Instructions</span>
                        <p className="font-bold text-3xl leading-relaxed">{c.notes}</p>
                      </div>
                    )}
                    {c.imageUri && <button onClick={() => setViewImage(c.imageUri)} className="w-full bg-slate-100 py-6 rounded-2xl font-black text-black border-4 border-slate-300 uppercase text-lg tracking-widest flex items-center justify-center gap-4 transition-colors hover:bg-slate-300 border-none mt-6 shadow-md cursor-pointer"><FileText size={32}/> Open Full Job Sheet</button>}
                  </div>
                  <button onClick={() => update(c.id, 'claimed', 'claimedAtLoc')} className="w-full bg-blue-600 text-white py-10 rounded-3xl font-black text-4xl hover:bg-blue-700 shadow-[0_20px_60px_rgba(37,99,235,0.5)] uppercase tracking-[0.2em] active:scale-95 transition-all border-none cursor-pointer">Claim This Job</button>
                </div>
              ))}
            </div>
          ))
        )}
        
        {tab === 'mine' && (
          mine.length === 0 ? <div className="text-center py-40 text-slate-500 font-black text-3xl uppercase tracking-[0.3em] bg-white rounded-[2rem] border-8 border-dashed border-slate-200">No Jobs Claimed</div> :
          mine.map(c => (
            <div key={c.id} className="bg-white p-8 md:p-12 rounded-[2.5rem] border-[12px] border-blue-600 shadow-2xl">
              <div className="bg-blue-100 text-blue-900 font-black uppercase tracking-widest text-xl inline-block px-8 py-4 rounded-2xl mb-8 border-4 border-blue-300 shadow-sm">You are working this job</div>
              <h3 className="font-black text-5xl md:text-6xl text-black mb-8 uppercase tracking-tighter leading-none">{c.customerName}</h3>
              <div className="space-y-8 mb-12 font-black">
                <p className="flex items-start text-black text-3xl leading-snug"><MapPin size={40} className="mr-6 mt-1 text-blue-600 shrink-0"/> <span>{c.address} <span className="text-blue-700 ml-4 opacity-80">({c.area})</span></span></p>
                {c.phone && <p className="text-blue-700 text-4xl font-black ml-2"><a href={`tel:${c.phone.replace(/[^0-9]/g, '')}`}>📞 <span className="ml-4 underline decoration-[8px] decoration-blue-200">{c.phone}</span></a></p>}
                {c.notes && <div className="bg-yellow-50 p-10 rounded-3xl border-[6px] border-yellow-300 text-black font-bold shadow-inner text-3xl leading-relaxed">
                  <span className="font-black text-lg uppercase tracking-widest text-yellow-900 block mb-4 underline decoration-yellow-400 decoration-[6px] underline-offset-[12px]">Instructions</span>
                  {c.notes}
                </div>}
                 {c.imageUri && <button onClick={() => setViewImage(c.imageUri)} className="w-full bg-slate-100 py-6 rounded-2xl font-black text-black border-4 border-slate-300 uppercase text-lg tracking-widest flex items-center justify-center gap-4 transition-colors hover:bg-slate-300 border-none mt-6 shadow-md cursor-pointer"><FileText size={32}/> View Job Sheet</button>}
              </div>
              {c.status === 'claimed' ? (
                <button onClick={() => update(c.id, 'completed', 'completedAtLoc')} className="w-full bg-green-600 text-white py-10 rounded-3xl font-black text-4xl hover:bg-green-700 shadow-[0_20px_60px_rgba(22,163,74,0.5)] uppercase tracking-[0.2em] active:scale-95 transition-all border-none cursor-pointer">Mark as Finished</button>
              ) : (
                <div className="text-center text-green-900 font-black bg-green-100 py-10 rounded-3xl border-8 border-green-500 uppercase tracking-[0.2em] text-4xl shadow-inner">Job Complete ✓</div>
              )}
            </div>
          ))
        )}
        
        {tab === 'team' && (
          team.length === 0 ? <div className="text-center py-40 text-slate-500 font-black text-3xl uppercase tracking-[0.3em] bg-white rounded-[2rem] border-8 border-dashed border-slate-200">No One Else Working</div> :
          <div className="grid gap-6">
            {team.map(c => (
              <div key={c.id} className="bg-white p-8 rounded-3xl border-4 border-slate-200 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                  <h3 className="font-black text-3xl text-black uppercase tracking-tight">{c.customerName}</h3>
                  <p className="text-lg text-blue-900 font-black uppercase tracking-widest mt-3">{c.area} • {c.address.split(',')[0]}</p>
                </div>
                <div className="flex items-center gap-4 bg-blue-600 text-white px-8 py-5 rounded-2xl shadow-xl border-4 border-white">
                  <User size={32}/>
                  <span className="font-black uppercase text-xl tracking-widest">{c.claimedBy}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewImage && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4" onClick={() => setViewImage(null)}>
          <div className="relative max-w-7xl w-full max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute -top-20 right-0 text-white hover:text-red-500 p-6 transition-colors border-none cursor-pointer"><X size={80} /></button>
            <img src={viewImage} alt="Sheet" className="max-w-full max-h-[85vh] object-contain rounded-[3rem] bg-white shadow-[0_0_100px_rgba(255,255,255,0.3)] border-[16px] border-white" />
          </div>
        </div>
      )}
    </div>
  );
}