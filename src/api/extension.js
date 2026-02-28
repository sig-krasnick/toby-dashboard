const STORAGE_KEY = 'toby_extension_id';

const getExtensionId = () => localStorage.getItem(STORAGE_KEY);

export const saveExtensionId = (id) => {
  if (id) {
    localStorage.setItem(STORAGE_KEY, id.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export const getSavedExtensionId = () => getExtensionId() || '';

const sendMessage = (message) =>
  new Promise((resolve, reject) => {
    const extensionId = getExtensionId();
    if (!extensionId) {
      return reject(new Error('Extension ID not configured'));
    }
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return reject(new Error('chrome.runtime not available — are you using Chrome?'));
    }
    chrome.runtime.sendMessage(extensionId, message, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!response) {
        return reject(new Error('No response from extension'));
      }
      if (response.error) {
        return reject(new Error(response.error));
      }
      resolve(response);
    });
  });

export const ping = () => sendMessage({ type: 'ping' });

export const getWindows = () => sendMessage({ type: 'getWindows' });

export const openWindow = (urls) => sendMessage({ type: 'openWindow', urls });

export const isExtensionAvailable = async () => {
  try {
    await ping();
    return true;
  } catch {
    return false;
  }
};
