import React from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Gauge, Cpu, Cloud, Shield, LineChart, Leaf, CheckCircle2 } from "lucide-react";

export default function TentangHidroponikIoT() {
  const features = [
    { icon: Gauge, title: "Monitoring Real-time", desc: "Pantau suhu, kelembaban, pH, EC, dan level nutrisi secara langsung dari dashboard." },
    { icon: Cpu, title: "Kontrol Otomatis", desc: "Atur pompa, aerator, dan pencahayaan dengan automasi berbasis aturan dan jadwal." },
    { icon: Cloud, title: "Akses Cloud", desc: "Data tersimpan aman di cloud, bisa diakses di mana saja melalui web & mobile." },
    { icon: LineChart, title: "Analitik & Historis", desc: "Tren, grafik, dan ekspor data CSV untuk analisis lanjutan." },
    { icon: Shield, title: "Keamanan Tinggi", desc: "Enkripsi in-transit, kontrol akses, dan backup berkala." },
    { icon: Leaf, title: "Efisiensi Nutrisi", desc: "Optimasi penggunaan air & nutrisi untuk hasil lebih konsisten." }
  ];

  const steps = [
    { title: "Sensor (DHT22)", text: "DHT22/AM2302 mengukur suhu & kelembaban lingkungan.", img: "https://upload.wikimedia.org/wikipedia/commons/8/88/DHT_22_Sensor.jpg" },
    { title: "Gateway (ESP32)", text: "ESP32 mengirim data via Wi‑Fi/MQTT ke server.", img: "https://upload.wikimedia.org/wikipedia/commons/2/20/ESP32_Espressif_ESP-WROOM-32_Dev_Board.jpg" },
    { title: "Server & Cloud", text: "Data disimpan & diproses di server/cloud untuk automasi.", img: "https://upload.wikimedia.org/wikipedia/commons/4/47/Server_Rack_%2854126210834%29.jpg" },
    { title: "Dashboard", text: "Pantau grafik & metrik dari dashboard web.", img: "https://upload.wikimedia.org/wikipedia/commons/f/fa/WMCS_Edits_Dashboard_Screenshot.png" }
  ];

  return (
    <>
      <Helmet>
        <title>Tentang HidroponikIoT – Penjelasan & Cara Kerja</title>
        <meta name="description" content="Pelajari apa itu HidroponikIoT, fitur, arsitektur, manfaat, dan cara kerjanya untuk kebun hidroponik modern." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        {/* HERO */}
        <section className="pt-24 pb-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-bold text-gray-900"
            >
              HidroponikIoT
            </motion.h1>
            <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
              Platform monitoring & automasi untuk sistem hidroponik yang membantu Anda menjaga
              konsistensi lingkungan tanam dengan data real‑time dan kontrol otomatis.
            </p>
            <div className="mt-4 text-xs text-green-700 bg-green-100 inline-flex px-3 py-1 rounded-full border border-green-200">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1"/> Ramah pemula • Fleksibel untuk skala komersial
            </div>
          </div>
        </section>

        <section className="pb-12">
  <div className="max-w-6xl mx-auto px-4 sm:px-6">
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {features.map((f, i) => {
        const Icon = f.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.03 }}
            className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm"
          >
            <div className="p-2.5 rounded-xl bg-green-500 w-fit mb-4">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base md:text-lg">
              {f.title}
            </h3>
            <p className="text-gray-600 mt-1.5 text-xs sm:text-sm md:text-base">
              {f.desc}
            </p>
          </motion.div>
        );
      })}
    </div>
  </div>
</section>


        {/* HOW IT WORKS WITH ACCURATE IMAGES */}
        <section className="pb-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="rounded-2xl border border-green-100 bg-white p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Cara Kerja</h2>
              <div className="grid md:grid-cols-4 gap-4">
                {steps.map((s, i) => (
                  <div key={i} className="rounded-xl border border-green-100 bg-green-50 overflow-hidden">
                    {s.img && (
                      <img src={s.img} alt={s.title} className="w-full h-28 object-cover" loading="lazy" />
                    )}
                    <div className="p-4">
                      <div className="text-xs text-green-700 font-medium">Langkah {i + 1}</div>
                      <h4 className="mt-1 font-semibold text-gray-900">{s.title}</h4>
                      <p className="mt-1 text-sm text-gray-600">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-gray-500 text-center">Gambar: Wikimedia Commons (lisensi CC sesuai halaman sumber).</p>
            </div>
          </div>
        </section>

        {/* FOOTER SIMPLE */}
        <footer className="bg-green-100 text-center py-6 border-t border-green-200">
          <p className="text-sm text-green-800">&copy; {new Date().getFullYear()} Sistem Monitoring Irigasi Tetes Cabai.</p>
          <p className="text-xs text-green-700 mt-1">Powered by iTELVORE</p>
        </footer>
      </div>
    </>
  );
}