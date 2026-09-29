// Node-only start-up work lives in instrumentation-node.ts; this guard keeps it out of the Edge bundle.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}
