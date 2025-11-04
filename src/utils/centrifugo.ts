declare const fetch: any;

import type { Core } from "@strapi/strapi";
import jwt, { type SignOptions, type Secret } from "jsonwebtoken";

type CentrifugoConfig = {
  httpUrl: string;
  wsUrl: string;
  apiKey?: string;
  tokenHmacSecretKey?: string;
  channelTokenHmacSecretKey?: string;
  proxySharedSecret?: string;
  chatNamespace: string;
};

const sanitizeBaseUrl = (url: string) => url.replace(/\/$/, "");

export const getCentrifugoConfig = (strapi: Core.Strapi): CentrifugoConfig => {
  const config = strapi.config.get("custom.centrifugo") as CentrifugoConfig;
  if (!config) {
    throw new Error("Centrifugo configuration is missing. Check config/custom.ts");
  }
  return config;
};

export const getChatChannel = (chatId: number | string, strapi: Core.Strapi) => {
  const { chatNamespace } = getCentrifugoConfig(strapi);
  return `${chatNamespace}:chat:${chatId}`;
};

export const generateClientToken = (
  strapi: Core.Strapi,
  payload: Record<string, unknown>,
  expiresIn: SignOptions["expiresIn"] = "12h"
) => {
  const { tokenHmacSecretKey } = getCentrifugoConfig(strapi);
  if (!tokenHmacSecretKey) {
    throw new Error("CENTRIFUGO_TOKEN_HMAC_SECRET_KEY is not configured");
  }
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, tokenHmacSecretKey as Secret, options);
};

export const generateChannelToken = (
  strapi: Core.Strapi,
  payload: Record<string, unknown>,
  expiresIn: SignOptions["expiresIn"] = "12h"
) => {
  const { channelTokenHmacSecretKey } = getCentrifugoConfig(strapi);
  if (!channelTokenHmacSecretKey) {
    throw new Error(
      "CENTRIFUGO_CHANNEL_TOKEN_HMAC_SECRET_KEY is not configured"
    );
  }
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, channelTokenHmacSecretKey as Secret, options);
};

export const publishToCentrifugo = async (
  strapi: Core.Strapi,
  channel: string,
  data: Record<string, unknown>
) => {
  const { httpUrl, apiKey } = getCentrifugoConfig(strapi);

  strapi.log.info(
    `Centrifugo publish config check: httpUrl=${httpUrl}, apiKey=${apiKey}`
  );

  if (!apiKey) {
    strapi.log.warn("Centrifugo API key is not configured; skipping publish");
    return;
  }

  const baseUrl = sanitizeBaseUrl(httpUrl);
  try {
    const response = await fetch(`${baseUrl}/api/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `apikey ${apiKey}`,
      },
      body: JSON.stringify({ channel, data }),
    });

    if (!response.ok) {
      const body = await response.text();
      strapi.log.error(
        `Centrifugo publish failed: ${response.status} ${response.statusText} - ${body}`
      );
    }
  } catch (error) {
    strapi.log.error("Centrifugo publish error", error);
  }
};

export const fetchCentrifugoPresence = async (
  strapi: Core.Strapi,
  channel: string
) => {
  const { httpUrl, apiKey } = getCentrifugoConfig(strapi);

  if (!apiKey) {
    strapi.log.warn("Centrifugo API key is not configured; cannot fetch presence");
    return null;
  }

  const baseUrl = sanitizeBaseUrl(httpUrl);

  try {
    const response = await fetch(`${baseUrl}/api/presence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `apikey ${apiKey}`,
      },
      body: JSON.stringify({ channel }),
    });

    if (!response.ok) {
      const body = await response.text();
      strapi.log.error(
        `Centrifugo presence fetch failed: ${response.status} ${response.statusText} - ${body}`
      );
      return null;
    }

    const payload = await response.json();
    return payload?.result?.presence ?? null;
  } catch (error) {
    strapi.log.error("Centrifugo presence fetch error", error);
    return null;
  }
};
