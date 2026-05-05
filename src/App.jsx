import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
} from 'firebase/firestore';
import {
  Truck,
  MapPin,
  AlertCircle,
  CheckCircle,
  Plus,
  LogOut,
  User,
  Briefcase,
  Clock,
  Users,
  Navigation,
  ExternalLink,
  Camera,
  FileText,
  X,
} from 'lucide-react';

const apiKey = '';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: 'AIzaSyDb7Gc5_bycttH0h77Z9xK4Xv4XOpUO0nc',
  authDomain: 'serviceapp-94935.firebaseapp.com',
  projectId: 'serviceapp-94935',
  storageBucket: 'serviceapp-94935.firebasestorage.app',
  messagingSenderId: '1023263281742',
  appId: '1:1023263281742:web:ad61e0af399cf9c2b5a91f',
  measurementId: 'G-BBR2KL3Y2J',
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'service-app-v1';

const SERVICE_AREAS = [
  'Downtown',
  'Monkey Junction',
  'Carolina Beach',
  'Oleander',
  'Market St',
  'Castle Hayne',
  'Porters Neck',
  'Hampstead',
  'Leland',
  'Southport',
  'Midtown',
  'Pine Valley',
  'UNCW Area',
  'Sunset Park',
  'Ogden',
  'Mayfaire',
  'Landfall',
  'Middle Sound',
  'Bayshore',
  'Wrightsville Beach',
  'Masonboro',
  'Murrayville',
  'Oak Island',
];

const groupCallsByArea = (callsArray) => {
  const grouped = callsArray.reduce((acc, call) => {
    const area = call.area || 'Unassigned Area';
    if (!acc[area]) acc[area] = [];
    acc[area].push(call);
    return acc;
  }, {});

  // Sort areas alphabetically, keeping "Unassigned Area" at the bottom
  return Object.keys(grouped)
    .sort((a, b) => {
      if (a === 'Unassigned Area') return 1;
      if (b === 'Unassigned Area') return -1;
      return a.localeCompare(b);
    })
    .reduce((acc, key) => {
      acc[key] = grouped[key];
      return acc;
    }, {});
};

