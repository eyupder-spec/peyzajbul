/// <reference lib="deno.ns" />

/**
 * Retired: answers 410 Gone and does nothing else.
 *
 * The confirmation mail to the homeowner is no longer sent from the browser. finalize_verified_lead queues it
 * when the lead's code is verified and dispatch-lead-notifications sends it (channel 'homeowner_confirm'), to
 * the address the code was sent to. Nothing in the app or in the other functions calls this one any more, so it
 * reads no lead, uses no Resend key and mails nobody. The stub stays so that a stale client gets a clear
 * answer instead of a missing-function error; delete the directory (and undeploy the function) when convenient.
 */

import { HttpError } from "../_shared/auth.ts";
import { serveSecure } from "../_shared/http.ts";

serveSecure(() => {
  throw new HttpError(410, "Bu işlev kullanımdan kaldırıldı. Talep onay e-postası doğrulamadan sonra otomatik gönderilir.");
});
