import { resolveBaseUrl } from "./smoke-utils.mjs";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const hasBranding = (html) => {
  const gather = /gather/i.test(html);
  const logo = /<(img|meta)[^>]+(logo|gather)[^>]*>/i.test(html);
  return gather || logo;
};

const scanForInvalidDates = (html, route, warnings) => {
  const invalid = /(Invalid Date|NaN)/i.test(html);
  if (invalid) {
    warnings.push(`Expiration placeholder detected on ${route}`);
  }
};

const requestPath = async (baseUrl, path) => {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "manual",
  });
  return response;
};

const readBody = async (response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    return { html: await response.text(), isHtml: true };
  }
  return { html: await response.text(), isHtml: false };
};

const main = async () => {
  const warnings = [];
  const { baseUrl, stop } = await resolveBaseUrl();

  try {
    const landingResponse = await requestPath(baseUrl, "/");
    assert(landingResponse.status === 200, `Landing page status ${landingResponse.status}`);
    const landingBody = await readBody(landingResponse);
    assert(
      landingBody.isHtml && hasBranding(landingBody.html),
      "Landing page branding marker missing"
    );
    if (landingBody.isHtml) scanForInvalidDates(landingBody.html, "/", warnings);

    const healthResponse = await requestPath(baseUrl, "/api/health");
    assert(healthResponse.status === 200, `Health status ${healthResponse.status}`);
    const healthJson = await healthResponse.json();
    assert(healthJson.ok === true, "Health response missing ok:true");

    const candidateRoutes = [
      "/login",
      "/join",
      "/coming-soon",
      "/infos/investisseur-v2",
      "/infos/investissement-fonctionnement",
    ];

    let keyRoute = null;
    for (const route of candidateRoutes) {
      const response = await requestPath(baseUrl, route);
      if (response.status === 200) {
        const body = await readBody(response);
        if (body.isHtml) scanForInvalidDates(body.html, route, warnings);
        keyRoute = route;
        break;
      }
    }

    assert(keyRoute, "No key route returned HTTP 200");

    console.log("Smoke test routes:", {
      landing: "/",
      health: "/api/health",
      key: keyRoute,
    });

    if (warnings.length > 0) {
      console.warn("Warnings:\n" + warnings.map((warning) => `- ${warning}`).join("\n"));
    }
  } finally {
    await stop();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
