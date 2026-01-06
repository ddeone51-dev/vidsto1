/**
 * AzamPay API integration for payment processing
 * Documentation: https://developerdocs.azampay.co.tz/redoc
 * Based on OpenAPI spec from azampay.sandbox.json
 */

// Load environment variables at module level
import dotenv from "dotenv";
dotenv.config({ override: true, path: ".env" });

const AZAMPAY_AUTHENTICATOR_URL = process.env.AZAMPAY_AUTHENTICATOR_URL || "https://authenticator-sandbox.azampay.co.tz";
const AZAMPAY_CHECKOUT_URL = process.env.AZAMPAY_CHECKOUT_URL || process.env.AZAMPAY_BASE_URL || "https://sandbox.azampay.co.tz";
const AZAMPAY_CLIENT_ID = process.env.AZAMPAY_CLIENT_ID;
const AZAMPAY_CLIENT_SECRET = process.env.AZAMPAY_CLIENT_SECRET;
const AZAMPAY_APP_NAME = process.env.AZAMPAY_APP_NAME;

// Debug logging (remove in production)
console.log("[AzamPay Config] CLIENT_ID:", AZAMPAY_CLIENT_ID ? `${AZAMPAY_CLIENT_ID.substring(0, 10)}...` : "NOT SET");
console.log("[AzamPay Config] CLIENT_SECRET:", AZAMPAY_CLIENT_SECRET ? "SET" : "NOT SET");
console.log("[AzamPay Config] APP_NAME:", AZAMPAY_APP_NAME || "NOT SET");

async function getAccessToken() {
  // Check if credentials are set and not placeholder values
  if (!AZAMPAY_CLIENT_ID || !AZAMPAY_CLIENT_SECRET || !AZAMPAY_APP_NAME) {
    throw new Error("AzamPay credentials not configured. Please set AZAMPAY_CLIENT_ID, AZAMPAY_CLIENT_SECRET, and AZAMPAY_APP_NAME in .env");
  }
  
  // Check for placeholder values
  if (AZAMPAY_CLIENT_ID === "your_client_id_here" || 
      AZAMPAY_CLIENT_SECRET === "your_client_secret_here" || 
      AZAMPAY_APP_NAME === "your_app_name_here") {
    throw new Error("AzamPay credentials are still set to placeholder values. Please replace 'your_client_id_here', 'your_client_secret_here', and 'your_app_name_here' with your actual AzamPay credentials in the .env file.");
  }

  try {
    const response = await fetch(`${AZAMPAY_AUTHENTICATOR_URL}/AppRegistration/GenerateToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appName: AZAMPAY_APP_NAME,
        clientId: AZAMPAY_CLIENT_ID,
        clientSecret: AZAMPAY_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`AzamPay token generation failed: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data?.accessToken || data.accessToken || data.data?.token;
  } catch (error) {
    console.error("[AzamPay] Token generation error:", error);
    throw error;
  }
}

async function initiateMobileMoneyPayment({
  amount,
  currencyCode = "TZS",
  accountNumber,
  externalId,
  provider,
  additionalProperties = {},
}) {
  const accessToken = await getAccessToken();

  const payload = {
    accountNumber,
    amount: String(amount),
    currency: currencyCode,
    externalId,
    provider,
    ...(Object.keys(additionalProperties).length > 0 && { additionalProperties }),
  };

  try {
    console.log("[AzamPay] Initiating mobile money payment with payload:", JSON.stringify(payload, null, 2));
    
    const response = await fetch(`${AZAMPAY_CHECKOUT_URL}/azampay/mno/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-API-Key": AZAMPAY_CLIENT_ID,
      },
      body: JSON.stringify(payload),
    });

    console.log("[AzamPay] Response status:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[AzamPay] Error response:", JSON.stringify(errorData, null, 2));
      const errorMessage = errorData.message || errorData.error || response.statusText;
      throw new Error(`AzamPay payment initiation failed: ${errorMessage}`);
    }

    const data = await response.json();
    console.log("[AzamPay] Payment response:", JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error("[AzamPay] Mobile money payment error:", error);
    throw error;
  }
}

async function initiateBankPayment({
  amount,
  currencyCode = "TZS",
  accountNumber,
  externalId,
  provider,
  accountName,
  merchantMobileNumber,
  otp,
  additionalProperties = {},
}) {
  const accessToken = await getAccessToken();

  const payload = {
    amount: String(amount),
    currencyCode,
    merchantAccountNumber: accountNumber,
    merchantMobileNumber: merchantMobileNumber || accountNumber,
    merchantName: accountName || null,
    provider,
    referenceId: externalId,
    ...(otp && { otp }),
    ...additionalProperties,
  };

  try {
    const response = await fetch(`${AZAMPAY_CHECKOUT_URL}/azampay/bank/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-API-Key": AZAMPAY_CLIENT_ID,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || response.statusText;
      throw new Error(`AzamPay bank payment initiation failed: ${errorMessage}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[AzamPay] Bank payment error:", error);
    throw error;
  }
}

async function checkPaymentStatus(transactionId) {
  const accessToken = await getAccessToken();

  try {
    // Try different possible endpoints for status check
    const possibleEndpoints = [
      `${AZAMPAY_CHECKOUT_URL}/azampay/query/transaction/${transactionId}`,
      `${AZAMPAY_CHECKOUT_URL}/azampay/transaction/${transactionId}`,
      `${AZAMPAY_CHECKOUT_URL}/azampay/query/${transactionId}`,
      `${AZAMPAY_CHECKOUT_URL}/api/v1/transaction/${transactionId}`,
    ];

    let lastError = null;
    for (const endpoint of possibleEndpoints) {
      try {
        console.log("[AzamPay] Trying status check endpoint:", endpoint);
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "X-API-Key": AZAMPAY_CLIENT_ID,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("[AzamPay] Status check successful:", JSON.stringify(data, null, 2));
          return data;
        } else if (response.status !== 404) {
          // If it's not 404, this might be the right endpoint but with an error
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(`AzamPay payment status check failed: ${errorData.message || errorData.error || response.statusText}`);
          break; // Stop trying other endpoints if we get a non-404 error
        }
      } catch (err) {
        lastError = err;
        continue; // Try next endpoint
      }
    }

    // If all endpoints failed, return a response indicating we can't check status
    // but the payment might still be processing
    console.warn("[AzamPay] Could not find valid status check endpoint. Payment may still be processing.");
    return {
      status: "pending",
      message: "Status check endpoint not available. Payment may still be processing. Please check your phone for the payment prompt.",
      transactionId: transactionId,
    };
  } catch (error) {
    console.error("[AzamPay] Status check error:", error);
    // Don't throw - return a pending status instead
    return {
      status: "pending",
      message: "Unable to check payment status. Please check your phone for the payment prompt.",
      transactionId: transactionId,
    };
  }
}

export {
  getAccessToken,
  initiateMobileMoneyPayment,
  initiateBankPayment,
  checkPaymentStatus,
};




















