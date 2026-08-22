import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  Trash2, 
  Globe, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  Settings as SettingsIcon, 
  UserCheck, 
  Pencil, 
  Save, 
  AlertCircle, 
  RotateCcw,
  Sparkles,
  Check,
  Eye,
  CreditCard,
  Smartphone,
  Landmark,
  ArrowRight,
  ArrowLeft,
  Link as LinkIcon
} from 'lucide-react';
import { BusinessProfile, TaxConfig, AuthUser } from '../types';
import { FASTINVO_OFFICIAL_LOGO, FASTINVO_ICON_MARK } from '../assets/logo';
import PhoneInputWithCountry from './PhoneInputWithCountry';

interface ProfileViewProps {
  profile: BusinessProfile;
  setProfile: (profile: BusinessProfile) => void;
  tax: TaxConfig;
  setTax: (tax: TaxConfig) => void;
  onGoToSettings?: (section?: string) => void;
  onBack?: () => void;
  currentUser?: AuthUser | null;
}

export default function ProfileView({
  profile,
  setProfile,
  tax,
  setTax,
  onGoToSettings = () => {},
  onBack,
  currentUser
}: ProfileViewProps) {
  const [formData, setFormData] = useState<BusinessProfile>(profile);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync formData if profile prop updates externally
  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(profile);

  const handleProfileChange = (field: keyof BusinessProfile, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    // Validate mandatory fields
    if (!formData.companyName.trim()) {
      setErrorMessage('Company Name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Business Email Address is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Business Phone Number is required.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMessage('Physical / Billing Address is required.');
      return;
    }

    setErrorMessage(null);
    setProfile(formData);
    setIsEditing(false);
    showSuccessNotification('Profile saved successfully! Updated details will be used on all invoices & receipts.');
  };

  const handleCancelEdit = () => {
    setFormData(profile);
    setIsEditing(false);
    setErrorMessage(null);
  };

  const showSuccessNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Image Upload Handlers
  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image file size must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      handleProfileChange('logo', result);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fadeIn font-sans">
      {/* Top Navigation Row with Back Button and Quick Settings Button */}
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
        ) : <div />}

        <button
          type="button"
          onClick={() => onGoToSettings()}
          id="profile-to-settings-top-btn"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-pointer shadow-2xs"
        >
          <SettingsIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2]" />
          <span>Workspace & App Settings</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-100 dark:border-indigo-900/60 overflow-hidden">
            {formData.logo ? (
              <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
            ) : (
              <Building2 className="w-7 h-7 stroke-[2]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {formData.companyName || 'Business Profile'}
              </h1>
              {currentUser && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  Verified Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your business branding, contact details, tax info & payment address.
            </p>
          </div>
        </div>

        {/* Action Buttons in Header: Edit & Save */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              id="edit-profile-header-btn"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-extrabold rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-2xl transition-colors flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            id="save-profile-header-btn"
            className={`px-4 py-2.5 text-white text-xs font-extrabold rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${
              isEditing || isDirty
                ? 'bg-[#0F3D2E] hover:bg-[#164E3B] ring-2 ring-[#0F3D2E]/20'
                : 'bg-emerald-700 hover:bg-emerald-800 opacity-90'
            }`}
          >
            <Save className="w-3.5 h-3.5 text-emerald-300" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Save Success Toast */}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-900 text-white text-xs font-extrabold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-fadeIn border border-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Validation Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-slideDown">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECTION 1: BUSINESS BRANDING & LOGO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Business Identity & Branding</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Displayed on all generated invoices, quotations & e-receipts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                View Mode
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-200/60">
                Editing Profile...
              </span>
            )}
          </div>
        </div>

        {/* Logo Configuration Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
              Invoice Header Logo
            </label>
            {formData.logo && (
              <button
                type="button"
                onClick={() => handleProfileChange('logo', '')}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove Logo</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Custom Upload / Preset Selector */}
            <div className="space-y-3">
              {/* FastInvo Preset Logo Card (Full Logo) */}
              <div 
                onClick={() => handleProfileChange('logo', FASTINVO_OFFICIAL_LOGO)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  formData.logo === FASTINVO_OFFICIAL_LOGO
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-11 rounded-xl bg-black p-1 border border-slate-700 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                    <img 
                      src={FASTINVO_OFFICIAL_LOGO} 
                      alt="FastInvo Official Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        FastInvo Official Logo
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#0F3D2E] text-emerald-300 uppercase">
                        Full Logo
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Official horizontal emblem & wordmark with growth arrow
                    </p>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                  formData.logo === FASTINVO_OFFICIAL_LOGO
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {formData.logo === FASTINVO_OFFICIAL_LOGO && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* FastInvo Icon Mark Preset Card */}
              <div 
                onClick={() => handleProfileChange('logo', FASTINVO_ICON_MARK)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  formData.logo === FASTINVO_ICON_MARK
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-black p-0.5 border border-slate-700 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                    <img 
                      src={FASTINVO_ICON_MARK} 
                      alt="FastInvo Icon Mark" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        FastInvo Icon Mark
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                        Icon Only
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      High-contrast square emblem with speed lines
                    </p>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                  formData.logo === FASTINVO_ICON_MARK
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {formData.logo === FASTINVO_ICON_MARK && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Drag-and-Drop Custom Logo Upload Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-4 transition-all text-center flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20'
                }`}
              >
                {formData.logo && formData.logo !== FASTINVO_OFFICIAL_LOGO ? (
                  <div className="flex items-center justify-between w-full px-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={formData.logo}
                        alt="Custom Logo"
                        className="h-10 w-16 object-contain rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-800"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Custom Logo Active</span>
                        <span className="text-[10px] text-slate-400">Ready for invoice headers</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <span
                        onClick={() => fileInputRef.current?.click()}
                        className="text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline cursor-pointer"
                      >
                        Upload Custom Logo
                      </span>{' '}
                      or drag & drop
                    </div>
                    <p className="text-[10px] text-slate-400">PNG, JPG, or SVG up to 2MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
              </div>
            </div>

            {/* Right: Live Invoice Header Preview */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Live Header Preview
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Invoice Top Bar</span>
              </div>

              {/* Mock Invoice Header Card */}
              <div className="bg-white text-slate-900 p-4 rounded-xl shadow-2xs border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {formData.logo ? (
                    <img
                      src={formData.logo}
                      alt="Preview Logo"
                      className="h-10 max-w-[80px] object-contain rounded-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs">
                      No Logo
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      {formData.companyName || 'Business Name'}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {formData.email || 'billing@company.com'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">INVOICE</span>
                  <span className="text-xs font-black text-[#0F3D2E] font-mono">#INV-1001</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                This logo automatically renders across your Clean, Minimalist, Classic, Modern, and Thermal receipt templates.
              </p>
            </div>
          </div>
        </div>

        {/* Business Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!isEditing}
              value={formData.companyName}
              onChange={(e) => handleProfileChange('companyName', e.target.value)}
              placeholder="e.g. Acme Corporation"
              className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 transition-all ${
                !formData.companyName.trim() ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700'
              } ${!isEditing ? 'opacity-80 cursor-pointer' : ''}`}
              onClick={() => !isEditing && setIsEditing(true)}
            />
            {!formData.companyName.trim() && (
              <p className="text-[10px] text-rose-500 font-bold mt-1">Company name is required</p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
              Business Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                disabled={!isEditing}
                value={formData.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                placeholder="billing@company.com"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 transition-all ${
                  !formData.email.trim() ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700'
                } ${!isEditing ? 'opacity-80 cursor-pointer' : ''}`}
                onClick={() => !isEditing && setIsEditing(true)}
              />
            </div>
            {!formData.email.trim() && (
              <p className="text-[10px] text-rose-500 font-bold mt-1">Business email address is required</p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
              Business Phone Number <span className="text-rose-500">*</span>
            </label>
            <PhoneInputWithCountry
              value={formData.phone}
              onChange={(newVal) => handleProfileChange('phone', newVal)}
            />
            {!formData.phone.trim() && (
              <p className="text-[10px] text-rose-500 font-bold mt-1">Business phone number is required</p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
              Website URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                disabled={!isEditing}
                value={formData.website}
                onChange={(e) => handleProfileChange('website', e.target.value)}
                placeholder="https://www.company.com"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 ${
                  !isEditing ? 'opacity-80 cursor-pointer' : ''
                }`}
                onClick={() => !isEditing && setIsEditing(true)}
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
              Physical / Billing Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={2}
                required
                disabled={!isEditing}
                value={formData.address}
                onChange={(e) => handleProfileChange('address', e.target.value)}
                placeholder="Street address, City, State, ZIP"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 resize-none ${
                  !formData.address.trim() ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700'
                } ${!isEditing ? 'opacity-80 cursor-pointer' : ''}`}
                onClick={() => !isEditing && setIsEditing(true)}
              />
            </div>
            {!formData.address.trim() && (
              <p className="text-[10px] text-rose-500 font-bold mt-1">Physical / Billing address is required</p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
              Tax Registration Label
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.taxRegLabel || 'Tax ID'}
              onChange={(e) => handleProfileChange('taxRegLabel', e.target.value)}
              placeholder="e.g. VAT / GST / EIN"
              className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 ${
                !isEditing ? 'opacity-80 cursor-pointer' : ''
              }`}
              onClick={() => !isEditing && setIsEditing(true)}
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
              Tax Registration Number
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.taxRegNumber || ''}
              onChange={(e) => handleProfileChange('taxRegNumber', e.target.value)}
              placeholder="e.g. VAT-987654321"
              className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 ${
                !isEditing ? 'opacity-80 cursor-pointer' : ''
              }`}
              onClick={() => !isEditing && setIsEditing(true)}
            />
          </div>
        </div>

        {/* Payment Systems Quick Configuration Card */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              <CreditCard className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                  Payment Systems & Gateways
                </h4>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  {(profile.paymentMethods || []).length} Active Methods
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {(profile.paymentMethods || []).length > 0 
                  ? `Active: ${(profile.paymentMethods || []).join(', ')}`
                  : 'Configure bKash, Nagad, Bank Wire, Stripe links, and live QR code.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onGoToSettings('payments')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Configure Payment Systems</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dedicated Action Bar Footer with Both Edit & Save Buttons */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Unsaved changes pending — Click "Save Profile" to apply
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Profile synchronized & saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              id="edit-profile-footer-btn"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Lock / View Mode' : 'Edit Profile'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              id="save-profile-footer-btn"
              className="px-5 py-2.5 bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-[#0F3D2E]/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4 text-emerald-300" />
              <span>Save Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
