import React, { useEffect, useRef, useState } from 'react';
import { Camera, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { authService } from '../../services/authService';

// Local mirror of the customer's photo so the initial letter / photo survives
// page reloads even when the backend /me payload omits profile_image.
const PHOTO_CACHE_KEY = 'quickkart_customer_profile_photo';

const readPhotoCache = (userId) => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(PHOTO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.userId !== userId) return null;
    return typeof parsed.photo === 'string' && parsed.photo ? parsed.photo : null;
  } catch {
    return null;
  }
};

const writePhotoCache = (userId, photo) => {
  if (!userId) return;
  try {
    if (!photo) {
      localStorage.removeItem(PHOTO_CACHE_KEY);
    } else {
      localStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify({ userId, photo }));
    }
  } catch {
    // Storage unavailable/full — the server copy remains the source of truth.
  }
};

// Resize to max 256x256 and re-encode as JPEG so the payload stays tiny.
const processImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file does not look like a valid image'));
      img.onload = () => {
        try {
          const MAX = 256;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (dataUrl.length > 120000) dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          if (dataUrl.length > 120000) dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          resolve(dataUrl);
        } catch {
          reject(new Error('Could not process the selected image'));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const CustomerProfilePhoto = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useNotification();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const userId = user?.id || user?._id || null;
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'C';
  const serverPhoto = user?.profileImage || user?.profile_image || null;

  const [photo, setPhoto] = useState(() => serverPhoto || readPhotoCache(userId) || null);

  // Reconcile: prefer the server copy; if the server returned none (the /me
  // payload omits profile_image), restore the known photo so the avatar keeps
  // matching what the user already saved.
  useEffect(() => {
    const server = user?.profileImage || user?.profile_image || null;
    const cached = readPhotoCache(userId);
    if (server) {
      setPhoto((prev) => (prev === server ? prev : server));
      if (server !== cached) writePhotoCache(userId, server);
    } else if (cached) {
      setPhoto((prev) => prev || cached);
      updateUser({ profileImage: cached, profile_image: cached });
    } else if (photo) {
      // No photo anywhere (e.g. account switched) — fall back to the initial.
      setPhoto(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userId]);

  const applyLocally = (dataUrl) => {
    setPhoto(dataUrl);
    writePhotoCache(userId, dataUrl);
    updateUser({ profileImage: dataUrl, profile_image: dataUrl });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      addToast('Please choose a JPG, PNG or WebP image', 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      addToast('Image is too large — please pick one under 5 MB', 'error');
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await processImage(file);
      try {
        const res = await authService.updateProfile({ profileImage: dataUrl });
        if (!res?.success) throw new Error(res?.message || 'Server rejected the update');
        const merged = {
          ...(res.user || {}),
          profileImage: dataUrl,
          profile_image: res.user?.profile_image ?? dataUrl,
        };
        setPhoto(dataUrl);
        writePhotoCache(userId, dataUrl);
        updateUser(merged);
        addToast('Profile photo updated!', 'success');
      } catch (serverErr) {
        // Server unreachable / rejected — keep the photo honest and local.
        applyLocally(dataUrl);
        addToast('Photo saved on this device — could not sync it to the server', 'warning');
      }
    } catch (err) {
      addToast(err?.message || 'Could not use that image', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    let synced = true;
    try {
      const res = await authService.updateProfile({ profileImage: null });
      if (!res?.success) throw new Error(res?.message || 'Server rejected the update');
    } catch {
      synced = false;
    } finally {
      setPhoto(null);
      writePhotoCache(userId, null);
      updateUser({ profileImage: null, profile_image: null });
      setBusy(false);
    }
    if (synced) {
      addToast(`Photo removed — showing "${initial}" again`, 'success');
    } else {
      addToast('Photo removed on this device — could not sync with the server', 'warning');
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-5">
      <div className="relative flex-shrink-0">
        {photo ? (
          <img
            src={photo}
            alt={`${user?.name || 'Customer'} profile`}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-brand-100 border border-slate-200"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-brand-600 text-white flex items-center justify-center text-4xl font-black ring-4 ring-brand-100 select-none">
            {initial}
          </div>
        )}
        <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500">
          <Camera className="w-4 h-4" />
        </span>
      </div>

      <div className="flex-1 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
          <span>Profile Photo</span>
        </div>
        <h3 className="text-sm font-black text-slate-900">
          {photo ? 'Your uploaded photo' : `Showing the first letter of your name ("${initial}")`}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Upload a JPG, PNG or WebP (up to 5 MB). It's resized to 256×256 and saved to your customer
          profile — remove it any time to go back to your initial.
        </p>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current && fileRef.current.click()}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center gap-2"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : photo ? (
              <Pencil className="w-4 h-4" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            {photo ? 'Change photo' : 'Upload photo'}
          </button>
          {photo && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRemove}
              className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 font-bold text-xs transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerProfilePhoto;

