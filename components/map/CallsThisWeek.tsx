import { useEffect, useState } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { Calendar, LogIn, MapPin, Users } from "lucide-react";
import { calendarScopes } from "@/lib/msal";

type GraphEvent = {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName?: string };
  attendees?: { emailAddress?: { address?: string; name?: string } }[];
  webLink?: string;
};

function startOfWeekMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function CallsThisWeek() {
  const { instance, accounts } = useMsal();
  const isAuthed = useIsAuthenticated();
  const [events, setEvents] = useState<GraphEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"today" | "week">("week");

  function isToday(d: Date) {
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  async function signOut() {
    try {
      await instance.logoutPopup();
      setEvents(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function signIn() {
    setError(null);
    try {
      await instance.loginPopup({ scopes: calendarScopes });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function fetchEvents() {
    if (!accounts[0]) return;
    setLoading(true);
    setError(null);
    try {
      let token: string;
      try {
        const res = await instance.acquireTokenSilent({
          scopes: calendarScopes,
          account: accounts[0],
        });
        token = res.accessToken;
      } catch (e) {
        if (e instanceof InteractionRequiredAuthError) {
          const res = await instance.acquireTokenPopup({ scopes: calendarScopes });
          token = res.accessToken;
        } else {
          throw e;
        }
      }

      const start = startOfWeekMonday(new Date());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const url =
        `https://graph.microsoft.com/v1.0/me/calendarView` +
        `?startDateTime=${start.toISOString()}` +
        `&endDateTime=${end.toISOString()}` +
        `&$orderby=start/dateTime` +
        `&$top=50` +
        `&$select=id,subject,start,end,location,attendees,webLink`;

      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Prefer: 'outlook.timezone="America/Toronto"',
        },
      });
      if (!resp.ok) throw new Error(`Graph ${resp.status}: ${await resp.text()}`);
      const data = await resp.json();
      setEvents(data.value ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthed) fetchEvents();
  }, [isAuthed]);

  if (!isAuthed) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Calendar className="h-4 w-4" /> Calls This Week
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Connect your Outlook calendar to see this week's scheduled calls.
        </p>
        <button
          onClick={signIn}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[#2E55B5] px-3 py-2 text-sm font-medium text-white hover:bg-[#1F3D85]"
        >
          <LogIn className="h-4 w-4" /> Sign in with Microsoft
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Calendar className="h-4 w-4" /> Calls
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvents}
            className="text-xs text-[#2E55B5] hover:underline"
          >
            {loading ? "..." : "Refresh"}
          </button>
          <button
            onClick={signOut}
            className="text-xs text-slate-400 hover:text-slate-600"
            title="Sign out of Microsoft"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="mb-3 flex gap-1 rounded-md bg-slate-100 p-0.5">
        <button
          onClick={() => setFilter("today")}
          className={`flex-1 rounded px-2 py-1 text-xs font-medium transition ${
            filter === "today" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setFilter("week")}
          className={`flex-1 rounded px-2 py-1 text-xs font-medium transition ${
            filter === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          This Week
        </button>
      </div>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      {(() => {
        const filtered = (events ?? []).filter((ev) =>
          filter === "today" ? isToday(new Date(ev.start.dateTime)) : true
        );
        if (filtered.length === 0) {
          return (
            <p className="text-xs text-slate-500">
              {loading
                ? "Loading..."
                : filter === "today"
                ? "No events today."
                : "No events this week."}
            </p>
          );
        }
        return (
        <ul className="space-y-2">
          {filtered.map((ev) => {
            const start = new Date(ev.start.dateTime);
            return (
              <li
                key={ev.id}
                className="rounded border border-slate-100 bg-slate-50 p-2 text-xs"
              >
                <a
                  href={ev.webLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-800 hover:text-[#2E55B5]"
                >
                  {ev.subject || "(no subject)"}
                </a>
                <div className="mt-1 text-slate-500">
                  {start.toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                {ev.location?.displayName && (
                  <div className="mt-1 flex items-center gap-1 text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {ev.location.displayName}
                  </div>
                )}
                {ev.attendees && ev.attendees.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-slate-500">
                    <Users className="h-3 w-3" />
                    {ev.attendees
                      .map((a) => a.emailAddress?.name || a.emailAddress?.address)
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(", ")}
                    {ev.attendees.length > 3 && ` +${ev.attendees.length - 3}`}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        );
      })()}
    </div>
  );
}
