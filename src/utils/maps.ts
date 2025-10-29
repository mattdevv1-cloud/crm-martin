// Yandex Maps integration utilities

export function openInYandexMaps(address: string, lat?: number, lon?: number) {
  // If coordinates are available, use them for more accurate navigation
  if (lat && lon) {
    // Try to open Yandex Navigator app first
    const navAppUrl = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lon}`;
    
    // Try Yandex Maps app
    const mapsAppUrl = `yandexmaps://maps.yandex.ru/?pt=${lon},${lat}&z=16&l=map`;
    
    // Fallback to web version
    const webUrl = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;
    
    // Try to open app first
    tryOpenApp(navAppUrl, () => {
      // If nav app failed, try maps app
      tryOpenApp(mapsAppUrl, () => {
        // If both failed, open web version
        window.open(webUrl, '_blank');
      });
    });
  } else {
    // If no coordinates, use text search
    const encodedAddress = encodeURIComponent(address);
    const appUrl = `yandexmaps://maps.yandex.ru/?text=${encodedAddress}`;
    const webUrl = `https://yandex.ru/maps/?text=${encodedAddress}`;
    
    tryOpenApp(appUrl, () => {
      window.open(webUrl, '_blank');
    });
  }
}

function tryOpenApp(appUrl: string, fallback: () => void) {
  // Create invisible iframe to try opening app
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = appUrl;
  document.body.appendChild(iframe);
  
  // If app doesn't open in 2 seconds, call fallback
  setTimeout(() => {
    document.body.removeChild(iframe);
    if (document.hidden || !document.hasFocus()) {
      // App likely opened
      return;
    }
    fallback();
  }, 2000);
}

export function makePhoneCall(phone: string) {
  window.location.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function sendSMS(phone: string, message: string) {
  const encodedMessage = encodeURIComponent(message);
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // iOS uses different separator
  const separator = /iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?';
  
  window.location.href = `sms:${cleanPhone}${separator}body=${encodedMessage}`;
}

// Geocoding with Yandex API (requires API key)
export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    // Note: This requires Yandex Geocoder API key
    // For now, return null - implement when API key is available
    console.warn('Geocoding not implemented - requires Yandex API key');
    return null;
    
    // Example implementation:
    // const apiKey = 'YOUR_YANDEX_API_KEY';
    // const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address)}&format=json`;
    // const response = await fetch(url);
    // const data = await response.json();
    // const pos = data.response.GeoObjectCollection.featureMember[0]?.GeoObject.Point.pos;
    // if (pos) {
    //   const [lon, lat] = pos.split(' ').map(Number);
    //   return { lat, lon };
    // }
    // return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Get current location
export function getCurrentLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
