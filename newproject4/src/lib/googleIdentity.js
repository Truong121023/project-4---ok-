const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let googleIdentityScriptPromise = null;

function getGoogleIdentityApi() {
  return window.google?.accounts?.id ?? null;
}

export function loadGoogleIdentityScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services are only available in the browser."));
  }

  if (getGoogleIdentityApi()) {
    return Promise.resolve(getGoogleIdentityApi());
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        const googleIdentityApi = getGoogleIdentityApi();

        if (!googleIdentityApi) {
          reject(new Error("Google Sign-In library loaded, but the API is unavailable."));
          return;
        }

        resolve(googleIdentityApi);
      });
      existingScript.addEventListener("error", () => {
        reject(new Error("Unable to load Google Sign-In."));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const googleIdentityApi = getGoogleIdentityApi();

      if (!googleIdentityApi) {
        reject(new Error("Google Sign-In library loaded, but the API is unavailable."));
        return;
      }

      resolve(googleIdentityApi);
    };
    script.onerror = () => {
      reject(new Error("Unable to load Google Sign-In."));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    googleIdentityScriptPromise = null;
    throw error;
  });

  return googleIdentityScriptPromise;
}
