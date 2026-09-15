interface SessionDetails {
  ipAddress: string;
  country: string;
  browser: string;
  device: string;
}

export async function detectUserSession(): Promise<SessionDetails> {
  let ipAddress = '127.0.0.1';
  let country = 'Local Sandbox';
  
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      ipAddress = data.ip || '127.0.0.1';
      country = data.country_name || data.country || 'United States';
    }
  } catch (err) {
    // fallback to secondary api if blocked or failed
    try {
      const fallback = await fetch('https://api.ipify.org?format=json');
      if (fallback.ok) {
        const data = await fallback.json();
        ipAddress = data.ip || '127.0.0.1';
        country = 'Detected Client';
      }
    } catch (e) {
      console.warn("Could not retrieve IP address", e);
    }
  }

  // Parse exact operating system, brand, and versions
  const ua = navigator.userAgent;
  let browser = 'Chrome Core';
  let device = 'Desktop PC';

  // Device context detection
  if (/android/i.test(ua)) {
    const match = ua.match(/Android\s+([0-9\.]+)/);
    const version = match ? match[1] : '13';
    let brand = 'Android Mobile';
    if (/samsung/i.test(ua)) brand = 'Samsung Galaxy';
    else if (/pixel/i.test(ua)) brand = 'Google Pixel';
    else if (/huawei/i.test(ua)) brand = 'Huawei';
    else if (/redmi|xiaomi/i.test(ua)) brand = 'Xiaomi Redmi';
    device = `${brand} (OS ${version})`;
  } else if (/iphone/i.test(ua)) {
    const match = ua.match(/OS\s+([0-9_]+)/);
    const version = match ? match[1].replace(/_/g, '.') : '16.4';
    device = `Apple iPhone (iOS ${version})`;
  } else if (/ipad/i.test(ua)) {
    const match = ua.match(/OS\s+([0-9_]+)/);
    const version = match ? match[1].replace(/_/g, '.') : '16';
    device = `Apple iPad (iPadOS ${version})`;
  } else if (/macintosh|mac os x/i.test(ua)) {
    const match = ua.match(/Mac OS X\s+([0-9_]+)/);
    const version = match ? match[1].replace(/_/g, '.') : '14.1';
    device = `Apple Mac (macOS ${version})`;
  } else if (/windows/i.test(ua)) {
    const match = ua.match(/Windows NT\s+([0-9\.]+)/);
    let winVer = 'PC';
    if (match) {
      if (match[1] === '10.0') {
        winVer = ua.includes('Windows 11') ? 'Windows 11' : 'Windows 10';
      } else if (match[1] === '6.3') winVer = 'Windows 8.1';
      else if (match[1] === '6.2') winVer = 'Windows 8';
      else if (match[1] === '6.1') winVer = 'Windows 7';
    }
    device = `Desktop PC (${winVer})`;
  } else if (/linux/i.test(ua)) {
    device = 'Linux Workstation';
  }

  // Browser check
  if (/edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/opr\//i.test(ua)) {
    browser = 'Opera Browser';
  }

  return { ipAddress, country, browser, device };
}
