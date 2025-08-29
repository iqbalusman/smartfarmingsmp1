import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Linkedin, Github, Facebook, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  // GANTI dengan nomor WhatsApp tujuan tanpa tanda + dan tanpa spasi, contoh: 6281234567890
  const WHATSAPP_NUMBER = "6283871069314";

  const contactInfo = [
    { icon: Phone, title: "Telepon", value: "+62 838-7106-9314", description: "Sen–Jum, 09.00–17.00" },
    { icon: Mail, title: "Email", value: "hello@hidroponikiot.id", description: "Balasan < 1×24 jam" },
    { icon: MapPin, title: "Lokasi", value: "Gorontalo, Indonesia", description: "Kunjungan by appointment" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const lines = [
        "Halo iTELVORE!, saya ingin menghubungi:",
        `Nama: ${formData.name}`,
        `Email: ${formData.email}`,
        formData.subject ? `Subjek: ${formData.subject}` : null,
        "",
        "Pesan:",
        formData.message,
      ].filter(Boolean);
  
      const text = encodeURIComponent(lines.join("\n"));
      const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
  
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      alert("Maaf, terjadi kendala saat membuka WhatsApp.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <>
      <Helmet>
        <title>Kontak - HidroponikIoT</title>
        <meta
          name="description"
          content="Hubungi tim HidroponikIoT untuk konsultasi sistem monitoring hidroponik berbasis IoT. Kami siap membantu implementasi teknologi pertanian modern."
        />
      </Helmet>

      {/* WRAPPER: simple, airy, modern */}
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        {/* HERO */}
        <section className="pt-24 pb-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-medium">
                Butuh bantuan?
              </span>
              <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                Hubungi Kami
              </h1>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                Punya pertanyaan tentang sistem hidroponik IoT? Tim kami siap bantu Anda
                mengimplementasikan teknologi pertanian modern.
              </p>
            </motion.div>
          </div>
        </section>

        {/* MAIN GRID */}
        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
              {/* FORM CARD */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-2xl border border-green-100 bg-white/80 backdrop-blur p-6 md:p-8 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-green-500"><MessageCircle className="h-5 w-5 text-white" /></div>
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Kirim Pesan</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Masukkan nama lengkap"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="nama@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subjek</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Subjek pesan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pesan *</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={6}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      placeholder="Tulis pesan Anda di sini..."
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg"
                    disabled={loading}
                  >
                    <Send className="mr-2 h-5 w-5" /> {loading ? "Membuka WhatsApp..." : "Kirim via WhatsApp"}
                  </Button>
                  <p className="mt-2 text-xs text-gray-500 text-center">Tombol akan membuka WhatsApp dengan pesan yang sudah terisi.</p>
                </form>
              </motion.div>

              {/* CONTACT & SOCIAL CARD */}
              <motion.aside
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="rounded-2xl border border-green-100 bg-white/80 backdrop-blur p-6 md:p-8 shadow-sm"
              >
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Kontak Cepat</h3>

                <ul className="space-y-4 mb-8">
                  {contactInfo.map((info, idx) => {
                    const Icon = info.icon;
                    return (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="p-2.5 rounded-xl bg-green-500 shrink-0"><Icon className="h-5 w-5 text-white" /></span>
                        <div>
                          <p className="text-sm text-gray-600">{info.title}</p>
                          <p className="text-base font-semibold text-green-700">{info.value}</p>
                          <p className="text-xs text-gray-500">{info.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Ikuti Kami</h4>
                  <div className="flex gap-3">
                    <Button variant="outline" size="icon" className="rounded-xl border-gray-300 hover:bg-green-50">
                      <Linkedin className="h-5 w-5 text-green-700" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-xl border-gray-300 hover:bg-green-50">
                      <Github className="h-5 w-5 text-green-700" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-xl border-gray-300 hover:bg-green-50">
                      <Facebook className="h-5 w-5 text-green-700" />
                    </Button>
                  </div>
                </div>

                {/* Simple credibility strip */}
                <div className="mt-8 rounded-xl bg-green-50 border border-green-100 p-4">
                  <p className="text-sm text-green-800">
                    Data Anda aman. Kami hanya menggunakan informasi untuk kebutuhan konsultasi & dukungan.
                  </p>
                </div>
              </motion.aside>
            </div>
          </div>
        </section>

        {/* FAQ (ringkas) */}
        <section className="pb-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-green-100 bg-white/80 backdrop-blur p-6 md:p-8 shadow-sm"
            >
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6 text-center">Pertanyaan Umum</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Bagaimana cara kerja sistem monitoring?</h3>
                  <p className="text-gray-600">Menggunakan sensor DHT22 ke ESP32 untuk mengukur suhu & kelembaban secara real-time.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Apakah dapat diakses jarak jauh?</h3>
                  <p className="text-gray-600">Bisa. Akses dashboard web dari mana saja selama terhubung internet.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Akurasi DHT22?</h3>
                  <p className="text-gray-600">±0.5°C untuk suhu dan ±2% untuk kelembaban relatif.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Ekspor data?</h3>
                  <p className="text-gray-600">Bisa ekspor CSV untuk analisis lanjutan.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-green-100 text-center py-6 border-t border-green-200">
          <p className="text-sm text-green-800">&copy; {new Date().getFullYear()} Sistem Monitoring Irigasi Tetes Cabai.</p>
          <p className="text-xs text-green-700 mt-1">Powered by iTELVORE</p>
        </footer>
      </div>
    </>
  );
}
