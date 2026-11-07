import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Ask Sila Anything now runs on the Render backend + Neon PostgreSQL.
// Supabase realtime is optional and gracefully mocked if credentials are not configured.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        channel: () => ({
          on: () => ({ subscribe: () => ({}) }),
          subscribe: () => ({}),
          send: () => Promise.resolve(),
        }),
        removeChannel: () => {},
      };
