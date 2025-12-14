'use client';

//src/app/tanitim/page.js
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const ROTATION_INTERVAL = 4500;
const CARD_WIDTH = 400;
const CARD_HEIGHT = 224;
const CARD_SPACING = CARD_WIDTH * 0.65;
const DRAG_THRESHOLD = 60;

const customerImages = [
  { src: '/images/tanitim/musteri1_cvp.jpg', alt: 'Simulai at work' },
  { src: '/images/tanitim/musteri2_cvp.jpg', alt: 'Simulai at work' },
  { src: '/images/tanitim/musteri3_cvp.jpg', alt: 'Simulai at work' },
  { src: '/images/tanitim/musteri4_cvp.jpg', alt: 'Simulai at work' },
];

const USE_CASE_ROTATION_INTERVAL = 4500;

const useCases = [
  {
    title: 'Yeni Çalışanların Eğitimi',
    stat: "Yeni ekip üyelerini hızla işe oryante edin.",
    description:
      'SimulAI, işe yeni başlayan ekip üyelerinizin ürün ve hizmet bilgilerini gerçek senaryolarla pekiştirir; yöneticileriniz gelişimi anlık olarak izleyebilir.',
    image: '/images/tanitim/new_hire.jpg',
    imageAlt: 'SimulAI ile yeni işe başlayan çalışan uygulama yapıyor',
  },
  {
    title: 'Ürün ve Mesaj Standardı',
    stat: 'Eğitim verimliliğini artırın.',
    description:
      'Marka dilinizi tüm sahada tutarlı hale getirin. SimulAI, ekiplerin ürün anlatımlarındaki farklılıkları yakalar ve standart mesajı güçlendirir.',
    image: '/images/tanitim/standart_train.jpg',
    imageAlt: 'SimulAI ile ürün mesajı üzerinde çalışan ekip',
  },
  {
    title: 'Ulusal Satış Toplantısı / Kickoff',
    stat: 'Tüm ekibi aynı anda hazır hale getirin.',
    description:
      'Ulusal toplantılar ve kickoff öncesinde ekiplerinizi aynı senaryolarla hazırlayın; herkesin lansman mesajına hakim olduğundan emin olun.',
    image: '/images/tanitim/kickoff.webp',
    imageAlt: 'Kickoff hazırlığı yapan satış ekibi',
  },
  {
    title: 'Sürekli Pratik',
    stat: 'Daha fazla pratik, daha fazla yönetici koçluğu.',
    description:
      'Saha ekiplerinin her zaman girebileceği uygulamalar hazırlayın; SimulAI yöneticilere koçluk fırsatlarını raporlar.',
    image: '/images/tanitim/surekli_pratik.jpg',
    imageAlt: 'SimulAI ile uygulama yapan çalışan',
  },
];

const INITIAL_FORM_DATA = {
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  phone: '',
  companySize: '',
};

