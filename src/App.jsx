import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, updateDoc, addDoc } from 'firebase/firestore';
import { 
  Truck, MapPin, AlertCircle, CheckCircle, Plus, LogOut, User, Briefcase, Clock, Users, Navigation, ExternalLink, Camera, FileText, X
} from 'lucide-react';

// --- API KEY INTEGRATED ---
const apiKey = "AIzaSyCTbgLjZw5PURGU8Kvq4E5G3Ubp2dAHpd8";

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

// Updated fetch function to catch specific AI errors
const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
          const errData = await response.json();
          throw new Error(`API Error ${response.status}: ${errData.error?.message || 'Unknown error'}`);
      }
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="font-sans">
      <style>{`
        :root, body, #root { 
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: #f1f5f9 !important; 
          text-align: left !important;
          color: #0f172a !important; 
        }
        
        h1, h2, h3, h4, p, span, label, input, select, textarea, button, div { 
          color: #1e293b !important; 
          font-weight: 600;
        }
        
        h1, h2, h3 { font-weight: 800 !important; color: #0f172a !important; }

        .text-white, .text-white *, .bg-blue-600 *, .bg-blue-700 *, .bg-green-600 * { 
          color: #ffffff !important; 
        }

        select option { color: #000000 !important; background: #ffffff !important; }

        .app-width {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .hidden { display: none; }
      `}</style>

      {!appUser ? (
        <Login onLogin={(name, role) => setAppUser({ name, role })} />
      ) : (
        <div className="min-h-screen bg-slate-100 pb-10 w-full">
          {isLocating && (
            <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50 font-bold text-blue-600 text-lg">
              Updating GPS...
            </div>
          )}
          <nav className="bg-blue-700 p-4 shadow-md sticky top-0 z-10 w-full border-none">
            <div className="app-width flex justify-between items-center px-4">
              <div className="flex items-center space-x-2">
                <Truck className="text-white" size={24} /> 
                <span className="font-bold text-xl text-white tracking-tight">ServiceApp</span>
              </div>
              <div className="flex items-center space-x-3 text-sm font-bold">
                <span className="hidden sm:inline text-white bg-blue-800 px-3 py-1 rounded-md">{appUser.name}</span>
                <button onClick={() => setAppUser(null)} className="p-2 hover:bg-blue-900 rounded-lg text-white transition-colors bg-blue-800 border-none cursor-pointer">
                  <LogOut size={20}/>
                </button>
              </div>
            </div>
          </nav>

          <main className="app-width p-4 md:p-6">
            {appUser.role === 'Office Staff' ? (
              <ManagerView calls={serviceCalls} user={appUser.name} db={db} appId={appId} />
            ) : (
              <DriverView calls={serviceCalls} user={appUser.name} db={appId} setLoc={setIsLocating} />
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
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md border-2 border-white">
        <div className="flex justify-center mb-4 text-blue-600"><Truck size={56}/></div>
        <h1 className="text-3xl font-bold text-center mb-8 text-slate-900 uppercase tracking-tight">Access Portal</h1>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => handleRoleChange('Driver')} 
            className={`p-4 rounded-2xl border-2 flex flex-col items-center transition-all cursor-pointer ${role === 'Driver' ? 'bg-blue-600 border-blue-600 shadow-md scale-105' : 'bg-slate-50 border-slate-200 hover:border-blue-400'}`}
          >
            <Briefcase size={24} className={role === 'Driver' ? 'text-white' : 'text-slate-400'}/>
            <span className={`text-xs mt-2 font-bold uppercase ${role === 'Driver' ? 'text-white' : 'text-slate-600'}`}>Driver</span>
          </button>
          <button 
            onClick={() => handleRoleChange('Office Staff')} 
            className={`p-4 rounded-2xl border-2 flex flex-col items-center transition-all cursor-pointer ${role === 'Office Staff' ? 'bg-blue-600 border-blue-600 shadow-md scale-105' : 'bg-slate-50 border-slate-200 hover:border-blue-400'}`}
          >
            <User size={24} className={role === 'Office Staff' ? 'text-white' : 'text-slate-400'}/>
            <span className={`text-xs mt-2 font-bold uppercase ${role === 'Office Staff' ? 'text-white' : 'text-slate-600'}`}>Office</span>
          </button>
        </div>

        <div className="space-y-2 mb-8 text-left">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Identity Selection</label>
          <select 
            className="w-full border-2 border-slate-200 p-4 rounded-xl focus:border-blue-600 outline-none bg-slate-50 cursor-pointer text-slate-900 font-bold text-lg appearance-none shadow-sm" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          >
            <option value="" disabled>Choose name...</option>
            {currentNames.map(member => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => name && onLogin(name, role)} 
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-xl hover:bg-blue-700 disabled:opacity-40 transition-all active:scale-95 uppercase tracking-wider border-none cursor-pointer"
          disabled={!name}
        >
          Enter App
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

    if (!apiKey || apiKey === "") {
        setScanError("API Key is missing. Please update the code.");
        return;
    }

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
              const MAX_DIM = 1200;
              if (width > height && width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; } 
              else if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7)); // We convert EVERYTHING to a pure JPEG
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
            { text: `Analyze this service call sheet. Extract: customerName, address, phone, and notes (any special instructions). Map the address to the best matching area from this list: ${SERVICE_AREAS.join(', ')}. Return valid JSON only.` },
            { inlineData: { mimeType: "image/jpeg", data: base64Data } } // FIX: Tell Google it is definitively a JPEG
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { // FIX: Strict JSON enforcement so it doesn't break the form
            type: "OBJECT",
            properties: {
              customerName: { type: "STRING" },
              address: { type: "STRING" },
              phone: { type: "STRING" },
              notes: { type: "STRING" },
              area: { type: "STRING" }
            }
          }
        }
      };

      const result = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );

      const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textOutput) {
        const jsonStr = textOutput.replace(/```json|```/gi, '').trim();
        const data = JSON.parse(jsonStr);
        setForm(prev => ({
          ...prev,
          customerName: data.customerName || '',
          address: data.address || '',
          phone: data.phone || '',
          notes: data.notes || '',
          area: SERVICE_AREAS.includes(data.area) ? data.area : '',
          imageUri: compressedDataUrl
        }));
      }
    } catch (err) {
      console.error("AI Error:", err);
      // Improved error message to tell us EXACTLY what broke if it fails again
      setScanError(`AI Error: ${err.message || "Couldn't read sheet."} Please enter manually.`);
    } finally {
      setIsScanning(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.address || !form.area) {
      setScanError("Please fill out Name, Area, and Address.");
      return;
    }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'serviceCalls'), { 
        ...form, status: 'open', createdAt: Date.now(), createdBy: user, claimedBy: null
      });
      setShow(false);
      setForm({ customerName: '', address: '', phone: '', notes: '', urgency: 'Medium', imageUri: '', area: '' });
    } catch (err) {
      setScanError("Save failed. Check connection.");
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight ml-2">Service Queue</h2>
        <button 
          onClick={() => setShow(!show)} 
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-700 transition-all shadow-md font-bold uppercase text-sm border-none cursor-pointer"
        >
          {show ? <span>Cancel</span> : <><Plus size={18}/> <span>New Job</span></>}
        </button>
      </div>
      
      {show && (
        <form onSubmit={add} className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-slate-200 space-y-6 text-left animate-in fade-in slide-in-from-top-4">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-inner">
            <div className="text-left w-full">
              <h3 className="font-bold text-blue-900 flex items-center uppercase text-sm tracking-widest"><Camera size={18} className="mr-3" /> Camera Fill</h3>
              <p className="text-xs text-blue-800 mt-1 font-bold opacity-70">Snap a photo to fill the form automatically.</p>
            </div>
            <div className="w-full sm:w-auto shrink-0">
               <label className="block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase hover:bg-blue-700 shadow-md cursor-pointer text-center active:scale-95 transition-all">
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isScanning} capture="environment" className="hidden" />
                {isScanning ? "Processing..." : "Open Camera"}
              </label>
            </div>
          </div>
          {scanError && <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-100">{scanError}</div>}

          <div className="grid gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Customer Name</label>
              <input placeholder="Name..." className="w-full border-2 border-slate-200 p-4 rounded-xl text-slate-900 font-bold text-base bg-slate-50 focus:border-blue-500 focus:bg-white outline-none" required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Area</label>
                <select className="w-full border-2 border-slate-200 p-4 rounded-xl text-slate-900 font-bold text-base bg-slate-50 outline-none focus:border-blue-600 focus:bg-white appearance-none transition-all cursor-pointer" required value={form.area} onChange={e => setForm({...form, area: e.target.value})} >
                  <option value="" disabled>Select area...</option>
                  {SERVICE_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Phone</label>
                <input placeholder="Phone..." className="w-full border-2 border-slate-200 p-4 rounded-xl text-slate-900 font-bold text-base bg-slate-50 focus:border-blue-600 focus:bg-white outline-none" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Address</label>
              <input placeholder="Address..." className="w-full border-2 border-slate-200 p-4 rounded-xl text-slate-900 font-bold text-base bg-slate-50 focus:border-blue-600 focus:bg-white outline-none" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Notes</label>
              <textarea placeholder="Instructions..." rows={3} className="w-full border-2 border-slate-200 p-4 rounded-xl text-slate-900 font-bold text-base bg-slate-50 focus:border-blue-600 focus:bg-white outline-none resize-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>
          <button className="bg-green-600 text-white w-full py-5 rounded-2xl font-bold text-xl hover:bg-green-700 shadow-lg uppercase tracking-widest transition-all active:scale-95 border-none mt-4 cursor-pointer">Publish Job</button>
        </form>
      )}

      <div className="space-y-6 text-left mt-8 w-full">
        {calls.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold text-base uppercase tracking-widest bg-white rounded-3xl border-2 border-dashed border-slate-200">No active service calls.</div>
        ) : (
          Object.entries(groupCallsByArea(calls)).map(([area, areaCalls]) => (
            <div key={area} className="space-y-3">
              <div className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-1.5 rounded-lg shadow-sm w-fit border-none ml-1">
                <MapPin size={14} className="text-white" /> 
                <span className="font-bold uppercase text-[10px] tracking-widest text-white">{area} ({areaCalls.length})</span>
              </div>
              <div className="grid gap-4">
                {areaCalls.map(c => (
                  <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 border-l-[8px] border-l-blue-600 shadow-sm flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1 w-full">
                      <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{c.customerName}</h3>
                      <div className="text-sm font-bold text-slate-600 mt-2 space-y-1">
                        <p className="flex items-start"><MapPin size={16} className="mr-2 mt-0.5 text-blue-500 shrink-0"/> {c.address}</p>
                        {c.phone && <p className="text-blue-600">📞 <span className="ml-2">{c.phone}</span></p>}
                      </div>
                      {c.notes && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4 text-sm font-medium text-slate-700 shadow-inner">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Notes:</span>
                          {c.notes}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 items-center mt-4 pt-4 border-t border-slate-100 font-bold text-[10px] uppercase tracking-widest">
                        {c.claimedAtLoc && <a href={`https://www.google.com/maps?q=${c.claimedAtLoc.lat},${c.claimedAtLoc.lng}`} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center">📍 Claimed</a>}
                        {c.completedAtLoc && <a href={`https://www.google.com/maps?q=${c.completedAtLoc.lat},${c.completedAtLoc.lng}`} target="_blank" rel="noreferrer" className="text-green-600 flex items-center">✅ Finished</a>}
                        {c.imageUri && <button onClick={() => setViewImage(c.imageUri)} className="text-slate-500 flex items-center bg-slate-100 px-3 py-1 rounded cursor-pointer border-none font-bold uppercase">📄 View Sheet</button>}
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 shrink-0">
                      <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border-2 ${c.status === 'open' ? 'bg-slate-50 text-slate-500 border-slate-200' : c.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {c.status}
                      </span>
                      <p className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase"><User size={14}/> {c.claimedBy || 'Unassigned'}</p>
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
          <div className="relative max-w-5xl w-full max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute -top-12 right-0 text-white hover:text-red-500 p-2 border-none cursor-pointer"><X size={40} /></button>
            <img src={viewImage} alt="Sheet" className="max-w-full max-h-[85vh] object-contain rounded-2xl bg-white shadow-2xl border-4 border-white" />
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
    <div className="space-y-6 w-full">
      <div className="flex bg-white rounded-2xl p-2 border-2 border-slate-200 shadow-sm sticky top-16 z-10 w-full">
        {['open', 'mine', 'team'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border-none cursor-pointer ${tab === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
            {t === 'open' ? `Board (${available.length})` : t === 'mine' ? 'My Jobs' : 'Team'}
          </button>
        ))}
      </div>
      
      <div className="space-y-8 text-left w-full">
        {tab === 'open' && (
          available.length === 0 ? <div className="text-center py-24 text-slate-400 font-bold text-lg uppercase tracking-widest bg-white rounded-3xl border-2 border-dashed border-slate-200">The Board is Clear</div> :
          Object.entries(groupCallsByArea(available)).map(([area, areaCalls]) => (
            <div key={area} className="space-y-4 w-full">
              <div className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-1.5 rounded-lg shadow-sm w-fit border-none ml-1">
                <MapPin size={16} className="text-white" /> 
                <span className="font-bold uppercase text-[10px] tracking-widest text-white">{area}</span>
              </div>
              {areaCalls.map(c => (
                <div key={c.id} className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-200 shadow-md animate-in fade-in slide-in-from-bottom-4 w-full">
                  <h3 className="font-bold text-3xl text-slate-900 mb-4 uppercase tracking-tighter leading-none">{c.customerName}</h3>
                  <div className="space-y-5 mb-8 font-bold">
                    <p className="flex items-start text-slate-600 text-lg leading-snug"><MapPin size={24} className="mr-4 mt-1 text-blue-500 shrink-0"/> {c.address}</p>
                    {c.phone && <p className="text-blue-600 text-xl font-bold ml-1"><a href={`tel:${c.phone.replace(/[^0-9]/g, '')}`}>📞 <span className="ml-2 underline decoration-2">{c.phone}</span></a></p>}
                    {c.notes && (
                      <div className="bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-200 text-slate-800 shadow-inner">
                        <span className="font-bold text-xs uppercase tracking-widest text-yellow-700 block mb-2 underline decoration-2 underline-offset-4">Instructions</span>
                        <p className="font-medium text-lg leading-relaxed">{c.notes}</p>
                      </div>
                    )}
                    {c.imageUri && <button onClick={() => setViewImage(c.imageUri)} className="w-full bg-slate-100 py-4 rounded-xl font-bold text-slate-600 border-2 border-slate-200 uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-colors hover:bg-slate-200 border-none mt-4 shadow-sm cursor-pointer"><FileText size={20}/> Open Job Sheet</button>}
                  </div>
                  <button onClick={() => update(c.id, 'claimed', 'claimedAtLoc')} className="w-full bg-blue-600 text-white py-6 rounded-2xl font-bold text-2xl hover:bg-blue-700 shadow-lg uppercase tracking-widest active:scale-95 transition-all border-none cursor-pointer">Claim Job</button>
                </div>
              ))}
            </div>
          ))
        )}
        
        {tab === 'mine' && (
          mine.length === 0 ? <div className="text-center py-24 text-slate-400 font-bold text-lg uppercase tracking-widest bg-white rounded-3xl border-2 border-dashed border-slate-200">No Jobs Claimed</div> :
          mine.map(c => (
            <div key={c.id} className="bg-white p-6 md:p-8 rounded-[2rem] border-[6px] border-blue-600 shadow-xl w-full">
              <div className="bg-blue-100 text-blue-800 font-bold uppercase tracking-widest text-[10px] inline-block px-4 py-2 rounded-lg mb-6 border-2 border-blue-200 shadow-sm">Your Current Job</div>
              <h3 className="font-bold text-3xl text-slate-900 mb-4 uppercase tracking-tighter leading-none">{c.customerName}</h3>
              <div className="space-y-5 mb-8 font-bold">
                <p className="flex items-start text-slate-600 text-lg leading-snug"><MapPin size={24} className="mr-4 mt-1 text-blue-500 shrink-0"/> <span>{c.address} <span className="text-blue-600 ml-2 opacity-80">({c.area})</span></span></p>
                {c.phone && <p className="text-blue-600 text-xl font-bold ml-1"><a href={`tel:${c.phone.replace(/[^0-9]/g, '')}`}>📞 <span className="ml-2 underline decoration-2">{c.phone}</span></a></p>}
                {c.notes && <div className="bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-200 text-slate-800 font-medium shadow-inner text-lg leading-relaxed">
                  <span className="font-bold text-xs uppercase tracking-widest text-yellow-700 block mb-2 underline decoration-2 underline-offset-4">Instructions</span>
                  {c.notes}
                </div>}
              </div>
              {c.status === 'claimed' ? (
                <button onClick={() => update(c.id, 'completed', 'completedAtLoc')} className="w-full bg-green-600 text-white py-6 rounded-2xl font-bold text-2xl hover:bg-green-700 shadow-lg uppercase tracking-widest active:scale-95 transition-all border-none cursor-pointer">Finish Job</button>
              ) : (
                <div className="text-center text-green-800 font-bold bg-green-100 py-6 rounded-2xl border-4 border-green-300 uppercase tracking-widest text-xl shadow-inner">Job Complete ✓</div>
              )}
            </div>
          ))
        )}
        
        {tab === 'team' && (
          team.length === 0 ? <div className="text-center py-24 text-slate-400 font-bold text-lg uppercase tracking-widest bg-white rounded-3xl border-2 border-dashed border-slate-200">No one else is working</div> :
          <div className="grid gap-4 w-full">
            {team.map(c => (
              <div key={c.id} className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                <div>
                  <h3 className="font-bold text-slate-800 text-xl uppercase tracking-tight">{c.customerName}</h3>
                  <p className="text-sm text-blue-600 font-bold uppercase tracking-widest mt-1">{c.area} • {c.address.split(',')[0]}</p>
                </div>
                <div className="flex items-center gap-3 bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-md border-2 border-white">
                  <User size={20}/>
                  <span className="font-bold uppercase text-sm tracking-widest">{c.claimedBy}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewImage && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4" onClick={() => setViewImage(null)}>
          <div className="relative max-w-5xl w-full max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute -top-12 right-0 text-white hover:text-red-500 p-2 border-none cursor-pointer"><X size={40} /></button>
            <img src={viewImage} alt="Sheet" className="max-w-full max-h-[85vh] object-contain rounded-2xl bg-white shadow-2xl border-4 border-white" />
          </div>
        </div>
      )}
    </div>
  );
}