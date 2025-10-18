'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // <-- IMPORT BARU
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { supabase, UserProfile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter, // <-- IMPORT BARU
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Mail,
    User,
    Calendar,
    DollarSign,
    Camera,
    Save,
    Shield,
    CheckCircle,
    KeyRound, // <-- IMPORT BARU
    AlertTriangle, // <-- IMPORT BARU
    Trash, // <-- IMPORT BARU
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input'; // <-- IMPORT BARU
import { Label } from '@/components/ui/label'; // <-- IMPORT BARU

export default function ProfilePage() {
    const { user, profile, loading, refreshProfile } = useAuth(); const router = useRouter(); // <-- HOOK BARU

    const [saving, setSaving] = useState(false);
    const [fullName, setFullName] = useState('');
    const [currency, setCurrency] = useState('Rp');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>('');

    // --- STATE BARU UNTUK PASSWORD ---
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    // --- STATE BARU UNTUK HAPUS AKUN ---
    const [deleting, setDeleting] = useState(false);

    const currencies = [
        // ... (daftar mata uang Anda tidak berubah)
        { code: 'Rp', label: 'Indonesian Rupiah (Rp)' },
        { code: 'USD', label: 'US Dollar ($)' },
        { code: 'EUR', label: 'Euro (€)' },
        { code: 'GBP', label: 'British Pound (£)' },
        { code: 'JPY', label: 'Japanese Yen (¥)' },
        { code: 'CNY', label: 'Chinese Yuan (¥)' },
    ];

    const userInitials =
        profile?.full_name // <-- Gunakan data dari konteks
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) ||
        user?.email
            ?.split('@')[0]
            .split('.')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U';

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setCurrency(profile.currency || 'Rp');
            setAvatarPreview(profile.avatar_url || '');
            setAvatarFile(null); // Reset file input
        }
    }, [profile]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (fungsi Anda tidak berubah)
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadAvatar = async (): Promise<string | null> => {
        // ... (fungsi Anda tidak berubah)
        if (!avatarFile || !user) return null;
        try {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from('profile-avatars')
                .upload(filePath, avatarFile);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage
                .from('profile-avatars')
                .getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Gagal mengunggah foto profil.');
            return null;
        }
    };

    const handleSave = async () => {
        // ... (fungsi Anda tidak berubah)
        if (!user || !profile) return;
        setSaving(true);
        try {
            let avatarUrl = profile.avatar_url;
            if (avatarFile) avatarUrl = await uploadAvatar();
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    full_name: fullName || null,
                    currency,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id);
            if (error) throw error;
            await refreshProfile();
            toast.success('Profil berhasil diperbarui!');
        } catch (error) {
            console.error('Error saving profile:', error);
            toast.error('Gagal menyimpan perubahan profil.');
        } finally {
            setSaving(false);
        }
    };
    const handleCancel = () => {
        if (!profile) return;
        setFullName(initialProfile.full_name || '');
        setCurrency(initialProfile.currency || 'Rp');
        setAvatarPreview(initialProfile.avatar_url || '');
        setAvatarFile(null);
        toast.info('Perubahan dibatalkan.');
    };


    // --- HANDLER BARU UNTUK GANTI PASSWORD ---
    const handleChangePassword = async () => {
        if (newPassword.length < 6) {
            toast.error('Password baru harus minimal 6 karakter.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Password baru dan konfirmasi tidak cocok.');
            return;
        }

        if (!user?.email) {
            toast.error('Email pengguna tidak ditemukan.');
            return;
        }

        setSavingPassword(true);
        try {
            // ✅ Re-authenticate dulu pakai password lama
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: oldPassword,
            });

            if (signInError) {
                throw new Error('Password lama salah. Silakan coba lagi.');
            }

            // ✅ Jika berhasil login ulang, baru ubah password
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            toast.success('Password berhasil diperbarui!');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.message || 'Gagal memperbarui password.');
        } finally {
            setSavingPassword(false);
        }
    };


    // --- HANDLER BARU UNTUK HAPUS AKUN ---
    // const handleDeleteAccount = async () => {
    //     if (
    //         !window.confirm(
    //             'Apakah Anda benar-benar yakin ingin menghapus akun Anda? Tindakan ini tidak dapat dibatalkan dan semua data Anda (transaksi, dompet, dll.) akan hilang selamanya.'
    //         )
    //     ) {
    //         return;
    //     }

    //     setDeleting(true);
    //     try {
    //         // Memanggil Edge Function 'delete-user-account'
    //         const { error } = await supabase.functions.invoke('delete-user-account');

    //         if (error) throw error;

    //         toast.success('Akun Anda telah berhasil dihapus.');
    //         // Logout dan redirect ke halaman utama
    //         await supabase.auth.signOut();
    //         router.push('/');
    //     } catch (error: any) {
    //         console.error('Error deleting account:', error);
    //         toast.error(`Gagal menghapus akun: ${error.message}`);
    //         setDeleting(false);
    //     }
    // };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    Profile Settings
                </h1>
                <p className="text-sm sm:text-base text-slate-600 mt-1">
                    Manage your account information and preferences
                </p>
            </div>

            <div className="space-y-6">
                {/* Profile Picture Card */}
                <Card className="shadow-md border border-slate-200">
                    {/* ... (Card Content Anda untuk Profile Picture tidak berubah) */}
                    <CardHeader className="pb-4 border-b border-slate-100">
                        <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">Profile Picture</CardTitle>
                        <CardDescription>Upload or change your profile photo</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                            <div className="relative group">
                                <Avatar className="h-32 w-32 border-4 border-emerald-500/20 shadow-lg">
                                    <AvatarImage src={avatarPreview} alt="Profile" />
                                    <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-4xl font-bold">
                                        {userInitials}
                                    </AvatarFallback>
                                </Avatar>
                                <label
                                    htmlFor="avatar-input"
                                    className="absolute bottom-0 right-0 bg-emerald-600 hover:bg-emerald-700 rounded-full p-3 cursor-pointer shadow-lg transition-all hover:shadow-xl transform hover:scale-110"
                                >
                                    <Camera className="h-5 w-5 text-white" />
                                </label>
                                <input
                                    id="avatar-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Update your profile photo</h3>
                                <p className="text-slate-600 mb-4">
                                    Click the camera icon to upload a new photo. This image will be displayed across your account.
                                </p>
                                <div className="space-y-2 bg-slate-50 rounded-lg p-4 border border-slate-200">
                                    <p className="text-sm text-slate-700">
                                        <span className="font-semibold">Recommended size:</span> 512x512px
                                    </p>
                                    <p className="text-sm text-slate-700">
                                        <span className="font-semibold">Supported formats:</span> JPG, PNG, GIF
                                    </p>
                                    <p className="text-sm text-slate-700">
                                        <span className="font-semibold">Maximum size:</span> 5MB
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Personal Information */}
                    <Card className="lg:col-span-2 shadow-md border border-slate-200">
                        {/* ... (Card Content Anda untuk Personal Information tidak berubah) */}
                        <CardHeader className="pb-4 border-b border-slate-100">
                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900">
                                <User className="h-5 w-5 text-emerald-600" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>Update your account details</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {/* Email */}
                            <div>
                                <Label htmlFor='email' className="block text-sm font-semibold text-slate-800 mb-3">
                                    <Mail className="inline h-4 w-4 mr-2 text-emerald-600" />
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed font-medium"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    <Shield className="inline h-3 w-3 mr-1" />
                                    Contact support to change your email address
                                </p>
                            </div>

                            {/* Full Name */}
                            <div>
                                <Label htmlFor='full-name' className="block text-sm font-semibold text-slate-800 mb-3">
                                    <User className="inline h-4 w-4 mr-2 text-emerald-600" />
                                    Full Name
                                </Label>
                                <Input
                                    id='full-name'
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition font-medium text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            {/* Currency */}
                            <div>
                                <Label htmlFor='currency' className="block text-sm font-semibold text-slate-800 mb-3">
                                    <DollarSign className="inline h-4 w-4 mr-2 text-emerald-600" />
                                    Default Currency
                                </Label>
                                <select
                                    id='currency'
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition font-medium text-slate-900"
                                >
                                    {currencies.map((curr) => (
                                        <option key={curr.code} value={curr.code}>
                                            {curr.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Information Sidebar */}
                    <Card className="shadow-md border border-slate-200 h-fit">
                        {/* ... (Card Content Anda untuk Account Info tidak berubah) */}
                        <CardHeader className="pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                                <Shield className="h-5 w-5 text-emerald-600" />
                                Account Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Calendar className="h-4 w-4 text-emerald-600" />
                                    <span className="text-sm font-medium">Member Since</span>
                                </div>
                                <p className="text-base font-semibold text-slate-900 pl-6">
                                    {profile?.created_at
                                        ? new Date(profile.created_at).toLocaleDateString('id-ID', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })
                                        : '-'}
                                </p>
                            </div>
                            <div className="border-t border-slate-100 pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                                        <span className="text-sm font-medium">Status</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs font-semibold text-green-700">Active</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- CARD BARU: GANTI PASSWORD --- */}
                <Card className="shadow-md border border-slate-200">
                    <CardHeader className="pb-4 border-b border-slate-100">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900">
                            <KeyRound className="h-5 w-5 text-emerald-600" />
                            Security Settings
                        </CardTitle>
                        <CardDescription>Enter old password to change to new password</CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="old-password">Old Password</Label>
                            <Input
                                id="old-password"
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder="Masukkan password lama Anda"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimal 6 karakter"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Ketik ulang password baru Anda"
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="border-t border-slate-100 pt-4">
                        <Button
                            onClick={handleChangePassword}
                            disabled={savingPassword || !oldPassword || !newPassword || !confirmPassword}
                            className="ml-auto"
                        >
                            {savingPassword ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                'Save Password'
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Action Buttons (Save/Cancel untuk Profil) */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold rounded-xl h-12 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30 disabled:opacity-75"
                    >
                        {saving ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving Changes...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                Save Changes
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="px-8 border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl h-12 font-semibold transition-all"
                    >
                        Cancel
                    </Button>
                </div>

                {/* --- CARD BARU: DANGER ZONE --- */}
                {/* <Card className="shadow-md border border-red-500/50 bg-red-50/20">
          <CardHeader className="pb-4 border-b border-red-500/30">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-600">
              Tindakan-tindakan berikut bersifat permanen dan tidak dapat dibatalkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">Hapus Akun Ini</h3>
                <p className="text-sm text-slate-600 mt-1 max-w-xl">
                  Setelah Anda menghapus akun Anda, tidak ada jalan untuk kembali.
                  Semua data transaksi, dompet, dan anggaran Anda akan dihapus secara permanen.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-shrink-0"
              >
                {deleting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash className="h-4 w-4 mr-2" />
                    Hapus Akun Saya
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card> */}

            </div>
        </div>
    );
}