export default function Page() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeUseCase, setActiveUseCase] = useState(0);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [formStatus, setFormStatus] = useState({ state: 'idle', message: '' });
    const totalSlides = customerImages.length;
    const totalUseCases = useCases.length;
    const useCaseIntervalRef = useRef(null);
    const rotationIntervalRef = useRef(null);
    const carouselRef = useRef(null);
    const dragStateRef = useRef({ startX: 0, deltaX: 0, isDragging: false });
    const isSubmitting = formStatus.state === 'loading';
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const goToNextSlide = useCallback(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, [totalSlides]);

    const goToPrevSlide = useCallback(() => {
      setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    }, [totalSlides]);

    const stopSlideRotation = useCallback(() => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
    }, []);

    const startSlideRotation = useCallback(() => {
      stopSlideRotation();
      rotationIntervalRef.current = setInterval(goToNextSlide, ROTATION_INTERVAL);
    }, [goToNextSlide, stopSlideRotation]);

    const scheduleUseCaseRotation = useCallback(() => {
      if (useCaseIntervalRef.current) {
        clearInterval(useCaseIntervalRef.current);
      }

      useCaseIntervalRef.current = setInterval(() => {
        setActiveUseCase((prev) => (prev + 1) % totalUseCases);
      }, USE_CASE_ROTATION_INTERVAL);
    }, [totalUseCases]);

    useEffect(() => {
      startSlideRotation();

      return stopSlideRotation;
    }, [startSlideRotation, stopSlideRotation]);

    useEffect(() => {
      scheduleUseCaseRotation();

      return () => {
        if (useCaseIntervalRef.current) {
          clearInterval(useCaseIntervalRef.current);
        }
      };
    }, [scheduleUseCaseRotation]);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setIsMenuOpen(false);
        }
      };

      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, []);

    useEffect(() => {
      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          setIsMenuOpen(false);
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }, []);

    const completeDrag = useCallback((event, shouldCommit = true) => {
      if (!dragStateRef.current.isDragging) {
        return;
      }

      if (event?.currentTarget && typeof event.currentTarget.releasePointerCapture === 'function') {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {}
      }

      const deltaX = dragStateRef.current.deltaX;

      dragStateRef.current.isDragging = false;
      dragStateRef.current.startX = 0;
      dragStateRef.current.deltaX = 0;

      if (shouldCommit && Math.abs(deltaX) > DRAG_THRESHOLD) {
        if (deltaX > 0) {
          goToPrevSlide();
        } else {
          goToNextSlide();
        }
      }

      startSlideRotation();
    }, [goToNextSlide, goToPrevSlide, startSlideRotation]);

    const handlePointerDown = useCallback((event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      dragStateRef.current.startX = event.clientX;
      dragStateRef.current.deltaX = 0;
      dragStateRef.current.isDragging = true;

      stopSlideRotation();

      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }, [stopSlideRotation]);

    const handlePointerMove = useCallback((event) => {
      if (!dragStateRef.current.isDragging) {
        return;
      }

      dragStateRef.current.deltaX = event.clientX - dragStateRef.current.startX;
    }, []);

    const handlePointerUp = useCallback((event) => {
      completeDrag(event, true);
    }, [completeDrag]);

    const handlePointerLeave = useCallback(() => {
      completeDrag(null, false);
    }, [completeDrag]);

    const handlePointerCancel = useCallback(() => {
      completeDrag(null, false);
    }, [completeDrag]);

    const getOffset = (index) => {
      const diff = index - activeIndex;
      const half = Math.floor(totalSlides / 2);
      if (diff > half) {
        return diff - totalSlides;
      }
      if (diff < -half) {
        return diff + totalSlides;
      }
      return diff;
    };

    const handleUseCaseSelect = (index) => {
      setActiveUseCase(index);
      scheduleUseCaseRotation();
    };

    const handleFormChange = (event) => {
      const { name, value } = event.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      if (formStatus.state !== 'idle') {
        setFormStatus({ state: 'idle', message: '' });
      }
    };

    const handleFormSubmit = async (event) => {
      event.preventDefault();
      setFormStatus({ state: 'loading', message: 'Gönderiliyor...' });

      try {
        const response = await fetch('/api/demo-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const responseBody = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMessage = (responseBody && responseBody.error) || 'Bir sorun oluştu. Lütfen tekrar deneyin.';
          throw new Error(errorMessage);
        }

        setFormStatus({
          state: 'success',
          message:
            (responseBody && responseBody.message) || 'Talebinizi aldık. Ekibimiz en kısa sürede sizinle iletişime geçecek.',
        });
        setFormData(INITIAL_FORM_DATA);
      } catch (error) {
        setFormStatus({
          state: 'error',
          message: error.message || 'Bir sorun oluştu. Lütfen tekrar deneyin.',
        });
      }
    };

    const activeUseCaseData = useCases[activeUseCase];
    const activeTabId = `usecase-tab-${activeUseCase}`;
    const activePanelId = `usecase-panel-${activeUseCase}`;

    return (
      <main className="bg-white text-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
            <a href="https://simulai.com.tr/tanitim" className="flex items-center gap-2 font-semibold tracking-tight text-2xl">
              SimulAİ
            </a>
            <nav className="hidden items-center gap-6 text-sm md:flex">
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                >
                  Menü
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-500" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                    />
                  </svg>
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 text-left shadow-xl">
                    <a
                      href="#gercekci-rol-oyunlari"
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Gerçekçi Rol Oyunları
                    </a>
                    <a
                      href="#nasil-calisir"
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Nasıl Çalışır
                    </a>
                    <a
                      href="#nasil-kullaniyorlar"
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Nasıl Kullanıyorlar
                    </a>
                    <a
                      href="#neden-simulai"
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Neden SimulAİ
                    </a>
                    <div className="mt-2 border-t border-slate-200 pt-2">
                      <a
                        href="#form"
                        className="block rounded-lg px-3 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Demo İste
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <a href="https://simulai.com.tr/giris" className="rounded-full border px-4 py-1.5 text-sm hover:bg-slate-50">Giriş</a>
              <a href="#form" className="rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700">Demo İste</a>
            </nav>
          </div>
        </header>
  
        {/* Hero */}
        <section id="platform" className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-20%,#0ea5e9_0%,transparent_60%)] opacity-30" />
          <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-8 text-center md:pb-20 md:pt-14">
            <div className="flex flex-col items-center gap-5">
              <p className="text-5xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
                <span className="text-slate-900">Yapay Zeka Destekli Rol Oyunları</span>
              </p>
              <p className="max-w-3xl text-lg text-slate-600">
               Satış, etkileme ve ikna, müşteri memnuniyeti, liderlik gibi pratik yapmanın önemli olduğu tüm eğitimlerde yapay zeka destekli rol oyunları ile verilen yetkinlileri birebir uygulatın. Sonuçları analiz edin, gelişimi raporlayın.
                              </p>
  <br></br> 
            </div>
            <div className="mt-0 w-full">
              <div
                ref={carouselRef}
                className="relative mx-auto min-h-[192px] w-full max-w-6xl cursor-grab select-none sm:min-h-[240px] md:min-h-[336px] lg:min-h-[384px] active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerCancel}
              >
                {customerImages.map((image, index) => {
                  const offset = getOffset(index);
                  const distance = Math.abs(offset);

                  return (
                    <div
                      key={image.src}
                      className="absolute left-1/2 top-1/2 flex h-[180px] w-full max-w-[615px] overflow-hidden rounded-[40px] bg-white shadow-2xl transition-all duration-700 ease-in-out sm:h-[216px] md:h-[312px] lg:h-[360px]"
                      style={{
                        transform: `translate(-50%, -50%) translateX(${offset * CARD_SPACING}px) scale(${distance === 0 ? 1.05 : distance === 1 ? 0.9 : 0.8})`,
                        filter: `blur(${distance === 0 ? 0 : distance === 1 ? 8 : 18}px)`,
                        opacity: distance === 0 ? 1 : distance === 1 ? 0.6 : 0.35,
                        zIndex: distance === 0 ? 30 : distance === 1 ? 20 : 10,
                        pointerEvents: 'none',
                      }}
                    >
                      <Image
                        src={image.src}
                        alt={image.alt}
                        width={CARD_WIDTH}
                        height={CARD_HEIGHT}
                        sizes="(max-width: 768px) 80vw, (max-width: 1280px) 55vw, 45vw"
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <a href="#form" className="mt-10 inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-600">
              Demo İste
            </a>
          </div>
          <div className="mx-auto max-w-7xl px-4">
            <div className="h-8 w-full rounded-t-[2rem] bg-gradient-to-b from-transparent to-white" />
          </div>
        </section>
  
    {/* Intro / Works */}
<section id="gercekci-rol-oyunlari" className="bg-slate-900 py-20 text-white">
<div className="mx-auto max-w-6xl px-4">
<h2 className="text-center text-4xl font-extrabold tracking-tight md:text-5xl">
Gerçekçi
<br className="hidden md:block" /> Yapay Zeka Destekli Rol Oyunları
</h2>
<p className="mx-auto mt-6 max-w-3xl text-center text-slate-300">
Rol oyunu, yetkinliklerin hızla gelişmesini sağlayan en iyi yöntemdir. Ancak çoğu kişi sınıf içinde ya da arkadaşlarının karşısında rol yapmaktan hoşlanmaz.
Simulai, pratik yapmayı kolaylaştırır, verileri sizin için toplar ve yöneticilerinize eyleme dönük raporlar sunar.

</p>


{/* Feature grid */}
<div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
{[
{
title: "Rol Oyunu",
desc:
"Yapay Zeka ile desteklenmiş, gerçeğe yakın rol oyunları ile tekrar tekrar pratik yaptırın; farklı müşteri profiline ve segementine  göre senaryoları oluşturun..",
icon: (
<svg viewBox="0 0 24 24" className="h-8 w-8 text-emerald-400"><path fill="currentColor" d="M4 5h16v12H4z" opacity=".15"/><path fill="currentColor" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V4zm2 1v10h14V5H5z"/></svg>
),
},
{
title: "Yetkinlik Raporları",
desc:
"İstediğiniz şekilde hazırlanmış rol oyunlarını yaptıkça; pazarlama mesajları, ürün bilgisi, satış yetkinlikleri hakkında ölçümler elde edebilirsiniz.",
icon: (
<svg viewBox="0 0 24 24" className="h-8 w-8 text-emerald-400"><path fill="currentColor" d="M4 19V5h2v14H4zm7 0V8h2v11h-2zm7 0V3h2v16h-2z"/></svg>
),
},
{
title: "Gelişim Yolculuğu",
desc:
"Kişiselleştirilmiş, eyleme dönük raporlar ve öneriler ile çalışanlarınızı daha hızlı gelişirebilirsiniz; yöneticileriniz de bunları raporlayarak tutarlı koçluk verebilir.",
icon: (
<svg viewBox="0 0 24 24" className="h-8 w-8 text-emerald-400"><path fill="currentColor" d="M12 2a7 7 0 1 1 0 14a7 7 0 0 1 0-14zm0 16c4.418 0 8 2.015 8 4.5V23H4v-.5C4 20.015 7.582 18 12 18z"/></svg>
),
},
{
title: "Sertifikasyon & Raporlama",
desc:
"Birey, ekip ve organizasyon seviyesinde içgörüler ile rol oynama sonucu elde edilen ilerlemeyi güvenle raporlayabilirsiniz.",
icon: (
<svg viewBox="0 0 24 24" className="h-8 w-8 text-emerald-400"><path fill="currentColor" d="M6 2h12a2 2 0 0 1 2 2v18l-8-4l-8 4V4a2 2 0 0 1 2-2z"/></svg>
),
},
].map((f) => (
<div key={f.title} className="rounded-2xl bg-slate-800 p-6 text-left shadow">
<div className="mb-4">{f.icon}</div>
<h3 className="text-lg font-semibold text-white">{f.title}</h3>
<p className="mt-2 text-sm text-slate-300">{f.desc}</p>
</div>
))}
</div>
</div>
</section>
  
        {/* Timeline / How it works */}
        <section id="nasil-calisir" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-4xl font-extrabold tracking-tight md:text-5xl">Nasıl Çalışır</h2>
            <ol className="relative mt-14 space-y-24 border-l-2 border-emerald-200 pl-8">
              <li className="grid items-center gap-10 md:grid-cols-2">
                <div>
                  <h3 className="text-xl font-semibold">Yapay Zeka Destekli Rol Oyunları Oynatın</h3>
                  <p className="mt-3 text-slate-600">Sizin belirleyeceğiniz yetkinliklere ve bilgilere göre oluşturulan rol oyunları ile güvenli bir ortamda sınırsız pratik yaptırabilirsiniz. Simulai görüşmeleri değerlendirir, verileri otomatik toplar.</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-8 flex items-center justify-center">
                  <Image src="/images/tanitim/verda2.png" alt="Rol Oyunları" width={300} height={192} className="h-48 w-auto" />
                </div>
              </li>
              <li className="grid items-center gap-10 md:grid-cols-2">
                <div className="order-2 md:order-1">
                  <h3 className="text-xl font-semibold">Sonuçları Analiz Edin</h3>
                  <p className="mt-3 text-slate-600">Bilimsel ölçütler ve özel rubriklerle hangi becerilerin analiz edileceğine siz karar verin. Satış, etkileme ve ikna teknikleri ya da liderlik becerisini mi analiz etmek istiyorsunuz yoksa ürün bilgisinin tam olup olmadığını mı? Buna göre analizler geliştirebilirsiniz.</p>
                </div>
                <div className="order-1 rounded-2xl bg-sky-50 p-8 md:order-2 flex items-center justify-center">
                  <Image src="/images/tanitim/Analyze-Data.svg" alt="Analiz Et" width={300} height={192} className="h-48 w-auto" />
                </div>
              </li>
              <li className="grid items-center gap-10 md:grid-cols-2">
                <div>
                  <h3 className="text-xl font-semibold">Gelişimi Raporlayın</h3>
                  <p className="mt-3 text-slate-600">Çalışanlarınızın yetkinliklerini ve becerilerinin ne durumda olduğunu raporlayabilir, rol oyunlarını yaptıkça hangi yetkinliklerin geliştiğini görebilirsiniz.
                    Ekipler arasında karşılaştırmalar yapabilir ve istediğiniz şekilde ekibinizi yönlendirebilirsiniz</p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-8 flex items-center justify-center">
                  <Image src="/images/tanitim/Financial-Services_Message-Optimization.svg" alt="Gelişimi Raporlayın" width={300} height={192} className="h-48 w-auto" />
                </div>
              </li>
            </ol>
          </div>
        </section>
  {/* How teams use SimulAI */}
  <section id="nasil-kullaniyorlar" className="bg-white py-20">
    <div className="mx-auto max-w-6xl px-4">
      <h2 className="text-center text-4xl font-extrabold tracking-tight md:text-5xl">Şirketler Simulai Nasıl Kullanıyor?</h2>
      <div className="mt-12">
        <div
          role="tablist"
          aria-label="SimulAI kullanım senaryoları"
          className="flex flex-wrap justify-center gap-3 border-b border-slate-200 pb-4"
        >
          {useCases.map((useCase, index) => {
            const isActive = index === activeUseCase;
            const tabId = `usecase-tab-${index}`;
            return (
              <button
                key={useCase.title}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`usecase-panel-${index}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
                onClick={() => handleUseCaseSelect(index)}
                onFocus={() => handleUseCaseSelect(index)}
              >
                {useCase.title}
              </button>
            );
          })}
        </div>
        <div className="mt-10 flex flex-col gap-12 lg:flex-row lg:items-center">
          <div className="lg:w-1/2">
            <div
              role="tabpanel"
              id={activePanelId}
              aria-labelledby={activeTabId}
              className="mt-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all duration-300 lg:mt-0"
            >
              <p className="text-sm font-medium text-emerald-600">{activeUseCaseData.stat}</p>
              <h3 className="mt-3 text-3xl font-semibold text-slate-900">{activeUseCaseData.title}</h3>
              <p className="mt-5 text-base text-slate-600">{activeUseCaseData.description}</p>
              <a
                href="#form"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
              >
                Demo İste
              </a>
            </div>
          </div>
          <div className="lg:w-1/2">
            <div className="relative h-64 w-full overflow-hidden rounded-3xl bg-slate-100 shadow-lg sm:h-72 md:h-80 lg:h-96">
              {useCases.map((useCase, index) => (
                <div
                  key={useCase.image}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    index === activeUseCase ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Image
                    src={useCase.image}
                    alt={useCase.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 40vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
        {/* Why section */}
        <section id="neden-simulai" className="bg-slate-900 py-20 text-white">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-4xl font-extrabold tracking-tight md:text-5xl">Neden SimulAİ?</h2>
            <p className="mx-auto mt-6 max-w-3xl text-center text-slate-300">
              Ekiplerde pazarlama mesajlarınızı ve ürün bilgisini standart hale getirmek zordur. SimulAİ rol oyunları ve raporları ile bunu kolaylaştırır; tutarlı,
              ölçülebilir ve tekrarlanabilir bir sistem sunar.
            </p>
            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {t: "Gerçekçi Uygulamalar", d: "Gerçeğe yakın rol oyunları ile öğrenme hızlanır; ekipleriniz yeni becerileri hızla kazanır."},
                {t: "Hızlı Uyum", d: "Çalışanlarınız işlerine daha hızlı adaptasyon sağlar."},
                {t: "Ekip Ölçeği", d: "Tüm ekibe aynı anda ulaşabillirsiniz, herkesin aynı mesajları doğru ürün bilgileri ile verdiğinden emin olun."},
                {t: "Hazır Olanı Bilin", d: "Raporlar sayesinde kimlerin sahada iyi olduğunu ya da kimlerin hazır olmadığını görün."},
                {t: "Analitik Sonuçlar", d: "Sadece konuşma metrikleri değil; ürün bilgisi, satış yetkinliği, ikna ve ilerleme sinyallerini ölçün."},
                {t: "Sürekli İçgörü", d: "Her uygulamadan sonra size veri üretilir; bu raporlarla yöneticileriniz  çalışanın en kritik noktalarına odaklanır."},
              ].map((i) => (
                <div key={i.t} className="rounded-2xl bg-slate-800 p-6">
                  <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">✓</div>
                  <h3 className="text-lg font-semibold">{i.t}</h3>
                  <p className="mt-2 text-sm text-slate-300">{i.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
  
 
  
        {/* CTA + Form */}
        <section id="form" className="relative bg-gradient-to-b from-slate-50 to-white py-24">
          <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                Ücretsiz Denemek İçin <br className="hidden md:block"/> Demo Talep Edin
              </h2>
              <p className="mt-6 max-w-prose text-slate-600">
                Ekibinizi yapay zeka ile harekete geçirmeye hazır mısınız? Yandaki formu doldurun; bir
                danışmanımız sizinle hemen iletişime geçerek demo bilgilerinizi iletecek.
              </p>
            </div>
  
            <form onSubmit={handleFormSubmit} className="mx-auto w-full max-w-lg rounded-2xl border bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold">Formu doldurun, en kısa sürede iletişime geçelim.</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Ad*</label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Soyad*</label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">İş E-postası*</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Şirket Adı*</label>
                  <input
                    name="company"
                    value={formData.company}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Telefon*</label>
                  <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Şirket Büyüklüğü</label>
                  <select
                    name="companySize"
                    value={formData.companySize}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option>Lütfen Seçin</option>
                    <option>1–10</option>
                    <option>11–50</option>
                    <option>51–250</option>
                    <option>251–1000</option>
                    <option>1000+</option>
                  </select>
                </div>
             
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Gönderdiğiniz bilgiler; yalnızca ürünlerimiz ve hizmetlerimiz hakkında sizinle iletişime geçmek için
                kullanılacaktır. Verilerinizi korumayı taahhüt ediyoruz.
              </p>
              {formStatus.state !== 'idle' && (
                <p
                  className={`mt-4 text-sm ${formStatus.state === 'success' ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {formStatus.message}
                </p>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 w-full rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Gönderiliyor...' : 'Demo Planla'}
              </button>
            </form>
          </div>
        </section>
  
        {/* Footer */}
        <footer id="sirket" className="relative overflow-hidden bg-white py-16 text-slate-900">
          <div className="pointer-events-none absolute bottom-6 left-6 h-24 w-[10.5rem] sm:h-[7.5rem] sm:w-[13.5rem]">
            <Image
              src="/images/background/logoleft.png"
              alt="Sol köşe logosu"
              fill
              sizes="(max-width: 768px) 45vw, 360px"
              className="object-contain"
            />
          </div>
          <div className="pointer-events-none absolute bottom-6 right-6 h-24 w-[10.5rem] sm:h-[7.5rem] sm:w-[13.5rem]">
            <Image
              src="/images/background/logoright.png"
              alt="Sağ köşe logosu"
              fill
              sizes="(max-width: 768px) 45vw, 360px"
              className="object-contain"
            />
          </div>
          <div className="mx-auto max-w-6xl px-4">
            <p className="text-center text-sm font-medium text-black">© {new Date().getFullYear()} SimulAİ. Tüm hakları saklıdır.</p>
          </div>
        </footer>
      </main>
    );
  }


