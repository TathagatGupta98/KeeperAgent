function showToast(message) {
  let toast = document.querySelector('[data-toast]');

  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('data-toast', '');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    if (toast && toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 1800);
}

document.addEventListener('click', async (event) => {
  const copyButton = event.target.closest('[data-copy-text]');

  if (!copyButton) {
    return;
  }

  const text = copyButton.getAttribute('data-copy-text') || '';

  if (!text) {
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    showToast('Copied workflow link');
  } catch {
    showToast('Copy unavailable in this preview');
  }
});
