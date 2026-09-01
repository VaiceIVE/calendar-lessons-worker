import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export function createCalendarClient(opts: {
  clientEmail: string;
  privateKey: string;
}): calendar_v3.Calendar {
  const auth = new google.auth.JWT({
    email: opts.clientEmail,
    key: opts.privateKey,
    scopes: SCOPES,
  });
  return google.calendar({ version: "v3", auth });
}

export { SCOPES };
