# `@proxy-up/proxy`

Run Plano's LLM gateway in native mode from TypeScript without depending on the Python wrapper.

The package does three things:

- normalizes provider config into the rendered Plano config that `brightstaff` expects
- downloads and caches Plano release artifacts plus Envoy
- starts `brightstaff` and Envoy as local processes and waits until the gateway is ready

The integration test at [tests/integration.test.ts](/Users/akrc/Developer/proxy-up/packages/proxy/tests/integration.test.ts) is the best executable documentation for the end-to-end flow.
