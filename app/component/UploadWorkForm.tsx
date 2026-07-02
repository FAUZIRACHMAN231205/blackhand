"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { UploadCloud, Loader2, ImagePlus, X } from "lucide-react";

interface UploadWorkFormProps {
  onSuccess?: () => void; // Callback untuk memindahkan tab atau me-refresh data setelah sukses
}

export default function UploadWorkForm({ onSuccess }: UploadWorkFormProps) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Digital Art",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (images.length + selectedFiles.length > 6) {
        alert("Maksimal 6 gambar per karya!");
        return;
      }
      setImages((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      alert("Harap unggah minimal 1 gambar!");
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Gagal memverifikasi sesi admin.");

      // 1. Insert data ke tabel works
      const { data: workData, error: workError } = await supabase
        .from("works")
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          created_by: user.id,
          is_published: true,
        })
        .select()
        .single();

      if (workError) throw workError;

      // 2. Upload gambar & simpan ke tabel work_images
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${workData.id}-${i}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("work-images")
          .upload(fileName, file);
          
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("work-images")
          .getPublicUrl(fileName);

        await supabase.from("work_images").insert({
          work_id: workData.id,
          image_url: publicUrlData.publicUrl,
          display_order: i + 1,
          is_featured: i === 0, 
        });
      }

      alert("Karya berhasil dipublikasikan!");
      
      // Reset form setelah sukses
      setImages([]);
      setFormData({ title: "", description: "", category: "Digital Art" });

      // Jalankan fungsi callback jika ada (misal untuk pindah ke tab daftar karya)
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      alert(`Terjadi kesalahan: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm font-poppins">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Utama */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">Judul Karya</label>
            <input
              required
              type="text"
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all text-sm"
              placeholder="Masukkan judul karya seni..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">Kategori</label>
            <select
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all bg-white text-sm"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Digital Art">Digital Art</option>
              <option value="Paintings">Paintings</option>
              <option value="Sculptures">Sculptures</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-700">Deskripsi</label>
          <textarea
            rows={3}
            className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all text-sm resize-none"
            placeholder="Tuliskan cerita atau detail mengenai karya ini..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Bagian Upload Gambar */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-yellow-500" />
            File Gambar ({images.length}/6)
          </label>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {images.map((file, index) => (
              <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index}`}
                  className="object-cover w-full h-full"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                    Sampul
                  </span>
                )}
              </div>
            ))}

            {images.length < 6 && (
              <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer transition-all">
                <UploadCloud className="w-6 h-6 text-zinc-400 mb-1" />
                <span className="text-[11px] font-medium text-zinc-500">Tambah</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>
        </div>

        {/* Tombol Submit */}
        <div className="pt-4 border-t border-zinc-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses...
              </>
            ) : (
              "Simpan Karya"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}