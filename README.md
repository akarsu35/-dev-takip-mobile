# 📚 Ödev Takip Mobile

Öğretmenler için tasarlanmış, öğrenci ödevlerini, gelişim süreçlerini ve veli bilgilendirmelerini tek bir noktadan yönetmeye olanak tanıyan modern bir mobil uygulama.

---

## 🚀 Öne Çıkan Özellikler

- **👥 Sınıf ve Öğrenci Yönetimi**: Sınıflarınızı oluşturun, öğrencilerinizi Excel üzerinden toplu halde veya manuel olarak kolayca ekleyin.
- **📝 Ödev Atama & Takip**: Farklı sınıflara veya seçili öğrencilere ödevler atayın. Ödevlerin durumunu (Yapıldı, Eksik, Yapmadı vb.) anlık olarak güncelleyin.
- **📄 Profesyonel PDF Raporlama**:
  - **Toplu Raporlar**: Tüm sınıf veya seçili öğrenciler için kapsamlı başarı raporları.
  - **Bireysel Raporlar**: Her öğrenciye özel, isimlerine göre otomatik isimlendirilmiş profesyonel rapor dosyaları.
  - **Gelişim Takibi**: Öğrencinin tüm geçmişini içeren detaylı gelişim çıktıları.
- **💬 WhatsApp Entegrasyonu**: 
  - Veli telefon numaralarına rehbere eklemeye gerek kalmadan direkt yönlendirme.
  - Ödev durumlarını şık bir metin özeti veya PDF raporu olarak paylaşma.
- **📊 İstatistik ve Analiz**: Sınıf ve öğrenci bazlı başarı grafiklerini inceleyerek süreci optimize edin.

---

## 🛠️ Teknik Altyapı

- **Framework**: [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/) (SDK 54)
- **Veritabanı & Auth**: [Supabase](https://supabase.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **UI & Styling**: Custom Premium Design System (Modern & Responsive)
- **PDF Engine**: `expo-print` & `expo-sharing`
- **Excel Processing**: `xlsx` (SheetJS)

---

## ⚙️ Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v18+)
- Expo Go (Mobil cihazda test için)

### Adımlar

1. **Depoyu klonlayın**:
   ```bash
   git clone [repository-url]
   cd odev-takip-mobile
   ```

2. **Bağımlılıkları yükleyin**:
   ```bash
   npm install
   ```

3. **Çevre değişkenlerini ayarlayın**:
   Root dizininde bir `.env` dosyası oluşturun ve Supabase bilgilerinizi ekleyin:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Uygulamayı başlatın**:
   ```bash
   npx expo start
   ```

---

## 📱 Ekran Görüntüleri

| Kontrol Paneli | Ödev Listesi | Gelişim Takibi | Raporlama |
| :---: | :---: | :---: | :---: |
| 📋 | 📚 | 📈 | 📄 |

*(Görseller eklenebilir)*

---

## 📄 Lisans

Bu proje kişisel/eğitim amaçlı kullanım için tasarlanmıştır.

---

**Geliştiren:** [Cumhur] 🚀