const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((res) => setTimeout(res, delays[i]));
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

  // RULE 3: Auth Before Queries - Always await sign in
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Since we are using your personal Firebase project now,
        // we must sign in anonymously directly instead of using the preview token.
        await signInAnonymously(auth);
      } catch (err) {
        console.error('Auth error:', err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // DATA FETCHING EFFECT
  useEffect(() => {
    // RULE 1: Strict Paths
    const callsRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'serviceCalls'
    );

    const unsubscribe = onSnapshot(
      callsRef,
      (snap) => {
        // RULE 2: No Complex Queries - Sort in memory
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setServiceCalls(data);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore permission error or other failure:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!appUser) {
    return <Login onLogin={(name, role) => setAppUser({ name, role })} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10">
      {isLocating && (
        <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50 font-bold text-blue-600">
          Updating GPS...
        </div>
      )}
      <nav className="bg-blue-700 text-white p-4 shadow-lg sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Truck />
          <span className="font-bold text-lg">ServiceApp</span>
        </div>
        <div className="flex items-center space-x-3 text-sm">
          <span className="hidden sm:inline opacity-80">
            {appUser.name} ({appUser.role})
          </span>
          <button
            onClick={() => setAppUser(null)}
            className="p-1 hover:bg-blue-800 rounded"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4">
        {appUser.role === 'Office Staff' ? (
          <ManagerView
            calls={serviceCalls}
            user={appUser.name}
            db={db}
            appId={appId}
          />
        ) : (
          <DriverView
            calls={serviceCalls}
            user={appUser.name}
            db={db}
            appId={appId}
            setLoc={setIsLocating}
          />
        )}
      </main>
    </div>
  );
}

function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Driver');

  const DRIVERS = ['Chris', 'Elijah', 'Eric', 'Garrett', 'Jeremy', 'Lynwood'];
  const OFFICE_STAFF = [
    'Brooke',
    'Garrett',
    'Hailee',
    'Jenna',
    'Kelly',
    'Logan',
  ];

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setName(''); // Reset the name selection when changing roles
  };

  // Determine which list to show based on the selected role
  const currentNames = role === 'Driver' ? DRIVERS : OFFICE_STAFF;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-4 text-blue-600">
          <Truck size={48} />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">
          ServiceApp Access
        </h1>

        {/* Moved Role Selection Above Dropdown */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => handleRoleChange('Driver')}
            className={`p-3 rounded-lg border flex flex-col items-center transition-colors ${
              role === 'Driver'
                ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-sm'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <Briefcase />
            <span className="text-xs mt-1 font-medium">Driver</span>
          </button>
          <button
            onClick={() => handleRoleChange('Office Staff')}
            className={`p-3 rounded-lg border flex flex-col items-center transition-colors ${
              role === 'Office Staff'
                ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-sm'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <User />
            <span className="text-xs mt-1 font-medium">Office Staff</span>
          </button>
        </div>

        {/* Dynamic Dropdown */}
        <select
          className="w-full border p-3 rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer shadow-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        >
          <option value="" disabled>
            Select your name...
          </option>
          {currentNames.map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
        </select>

        <button
          onClick={() => name && onLogin(name, role)}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
          disabled={!name}
        >
          Launch App
        </button>
      </div>
    </div>
  );
}

function ManagerView({ calls, user, db, appId }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    address: '',
    phone: '',
    notes: '',
    urgency: 'Medium',
    imageUri: '',
    area: '',
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [viewImage, setViewImage] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setScanError('');

    try {
      // Compress the image before saving to keep database fast
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
              const MAX_DIM = 1000; // Max width or height

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
              resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress to JPEG
            };
          };
        });
      };

      const compressedDataUrl = await compressImage(file);
      const base64Data = compressedDataUrl.split(',')[1];

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Analyze this service call sheet. Extract the customer name, address, phone number, and any 'Special Instructions' (put this under notes). If urgency is explicitly stated as High, Medium, or Low, extract that too. Finally, try to determine the best matching service area from this exact list: ${SERVICE_AREAS.join(
                  ', '
                )} based on the address or notes.`,
              },
              { inlineData: { mimeType: file.type, data: base64Data } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              customerName: { type: 'STRING' },
              address: { type: 'STRING' },
              phone: { type: 'STRING' },
              notes: { type: 'STRING' },
              urgency: { type: 'STRING' },
              area: { type: 'STRING' },
            },
          },
        },
      };

      const result = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textOutput) {
        const data = JSON.parse(textOutput);
        setForm((prev) => ({
          ...prev,
          customerName: data.customerName || prev.customerName,
          address: data.address || prev.address,
          phone: data.phone || prev.phone,
          notes: data.notes || prev.notes,
          urgency: ['High', 'Medium', 'Low'].includes(data.urgency)
            ? data.urgency
            : prev.urgency,
          area: SERVICE_AREAS.includes(data.area) ? data.area : prev.area,
          imageUri: compressedDataUrl,
        }));
      }
    } catch (err) {
      setScanError('Failed to process image. Please enter details manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    setScanError(''); // Clear old errors

    // Check if the AI missed any required fields
    if (!form.customerName || !form.address || !form.area) {
      setScanError(
        'Please ensure the Customer Name, Service Area, and Address are filled out.'
      );
      return;
    }

    try {
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'serviceCalls'),
        {
          ...form,
          status: 'open',
          createdAt: Date.now(),
          createdBy: user,
          claimedBy: null,
        }
      );
      setShow(false);
      setForm({
        customerName: '',
        address: '',
        phone: '',
        notes: '',
        urgency: 'Medium',
        imageUri: '',
        area: '',
      });
      setScanError('');
    } catch (err) {
      console.error('Error adding call:', err);
      setScanError('Failed to publish: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Service Queue</h2>
        <button
          onClick={() => setShow(!show)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors shadow-sm"
        >
          {show ? (
            <span>Cancel</span>
          ) : (
            <>
              <Plus size={18} /> <span>New Job</span>
            </>
          )}
        </button>
      </div>
      {show && (
        <form
          onSubmit={add}
          className="bg-white p-6 rounded-lg shadow-md border space-y-5 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          {/* AI Scanner Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-blue-800 flex items-center">
                <Camera size={18} className="mr-2" /> Auto-Fill via Image
              </h3>
              <p className="text-xs text-blue-600 mt-1">
                Upload a photo of the service sheet to automatically extract
                details.
              </p>
            </div>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isScanning}
                capture="environment"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={isScanning}
                className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                {isScanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{' '}
                    Scanning...
                  </>
                ) : (
                  'Choose Image or Take Photo'
                )}
              </button>
            </div>
          </div>
          {scanError && (
            <div className="text-red-600 bg-red-50 p-2 rounded text-sm">
              {scanError}
            </div>
          )}

          {/* Explicit Labeled Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Customer Name
              </label>
              <input
                placeholder="e.g. John Doe"
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Service Area
              </label>
              <select
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                required
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              >
                <option value="" disabled>
                  Select Area...
                </option>
                {SERVICE_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Address
              </label>
              <input
                placeholder="123 Main St, City, ST"
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                placeholder="(555) 555-5555"
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Notes (Special Instructions)
              </label>
              <textarea
                placeholder="Gate codes, specific issues, special requests..."
                rows={3}
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <button className="bg-green-600 text-white w-full py-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm mt-2">
            Publish Service Call
          </button>
        </form>
      )}

      <div className="space-y-8">
        {calls.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            No service calls found.
          </div>
        ) : (
          Object.entries(groupCallsByArea(calls)).map(([area, areaCalls]) => (
            <div key={area} className="space-y-3">
              <h3 className="font-bold text-slate-700 bg-slate-200/70 px-3 py-1.5 rounded-md inline-flex items-center text-sm shadow-sm">
                <MapPin size={14} className="mr-1.5 text-slate-500" /> {area}{' '}
                <span className="ml-1.5 opacity-60">({areaCalls.length})</span>
              </h3>

              <div className="grid gap-4">
                {areaCalls.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white p-4 rounded-lg border-l-4 border-blue-400 shadow-sm flex justify-between items-start"
                  >
                    <div className="flex-1 pr-4">
                      <h3 className="font-bold text-slate-800 text-lg">
                        {c.customerName || 'Unnamed Customer'}
                      </h3>
                      <div className="text-sm text-slate-600 mt-1 space-y-1">
                        <p className="flex items-start">
                          <MapPin
                            size={16}
                            className="mr-1 mt-0.5 text-blue-500 flex-shrink-0"
                          />{' '}
                          <span>{c.address}</span>
                        </p>
                        {c.phone && (
                          <p className="flex items-center text-blue-600">
                            📞{' '}
                            <span className="ml-1 font-medium">{c.phone}</span>
                          </p>
                        )}
                      </div>
                      {c.notes && (
                        <div className="mt-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                          <span className="font-semibold text-xs text-slate-500 uppercase tracking-wide block mb-1">
                            Special Instructions:
                          </span>
                          {c.notes}
                        </div>
                      )}
                      {c.imageUri && (
                        <button
                          onClick={() => setViewImage(c.imageUri)}
                          className="mt-3 flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded border border-blue-100 transition-colors"
                        >
                          <FileText size={14} className="mr-1.5" /> View Scanned
                          Sheet
                        </button>
                      )}
                      <div className="text-[10px] mt-3 space-x-3 flex items-center">
                        {c.claimedAtLoc && (
                          <a
                            href={`https://www.google.com/maps?q=${c.claimedAtLoc.lat},${c.claimedAtLoc.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:underline flex items-center"
                          >
                            <Navigation size={10} className="mr-1" /> Claimed ↗
                          </a>
                        )}
                        {c.completedAtLoc && (
                          <a
                            href={`https://www.google.com/maps?q=${c.completedAtLoc.lat},${c.completedAtLoc.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-500 hover:underline flex items-center"
                          >
                            <CheckCircle size={10} className="mr-1" /> Finished
                            ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                          c.status === 'open'
                            ? 'bg-slate-100 text-slate-600'
                            : c.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {c.status}
                      </span>
                      <p className="text-xs mt-1 text-slate-500 font-medium">
                        {c.claimedBy || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {viewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2"
            >
              <X size={32} />
            </button>
            <img
              src={viewImage}
              alt="Service Call Sheet"
              className="max-w-full max-h-[85vh] object-contain rounded bg-white shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DriverView({ calls, user, db, appId, setLoc }) {
  const [tab, setTab] = useState('open');
  const [viewImage, setViewImage] = useState(null);
  const available = calls.filter((c) => c.status === 'open');
  const mine = calls.filter((c) => c.claimedBy === user);
  const team = calls.filter(
    (c) => c.status === 'claimed' && c.claimedBy !== user
  );

  const update = async (id, status, locKey) => {
    setLoc(true);
    const location = await getCurrentLocation();
    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'serviceCalls', id),
        {
          status,
          claimedBy: user,
          [locKey]: location,
        }
      );
      if (status === 'claimed') setTab('mine');
    } catch (err) {
      console.error('Error updating call:', err);
    } finally {
      setLoc(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex bg-white rounded-lg p-1 border shadow-sm">
        <button
          onClick={() => setTab('open')}
          className={`flex-1 py-2 rounded text-sm font-bold transition-all ${
            tab === 'open'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-500 hover:bg-gray-50'
          }`}
        >
          Available ({available.length})
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`flex-1 py-2 rounded text-sm font-bold transition-all ${
            tab === 'mine'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-500 hover:bg-gray-50'
          }`}
        >
          My Jobs
        </button>
        <button
          onClick={() => setTab('team')}
          className={`flex-1 py-2 rounded text-sm font-bold transition-all ${
            tab === 'team'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-500 hover:bg-gray-50'
          }`}
        >
          Team
        </button>
      </div>

      <div className="space-y-6">
        {tab === 'open' &&
          (available.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              No available jobs.
            </div>
          ) : (
            Object.entries(groupCallsByArea(available)).map(
              ([area, areaCalls]) => (
                <div key={area} className="space-y-3">
                  <h3 className="font-bold text-slate-700 bg-slate-200/70 px-3 py-1.5 rounded-md inline-flex items-center text-sm shadow-sm">
                    <MapPin size={14} className="mr-1.5 text-slate-500" />{' '}
                    {area}{' '}
                    <span className="ml-1.5 opacity-60">
                      ({areaCalls.length})
                    </span>
                  </h3>

                  {areaCalls.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white p-5 rounded-lg border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <h3 className="font-bold text-xl text-slate-800">
                        {c.customerName || 'Unnamed Customer'}
                      </h3>
                      <div className="text-sm text-slate-600 mt-2 mb-4 space-y-2">
                        <p className="flex items-start">
                          <MapPin
                            size={16}
                            className="mr-2 mt-0.5 text-blue-500 flex-shrink-0"
                          />{' '}
                          <span>{c.address}</span>
                        </p>
                        {c.phone && (
                          <p className="flex items-center text-blue-600 font-medium">
                            📞{' '}
                            <a
                              href={`tel:${c.phone.replace(/[^0-9]/g, '')}`}
                              className="ml-2 hover:underline"
                            >
                              {c.phone}
                            </a>
                          </p>
                        )}
                        {c.notes && (
                          <div className="mt-3 bg-yellow-50 p-3 rounded-md border border-yellow-100 text-slate-800">
                            <span className="font-bold text-xs uppercase tracking-wide text-yellow-800 block mb-1">
                              Special Instructions:
                            </span>
                            {c.notes}
                          </div>
                        )}
                        {c.imageUri && (
                          <button
                            onClick={() => setViewImage(c.imageUri)}
                            className="mt-3 flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors w-full justify-center bg-blue-50 py-2 rounded-md border border-blue-100"
                          >
                            <FileText size={16} className="mr-2" /> View
                            Original Sheet
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => update(c.id, 'claimed', 'claimedAtLoc')}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
                      >
                        Claim Job
                      </button>
                    </div>
                  ))}
                </div>
              )
            )
          ))}

        {tab === 'mine' &&
          (mine.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              You haven't claimed any jobs.
            </div>
          ) : (
            mine.map((c) => (
              <div
                key={c.id}
                className="bg-white p-5 rounded-lg border shadow-sm border-blue-200 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <h3 className="font-bold text-xl text-slate-800">
                  {c.customerName || 'Unnamed Customer'}
                </h3>
                <div className="text-sm text-slate-600 mt-2 mb-4 space-y-2">
                  <p className="flex items-start">
                    <MapPin
                      size={16}
                      className="mr-2 mt-0.5 text-blue-500 flex-shrink-0"
                    />
                    <span>
                      {c.address}{' '}
                      <span className="font-medium text-blue-600 ml-1">
                        ({c.area || 'Unassigned Area'})
                      </span>
                    </span>
                  </p>
                  {c.phone && (
                    <p className="flex items-center text-blue-600 font-medium">
                      📞{' '}
                      <a
                        href={`tel:${c.phone.replace(/[^0-9]/g, '')}`}
                        className="ml-2 hover:underline"
                      >
                        {c.phone}
                      </a>
                    </p>
                  )}
                  {c.notes && (
                    <div className="mt-3 bg-yellow-50 p-3 rounded-md border border-yellow-100 text-slate-800">
                      <span className="font-bold text-xs uppercase tracking-wide text-yellow-800 block mb-1">
                        Special Instructions:
                      </span>
                      {c.notes}
                    </div>
                  )}
                  {c.imageUri && (
                    <button
                      onClick={() => setViewImage(c.imageUri)}
                      className="mt-3 flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors w-full justify-center bg-blue-50 py-2 rounded-md border border-blue-100"
                    >
                      <FileText size={16} className="mr-2" /> View Original
                      Sheet
                    </button>
                  )}
                </div>
                {c.status === 'claimed' ? (
                  <button
                    onClick={() => update(c.id, 'completed', 'completedAtLoc')}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm active:scale-95"
                  >
                    Mark Completed
                  </button>
                ) : (
                  <div className="text-center text-green-600 font-bold bg-green-50 py-3 rounded-lg border border-green-100">
                    ✓ Finished
                  </div>
                )}
              </div>
            ))
          ))}

        {tab === 'team' &&
          (team.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              No other team members are currently on jobs.
            </div>
          ) : (
            team.map((c) => (
              <div
                key={c.id}
                className="bg-white p-4 rounded-lg border border-slate-200 opacity-80 shadow-sm animate-in fade-in duration-300"
              >
                <div className="flex justify-between items-start">
                  <div className="pr-2">
                    <h3 className="font-bold text-slate-700">
                      {c.customerName || 'Unnamed Customer'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-start">
                      <MapPin size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                      <span>
                        {c.address}{' '}
                        <span className="text-blue-500 font-medium">
                          ({c.area || 'Unassigned'})
                        </span>
                      </span>
                    </p>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold uppercase border border-blue-100 flex-shrink-0">
                    {c.claimedBy}
                  </span>
                </div>
              </div>
            ))
          ))}
      </div>

      {viewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2"
            >
              <X size={32} />
            </button>
            <img
              src={viewImage}
              alt="Service Call Sheet"
              className="max-w-full max-h-[85vh] object-contain rounded bg-white shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
