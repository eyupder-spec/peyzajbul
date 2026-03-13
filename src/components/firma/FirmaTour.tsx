"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const FirmaTour = () => {
  useEffect(() => {
    // Check if user has already seen the tour
    const hasSeenTour = localStorage.getItem("has-seen-firma-tour");
    
    // We trigger the tour with a small delay to ensure all elements are rendered
    const timer = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        nextBtnText: 'İleri',
        prevBtnText: 'Geri',
        doneBtnText: 'Anladım',
        steps: [
          { 
            element: '#sidebar-menu', 
            popover: { 
              title: 'Hoş Geldiniz!', 
              description: 'Burası işletmenizin dijital yönetim paneli. Buradan tüm işlemlerinizi yönetebilirsiniz.',
              side: "right",
              align: 'start'
            } 
          },
          { 
            element: '#tour-balance', 
            popover: { 
              title: 'Jeton Bakiyeniz', 
              description: 'Talepleri (Lead) açmak için jeton kullanırsınız. Buradan güncel bakiyenizi görebilirsiniz.',
              side: "bottom",
              align: 'start'
            } 
          },
          { 
            element: '#tour-stats', 
            popover: { 
              title: 'Hızlı İstatistikler', 
              description: 'Gelen toplam talep ve satın alma sayılarınızı buradan takip edin.',
              side: "bottom",
              align: 'start'
            } 
          },
          { 
            element: '#tour-lead-table', 
            popover: { 
              title: 'Talep Listesi', 
              description: 'Size yakın müşterilerin gönderdiği tüm bahçe/peyzaj talepleri burada listelenir.',
              side: "top",
              align: 'start'
            } 
          },
          { 
            element: '#tour-lead-preview', 
            popover: { 
              title: 'Önizleme', 
              description: 'Jeton harcamadan önce projenin detaylarını (hizmet türü, bölge, bütçe) buradan inceleyebilirsiniz.',
              side: "left",
              align: 'start'
            } 
          },
          { 
            element: '#tour-lead-purchase', 
            popover: { 
              title: 'İletişim Bilgilerini Aç', 
              description: 'Müşterinin ad soyad ve telefon numarasını görerek hemen iletişime geçmek için bu butonu kullanın.',
              side: "left",
              align: 'start'
            } 
          },
          { 
            popover: { 
              title: 'Hazırsınız!', 
              description: 'Yeni iş fırsatlarını kaçırmamak için paneli sık sık kontrol etmeyi unutmayın. Başarılar dileriz!',
            } 
          },
        ]
      });

      if (!hasSeenTour) {
        driverObj.drive();
        localStorage.setItem("has-seen-firma-tour", "true");
      }

      // Add a global function to restart tour
      (window as any).startFirmaTour = () => {
        driverObj.drive();
      };
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return null;
};

export default FirmaTour;
