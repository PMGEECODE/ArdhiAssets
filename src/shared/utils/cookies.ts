// Cookie utility functions
export const setCookie = (
  name: string,
  value: string,
  days: number = 7
): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
};

export const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export const deleteCookie = (name: string): void => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;SameSite=Strict;Secure`;
};

// Auth-specific cookie functions
export const getAuthToken = (): string | null => {
  const authData = getCookie("auth-data");
  if (!authData) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(authData));
    return parsed?.token || null;
  } catch (error) {
    console.error("Error parsing auth cookie:", error);
    return null;
  }
};

export const setAuthData = (authData: any, days: number = 7): void => {
  const encodedData = encodeURIComponent(JSON.stringify(authData));
  setCookie("auth-data", encodedData, days);
};

export const clearAuthData = (): void => {
  deleteCookie("auth-data");
};
