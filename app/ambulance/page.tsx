'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Tesseract from 'tesseract.js';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '@/lib/firebase';

interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance?: number;
  rating?: number;
  isOpen?: boolean;
}

interface RegisterFormState {
  name: string;
  email: string;
  phone: string;
  vehicle_no: string;
  service_type: 'government' | 'private' | 'hospital' | '';
  driving_license_number: string;
  password: string;
  confirmPassword: string;
}

interface LoginFormState {
  ambulanceId: string;
  password: string;
}

interface VerificationResult {
  extractedText: string;
  ocrConfidence: number;
  matchedLicenseNumber: boolean;
  matchedName: boolean;
}

const initialRegisterForm: RegisterFormState = {
  name: '',
  email: '',
  phone: '',
  vehicle_no: '',
  service_type: '',
  driving_license_number: '',
  password: '',
  confirmPassword: '',
};

const DEMO_AMBULANCE_ID = 'AMB-TN01AB2026';
const DEMO_PASSWORD = 'Ambu@12345';

const initialLoginForm: LoginFormState = {
  ambulanceId: DEMO_AMBULANCE_ID,
  password: DEMO_PASSWORD,
};

function createAmbulanceCodePreview(vehicleNumber: string) {
  const normalizedVehicle = vehicleNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalizedVehicle ? `AMB-${normalizedVehicle}` : 'AMB-VEHICLENO';
}

