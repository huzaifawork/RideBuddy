import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const VerificationForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: ''
  });
  const [studentIdFile, setStudentIdFile] = useState(null);
  const [cnicFile, setCnicFile] = useState(null);

  const uploadFile = async (file, bucket, userId, fileName) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${fileName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentIdFile || !cnicFile) {
      toast.error('Please upload both ID and CNIC images');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You are not logged in. Please log in again.');
        return;
      }
      
      // 1. Upload Images
      const idUrl = await uploadFile(studentIdFile, 'Verification', user.id, 'student_id');
      const cnicUrl = await uploadFile(cnicFile, 'Verification', user.id, 'cnic');

      // 2. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          student_id_url: idUrl,
          cnic_url: cnicUrl,
          is_verified: false 
        })
        .eq('id', user.id);

      if (profileError) throw profileError;
      
      toast.success('Verification submitted successfully!');
      navigate('/verification-pending');
    } catch (error) {
      toast.error('Submission failed: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-container" style={{ justifyContent: 'flex-start', paddingTop: '2rem', minHeight: '100vh' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="form-container"
        style={{ padding: '0 1rem' }}
      >
        <h1 className="title-main" style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '0.25rem' }}>Verify Your Account</h1>
        <p className="subtitle" style={{ textAlign: 'center', marginBottom: '2.5rem', fontSize: '0.9rem' }}>
          Upload your details to get verified
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Full Name" 
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              required 
            />
          </div>

          <div className="form-group">
            <label className="label">Phone Number</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Phone Number" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              required 
            />
          </div>

          <div className="upload-box" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <Upload size={24} color="#94a3b8" />
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>Upload Student ID</span>
            <input 
              type="file" 
              id="studentId" 
              accept="image/*"
              hidden 
              onChange={(e) => setStudentIdFile(e.target.files[0])}
            />
            <button type="button" className="btn-blue" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', width: 'auto' }} onClick={() => document.getElementById('studentId').click()}>
              {studentIdFile ? 'Change File' : 'Upload File'}
            </button>
            {studentIdFile && (
              <div className="upload-status" style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                File uploaded <CheckCircle size={14} />
              </div>
            )}
          </div>

          <div className="upload-box" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <Upload size={24} color="#94a3b8" />
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>Upload CNIC</span>
            <input 
              type="file" 
              id="cnic" 
              accept="image/*"
              hidden 
              onChange={(e) => setCnicFile(e.target.files[0])}
            />
            <button type="button" className="btn-blue" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', width: 'auto' }} onClick={() => document.getElementById('cnic').click()}>
              {cnicFile ? 'Change File' : 'Upload File'}
            </button>
            {cnicFile && (
              <div className="upload-status" style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                File uploaded <CheckCircle size={14} />
              </div>
            )}
          </div>

          <button type="submit" className="btn-submit" style={{ borderRadius: '100px' }} disabled={loading}>
            {loading ? <Loader2 className="spin" size={20} /> : 'Submit for Verification'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default VerificationForm;
