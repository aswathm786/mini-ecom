/**
 * Razorpay Loader
 * 
 * Lazy loads Razorpay Checkout SDK and provides interface to open checkout.
 */

interface RazorpayOptions {
  key: string;
  amount: number;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: () => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let razorpayLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Load Razorpay SDK script
 */
export async function loadRazorpaySDK(): Promise<void> {
  if (razorpayLoaded) {
    return;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    if (window.Razorpay) {
      razorpayLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      razorpayLoaded = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay SDK'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Open Razorpay Checkout
 */
export async function openRazorpayCheckout(
  options: Omit<RazorpayOptions, 'handler'> & {
    handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
  }
): Promise<void> {
  try {
    await loadRazorpaySDK();

    if (!window.Razorpay) {
      throw new Error('Razorpay SDK not available');
    }

    const razorpay = new window.Razorpay({
      ...options,
      handler: async (response) => {
        try {
          await options.handler(response);
        } catch (error) {
          console.error('Error in Razorpay handler:', error);
          throw error;
        }
      },
      modal: {
        ondismiss: () => {
          // User closed the modal
          console.log('Razorpay checkout closed by user');
        },
      },
    });

    razorpay.open();
  } catch (error) {
    console.error('Error opening Razorpay checkout:', error);
    throw error;
  }
}

export type { RazorpayPaymentResponse, RazorpayOptions };

