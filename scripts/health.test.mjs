import { resolveBaseUrl } from "./smoke-utils.mjs";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const main = async () => {
  const { baseUrl, stop } = await resolveBaseUrl();

  try {
    const response = await fetch(new URL("/api/health", baseUrl));
    assert(response.status === 200, `Health status ${response.status}`);
    const data = await response.json();
    assert(data.ok === true, "Health response missing ok:true");
    console.log("Health check ok", data);
  } finally {
    await stop();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
