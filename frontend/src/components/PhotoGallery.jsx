import { useState, useEffect } from 'react';
import api from '../api/axios';
import './PhotoGallery.css';

const PHOTO_TYPES = [
  { type: 'animal', label: '🐾 Animal Photo', desc: 'Close-up of the animal' },
  { type: 'scene', label: '🏙️ Scene Photo', desc: 'Wide view of the area' },
  { type: 'landmark', label: '🏠 Landmark Photo', desc: 'Nearby landmark' },
];

export default function PhotoGallery({ caseId, canUpload = false }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');

  // Fetch photos on mount
  useEffect(() => {
    if (!caseId) return;
    api.get(`/cases/${caseId}/photos`).then((res) => {
      setPhotos(res.data.photos || []);
    }).catch(() => {});
  }, [caseId]);

  const handleFileSelect = async (photoType, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setUploading(photoType);

    try {
      // Upload to Cloudinary (unsigned preset)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'rescue_uber');
      formData.append('cloud_name', 'demo');

      const cloudRes = await fetch(
        'https://api.cloudinary.com/v1_1/demo/image/upload',
        { method: 'POST', body: formData }
      );
      const cloudData = await cloudRes.json();

      if (!cloudData.secure_url) {
        // If Cloudinary fails, fallback: convert to data URL
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const dataUrl = evt.target.result;
          await savePhoto(photoType, dataUrl);
        };
        reader.readAsDataURL(file);
        return;
      }

      await savePhoto(photoType, cloudData.secure_url);
    } catch (err) {
      console.error('Upload error:', err);
      // Fallback: use local data URL
      const reader = new FileReader();
      reader.onload = async (evt) => {
        await savePhoto(photoType, evt.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const savePhoto = async (photoType, fileUrl) => {
    try {
      const res = await api.post(`/cases/${caseId}/photos`, {
        photo_type: photoType,
        file_url: fileUrl,
      });
      setPhotos((prev) => [...prev, res.data.photo]);
    } catch (err) {
      setError('Failed to save photo');
    } finally {
      setUploading(null);
    }
  };

  const hasPhotos = photos.length > 0;

  return (
    <div className="photo-gallery">
      <div className="photo-gallery-label">
        📷 {canUpload ? 'Upload Rescue Photos' : 'Rescue Photos'}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Upload buttons (reporter only) */}
      {canUpload && (
        <div className="photo-upload-grid">
          {PHOTO_TYPES.map((pt) => {
            const existing = photos.find((p) => p.photo_type === pt.type);
            return (
              <label key={pt.type} className={`photo-upload-slot ${existing ? 'uploaded' : ''}`}>
                {existing ? (
                  <img src={existing.file_url} alt={pt.label} />
                ) : (
                  <div className="photo-upload-placeholder">
                    <span>{pt.label}</span>
                    <span className="photo-upload-desc">{pt.desc}</span>
                    {uploading === pt.type && <span className="photo-uploading">Uploading...</span>}
                  </div>
                )}
                {!existing && (
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(pt.type, e)}
                    disabled={!!uploading}
                  />
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* Display gallery (responder view) */}
      {!canUpload && hasPhotos && (
        <div className="photo-display-grid">
          {photos.map((p) => (
            <div key={p.id} className="photo-display-item">
              <img src={p.file_url} alt={p.photo_type} />
              <span className="photo-type-label">{p.photo_type}</span>
            </div>
          ))}
        </div>
      )}

      {!canUpload && !hasPhotos && (
        <div className="photo-empty">No photos uploaded yet</div>
      )}
    </div>
  );
}