function normalizeLicenseNumber(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeText(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function downloadRegistrationCredential(payload: {
  ambulanceId: string;
  name: string;
  email: string;
  vehicleNo: string;
  hospitalName: string;
  password: string;
  verificationStatus: string;
}) {
  const content = [
    'AMBUCLEAR Ambulance Registration',
    `Ambulance Code: ${payload.ambulanceId}`,
    `Login Password: ${payload.password}`,
    `Driver Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Vehicle Number: ${payload.vehicleNo}`,
    `Hospital: ${payload.hospitalName}`,
    `Verification Status: ${payload.verificationStatus}`,
    `Downloaded At: ${new Date().toISOString()}`,
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${payload.ambulanceId}-credential.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AmbulancePage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(initialRegisterForm);
  const [loginForm, setLoginForm] = useState<LoginFormState>(initialLoginForm);
  const [ambulancePhoto, setAmbulancePhoto] = useState<File | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');

  const ambulanceCodePreview = useMemo(
    () => createAmbulanceCodePreview(registerForm.vehicle_no),
    [registerForm.vehicle_no]
  );

  useEffect(() => {
    const savedAmbulanceId = localStorage.getItem('ambulance_id');
    if (savedAmbulanceId) {
      router.push('/ambulance/dashboard');
      return;
    }
  }, [router]);

  const uploadDocument = async (file: File, path: string) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const verifyLicenseDocument = async (file: File, name: string, licenseNumber: string): Promise<VerificationResult> => {
    setOcrStatus('Reading driving license with OCR...');
    const result = await Tesseract.recognize(file, 'eng');
    const extractedText = result.data.text || '';
    const normalizedExtractedText = normalizeText(extractedText);
    const normalizedLicense = normalizeLicenseNumber(licenseNumber);
    const matchedLicenseNumber = normalizedExtractedText.includes(normalizedLicense);
    const matchedName = normalizeText(name)
      .split(' ')
      .filter((token) => token.length >= 3)
      .some((token) => normalizedExtractedText.includes(token));

    return {
      extractedText,
      ocrConfidence: Number(result.data.confidence || 0),
      matchedLicenseNumber,
      matchedName,
    };
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setOcrStatus('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Password and confirm password must match.');
      setLoading(false);
      return;
    }

    if (!registerForm.service_type) {
      setError('Please select a service type.');
      setLoading(false);
      return;
    }

    if (!ambulancePhoto || !licensePhoto) {
      setError('Ambulance photo and driving license photo are required.');
      setLoading(false);
      return;
    }

    try {
      const ambulanceCode = createAmbulanceCodePreview(registerForm.vehicle_no);
      const existingResponse = await fetch(`/api/ambulance/${encodeURIComponent(ambulanceCode)}`);
      if (existingResponse.ok) {
        throw new Error(`Ambulance code ${ambulanceCode} already exists for this vehicle.`);
      }

      const verification = await verifyLicenseDocument(
        licensePhoto,
        registerForm.name,
        registerForm.driving_license_number
      );

      setOcrStatus('Creating Firebase account...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registerForm.email,
        registerForm.password
      );

      const authUid = userCredential.user.uid;
      const documentBasePath = `ambulance-documents/${authUid}`;

      setOcrStatus('Uploading ambulance documents...');
      const [ambulancePhotoUrl, drivingLicensePhotoUrl] = await Promise.all([
        uploadDocument(ambulancePhoto, `${documentBasePath}/ambulance-photo-${Date.now()}-${ambulancePhoto.name}`),
        uploadDocument(licensePhoto, `${documentBasePath}/driving-license-${Date.now()}-${licensePhoto.name}`),
      ]);

      setOcrStatus('Saving verified ambulance profile...');
      const response = await fetch('/api/ambulance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_uid: authUid,
          email: registerForm.email,
          name: registerForm.name,
          phone: registerForm.phone,
          vehicle_no: registerForm.vehicle_no,
          service_type: registerForm.service_type,
          driving_license_number: registerForm.driving_license_number,
          documents: {
            ambulance_photo_url: ambulancePhotoUrl,
            driving_license_photo_url: drivingLicensePhotoUrl,
          },
          verification: {
            extracted_text: verification.extractedText,
            ocr_confidence: verification.ocrConfidence,
            matched_license_number: verification.matchedLicenseNumber,
            matched_name: verification.matchedName,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        await deleteUser(userCredential.user);
        await signOut(auth);
        throw new Error(data.error || 'Registration failed.');
      }

      localStorage.setItem('ambulance_id', data.id);
      downloadRegistrationCredential({
        ambulanceId: data.id,
        name: registerForm.name,
        email: registerForm.email,
        vehicleNo: registerForm.vehicle_no,
        hospitalName: registerForm.service_type === 'hospital' ? 'Hospital Service' : 
                      registerForm.service_type === 'government' ? 'Government Service' : 'Private Service',
        password: registerForm.password,
        verificationStatus: data.verification_status,
      });

      alert(
        `Registration completed.\n\nAmbulance Code: ${data.id}\nLogin Password: ${registerForm.password}\nService Type: ${registerForm.service_type.toUpperCase()}\nVerification: ${data.verification_status.toUpperCase()}\n\nA credential file with your login details has been downloaded automatically.`
      );
      router.push('/ambulance/dashboard');
    } catch (registerError: any) {
      console.error('Registration error:', registerError);
      setError(registerError.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
      setOcrStatus('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const ambulanceId = loginForm.ambulanceId.trim().toUpperCase();
      const password = loginForm.password;

      if (!ambulanceId) {
        throw new Error('Please enter an ambulance ID.');
      }

      if (!password) {
        throw new Error('Please enter your password.');
      }

      if (ambulanceId === DEMO_AMBULANCE_ID && password === DEMO_PASSWORD) {
        localStorage.setItem('ambulance_id', DEMO_AMBULANCE_ID);
        router.push('/ambulance/dashboard');
        return;
      }

      const response = await fetch(`/api/ambulance/${encodeURIComponent(ambulanceId)}`);
      const data = await response.json();

      if (!response.ok || !data.ambulance) {
        throw new Error(data.error || 'Ambulance profile not found.');
      }

      if (!data.ambulance.email) {
        throw new Error('This ambulance profile does not have a login email configured yet.');
      }

      await signInWithEmailAndPassword(auth, data.ambulance.email, password);

      localStorage.setItem('ambulance_id', data.ambulance.id || ambulanceId);
      router.push('/ambulance/dashboard');
    } catch (loginError: any) {
      console.error('Login error:', loginError);
      setError(loginError.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-blue-700 to-blue-900 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-40">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-red-400 rounded-full opacity-60 animate-float"></div>
          <div className="absolute top-2/3 right-1/4 w-3 h-3 bg-blue-400 rounded-full opacity-40 animate-float animation-delay-2000"></div>
          <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-red-300 rounded-full opacity-50 animate-float animation-delay-4000"></div>
          <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-blue-300 rounded-full opacity-30 animate-float animation-delay-6000"></div>
        </div>
      </div>

      <div className="relative z-10 bg-white/5 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-white/10">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Ambulance Driver</h1>
          <p className="text-gray-300">Ambulance ID login, document upload, and OCR verification</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              isLogin
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              !isLogin
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 backdrop-blur-lg text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {ocrStatus && (
          <div className="bg-blue-500/20 border border-blue-500/50 backdrop-blur-lg text-blue-100 px-4 py-3 rounded-lg mb-4">
            {ocrStatus}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Ambulance ID</label>
              <input
                type="text"
                value={loginForm.ambulanceId}
                onChange={(e) => setLoginForm((current) => ({ ...current, ambulanceId: e.target.value.toUpperCase() }))}
                placeholder="AMB-TN01AB1234"
                className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((current) => ({ ...current, password: e.target.value }))}
                placeholder="Enter your registration password"
                className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                required
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
              Demo login for testing: <span className="font-semibold text-white">{DEMO_AMBULANCE_ID}</span> / <span className="font-semibold text-white">{DEMO_PASSWORD}</span>
              <button
                type="button"
                onClick={() => setLoginForm({ ambulanceId: DEMO_AMBULANCE_ID, password: DEMO_PASSWORD })}
                className="ml-3 rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >
                Use Demo Login
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, name: e.target.value }))}
                  placeholder="Driver name"
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, email: e.target.value }))}
                  placeholder="driver@hospital.com"
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Number</label>
                <input
                  type="text"
                  value={registerForm.vehicle_no}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, vehicle_no: e.target.value }))}
                  placeholder="e.g., TN-01-AB-1234"
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Generated ambulance code: <span className="font-semibold text-white">{ambulanceCodePreview}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Service Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['government', 'private', 'hospital'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRegisterForm((current) => ({ ...current, service_type: type }))}
                    className={`py-3 rounded-lg font-semibold transition-all border ${
                      registerForm.service_type === type
                        ? 'bg-red-600 border-red-400 text-white shadow-lg'
                        : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-lg mb-1">
                      {type === 'government' && '🏛️'}
                      {type === 'private' && '🚑'}
                      {type === 'hospital' && '🏥'}
                    </div>
                    <span className="text-sm capitalize">{type}</span>
                  </button>
                ))}
              </div>
              {registerForm.service_type && (
                <p className="text-xs text-gray-400 mt-2">
                  ✓ {registerForm.service_type === 'government' ? 'Government Ambulance Service' :
                     registerForm.service_type === 'private' ? 'Private Ambulance Service' :
                     'Hospital-based Ambulance Service'} selected
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Driving License Number</label>
                <input
                  type="text"
                  value={registerForm.driving_license_number}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, driving_license_number: e.target.value.toUpperCase() }))}
                  placeholder="Enter license number"
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ambulance Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAmbulancePhoto(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg text-white file:mr-3 file:rounded-md file:border-0 file:bg-red-600 file:px-3 file:py-1 file:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Driving License Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLicensePhoto(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg text-white file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-white"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, password: e.target.value }))}
                  placeholder="Create password"
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                  placeholder="Confirm password"
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
              Registration now uses Firebase Authentication, uploads both documents to Firebase Storage, verifies the license image with open-source OCR, and auto-downloads a driver credential file.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register and Verify'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-gradient-to-r from-red-500/90 to-blue-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-red-500 hover:to-blue-500 hover:shadow-xl"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
