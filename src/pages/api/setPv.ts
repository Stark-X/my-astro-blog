import type { APIRoute } from "astro";
import { createClient } from "@vercel/kv";

const KV_REST_API_URL = import.meta.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = import.meta.env.KV_REST_API_TOKEN;

export const get: APIRoute = async ctx => {
  try {
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      throw new Error("missing env");
    }
    const v = ctx.url.searchParams.get("v") || "404";
    const client = createClient({
      url: KV_REST_API_URL,
      token: KV_REST_API_TOKEN,
    });

    const number = await client.incr(`PV_${v}`);
    return {
      body: JSON.stringify({
        state: "ok",
        message: number,
      }),
    };
  } catch (error) {
    return {
      body: JSON.stringify({
        state: "fail",
        message: error,
      }),
    };
  }
};
