"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type TimelineEvent = {
  id: number;
  creator?: string | null;
  date: string;
  time?: string | null;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  youtubeUrl?: string | null;
  important: boolean;
  pinned: boolean;
  category: string;
  activityType?: string | null;
};

type EventRow = {
  id: number;
  creator?: string | null;
  date: string;
  time?: string | null;
  title: string;
  description?: string | null;
  image_url?: string | null;
  image_key?: string | null;
  youtube_url?: string | null;
  important?: boolean | null;
  pinned?: boolean | null;
  category?: string | null;
  activity_type?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const MEMBER_COLORS: Record<string, string> = {
  솜주먹: "#ff77bd",
  띵귤: "#ffd85a",
  연초록: "#a8ff9b",
  챈나: "#7979ff",
  키마: "#c18bff",
};

const SOOP_MEMBERS = [
  { name: "솜주먹", id: "ldrboo", url: "https://www.sooplive.com/station/ldrboo" },
  { name: "띵귤", id: "singgyul", url: "https://www.sooplive.com/station/singgyul" },
  { name: "연초록", id: "whatcherry4", url: "https://www.sooplive.com/station/whatcherry4" },
  { name: "챈나", id: "chaenna02", url: "https://www.sooplive.com/station/chaenna02" },
  { name: "키마", id: "kymakyma", url: "https://www.sooplive.com/station/kymakyma" },
] as const;

type SoopStatus = { id: string; live: boolean | null; title?: string; checkedAt?: string };

const DEFAULT_CATEGORIES = ["개인", "단체", "수상", "데뷔", "음원", "콘텐츠", "방송", "기타"];
const MONTH_NAMES = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toEvent(row: EventRow): TimelineEvent {
  return {
    id: Number(row.id),
    creator: row.creator ?? null,
    date: row.date,
    time: row.time ?? "",
    title: row.title ?? "제목 없는 기록",
    description: row.description ?? "",
    imageUrl: row.image_url ?? null,
    imageKey: row.image_key ?? null,
    youtubeUrl: row.youtube_url ?? null,
    important: Boolean(row.important),
    pinned: Boolean(row.pinned),
    category: row.category ?? "기타",
    activityType: row.activity_type ?? "",
  };
}

function toRow(event: Partial<TimelineEvent>) {
  return {
    date: event.date,
    time: event.time || null,
    title: event.title,
    description: event.description || null,
    image_url: event.imageUrl || null,
    image_key: event.imageKey || null,
    youtube_url: event.youtubeUrl || null,
    important: Boolean(event.important),
    pinned: Boolean(event.pinned),
    category: event.category || "기타",
    activity_type: event.activityType || null,
  };
}

function youtubeId(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1).split("/")[0];
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      const parts = parsed.pathname.split("/").filter(Boolean);
      const index = parts.findIndex((part) => ["embed", "shorts", "live"].includes(part));
      return index >= 0 ? parts[index + 1] : null;
    }
  } catch {
    return null;
  }
  return null;
}

function formatDate(date: string) {
  if (!date) return "날짜 미정";
  const [year, month, day] = date.split("-").map(Number);
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

function getMember(event: TimelineEvent) {
  const text = `${event.title} ${event.description ?? ""} ${event.activityType ?? ""}`;
  return Object.keys(MEMBER_COLORS).find((name) => text.includes(name)) ?? "HADES";
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="stat-box">
      <span className="stat-label">{label}</span>
      <strong style={accent ? { color: accent } : undefined}>{value}</strong>
    </div>
  );
}

export default function Page() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [soopStatuses, setSoopStatuses] = useState<Record<string, SoopStatus>>({});
  const [soopCheckedAt, setSoopCheckedAt] = useState<string | null>(null);
  const [soopLoading, setSoopLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [memberFilter, setMemberFilter] = useState("전체");
  const [sortOrder, setSortOrder] = useState("latest");
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarDate, setCalendarDate] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: "",
    title: "",
    description: "",
    imageUrl: "",
    youtubeUrl: "",
    category: "개인",
    activityType: "",
    important: false,
    pinned: false,
  });

  const loadEvents = useCallback(async () => {
    if (!supabase) {
      setDbError("Supabase 환경변수가 설정되지 않았어요. .env.local의 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해 주세요.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setDbError("");
    const { data, error } = await supabase.from("timeline").select("*").order("date", { ascending: false }).order("time", { ascending: false });
    if (error) {
      setDbError(`기록을 불러오지 못했어요: ${error.message}`);
      setEvents([]);
    } else {
      setEvents(((data ?? []) as EventRow[]).map(toEvent));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadEvents();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
      setAdminMode(Boolean(data.session));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
      setAdminMode(Boolean(session));
    });
    return () => listener.subscription.unsubscribe();
  }, [loadEvents]);

  // 페이지를 충분히 내렸을 때 오른쪽 아래에 맨 위로 가기 버튼을 표시합니다.
  useEffect(() => {
    const updateScrollButton = () => setShowScrollTop(window.scrollY > 320);
    updateScrollButton();
    window.addEventListener("scroll", updateScrollButton, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollButton);
  }, []);

  // 서버 API를 통해 SOOP 방송 상태를 확인하고 60초마다 자동 갱신합니다.
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch("/api/soop-status", { cache: "no-store" });
        if (!response.ok) throw new Error(`SOOP 상태 조회 실패 (${response.status})`);
        const result = await response.json() as { statuses?: SoopStatus[]; checkedAt?: string };
        if (!cancelled && Array.isArray(result.statuses)) {
          const next: Record<string, SoopStatus> = {};
          result.statuses.forEach((status) => { next[status.id] = status; });
          setSoopStatuses(next);
          setSoopCheckedAt(result.checkedAt ?? new Date().toISOString());
        }
      } catch (error) {
        console.error("SOOP 방송 상태 조회 오류:", error);
      } finally {
        if (!cancelled) setSoopLoading(false);
        inFlight = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const categories = useMemo(() => {
    const existing = events.map((event) => event.category).filter(Boolean);
    return ["전체", ...Array.from(new Set([...DEFAULT_CATEGORIES, ...existing]))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = events.filter((event) => {
      const matchesQuery = !normalized || `${event.title} ${event.description ?? ""} ${event.category} ${event.activityType ?? ""}`.toLowerCase().includes(normalized);
      const matchesCategory = categoryFilter === "전체" || event.category === categoryFilter;
      const matchesMember = memberFilter === "전체" || getMember(event) === memberFilter;
      const matchesDate = !selectedDate || event.date === selectedDate;
      const matchesPinned = !showPinnedOnly || event.pinned;
      return matchesQuery && matchesCategory && matchesMember && matchesDate && matchesPinned;
    });
    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortOrder === "oldest") return a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "");
      if (sortOrder === "title") return a.title.localeCompare(b.title, "ko");
      return b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? "");
    });
  }, [events, query, categoryFilter, memberFilter, selectedDate, showPinnedOnly, sortOrder]);

  const currentMonthKey = getMonthKey(calendarDate);
  const monthEvents = useMemo(() => events.filter((event) => event.date.startsWith(currentMonthKey)), [events, currentMonthKey]);
  const calendarCells = useMemo(() => {
    const first = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const offset = first.getDay();
    const days = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      if (day < 1 || day > days) return null;
      return `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    });
  }, [calendarDate]);

  const totalMembers = Object.keys(MEMBER_COLORS).map((name) => ({
    name,
    count: events.filter((event) => getMember(event) === name).length,
    color: MEMBER_COLORS[name],
  }));
  const yearStart = new Date("2025-09-05T00:00:00");
  const daysActive = Math.max(0, Math.floor((Date.now() - yearStart.getTime()) / 86400000));
  const birthdayDate = new Date(2026, 10, 11);
  const todayLocal = new Date();
  todayLocal.setHours(0, 0, 0, 0);
  const birthdayDaysLeft = Math.ceil((birthdayDate.getTime() - todayLocal.getTime()) / 86400000);
  const resetFilters = () => {
    setQuery(""); setCategoryFilter("전체"); setMemberFilter("전체"); setSelectedDate(""); setShowPinnedOnly(false);
  };
  const openNew = () => {
    setEditingId(null); setPhotoFile(null);
    setForm({ date: selectedDate || new Date().toISOString().slice(0, 10), time: "", title: "", description: "", imageUrl: "", youtubeUrl: "", category: "개인", activityType: "", important: false, pinned: false });
    setEditorOpen(true);
  };
  const openEdit = (event: TimelineEvent) => {
    setEditingId(event.id); setPhotoFile(null);
    setForm({ date: event.date, time: event.time ?? "", title: event.title, description: event.description ?? "", imageUrl: event.imageUrl ?? "", youtubeUrl: event.youtubeUrl ?? "", category: event.category || "기타", activityType: event.activityType ?? "", important: event.important, pinned: event.pinned });
    setEditorOpen(true);
  };

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoginError("");
    if (!supabase) { setLoginError("Supabase 설정을 먼저 확인해 주세요."); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError(error.message);
    else { setLoginOpen(false); setLoginPassword(""); }
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setAdminMode(false); setSessionEmail(null);
  }

  async function saveEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) { setDbError("Supabase 설정을 확인해 주세요."); return; }
    if (!sessionEmail) { setLoginError("관리자 로그인이 필요해요."); setLoginOpen(true); return; }
    setSaving(true); setDbError("");
    try {
      let imageUrl = form.imageUrl.trim() || null;
      let imageKey: string | null = null;
      if (photoFile) {
        const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("timeline-images").upload(path, photoFile, { upsert: false, contentType: photoFile.type });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from("timeline-images").getPublicUrl(path);
        imageUrl = publicData.publicUrl; imageKey = path;
      }
      const payload = toRow({ ...form, imageUrl, imageKey });
      if (editingId !== null) {
        const updatePayload = { ...payload };
        if (!photoFile) { delete (updatePayload as Record<string, unknown>).image_key; }
        const { data: updatedRows, error } = await supabase
          .from("timeline")
          .update(updatePayload)
          .eq("id", editingId)
          .select("id");
        if (error) throw error;
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error("수정된 기록이 없습니다. 관리자 계정의 UPDATE 권한(RLS 정책) 또는 기록 ID를 확인해 주세요.");
        }
      } else {
        const { error } = await supabase.from("timeline").insert(payload);
        if (error) throw error;
      }
      setEditorOpen(false); setPhotoFile(null); await loadEvents();
    } catch (error) {
      console.error("타임라인 저장 오류 상세:", error);
      let errorMessage = "알 수 없는 오류";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = String((error as { message?: unknown }).message ?? "알 수 없는 오류");
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        try { errorMessage = JSON.stringify(error) || "알 수 없는 오류"; } catch { /* keep fallback */ }
      }
      setDbError(`저장에 실패했어요: ${errorMessage}`);
    } finally { setSaving(false); }
  }

  async function deleteEvent(event: TimelineEvent) {
    if (!supabase || !sessionEmail) { setLoginOpen(true); return; }
    if (!window.confirm(`'${event.title}' 기록을 삭제할까요?`)) return;
    const { error } = await supabase.from("timeline").delete().eq("id", event.id);
    if (error) setDbError(`삭제에 실패했어요: ${error.message}`);
    else {
      if (event.imageKey) await supabase.storage.from("timeline-images").remove([event.imageKey]);
      await loadEvents();
    }
  }

  async function toggleFlag(event: TimelineEvent, flag: "pinned" | "important") {
    if (!supabase || !sessionEmail) { setLoginOpen(true); return; }
    const { error } = await supabase.from("timeline").update({ [flag]: !event[flag] }).eq("id", event.id);
    if (error) setDbError(`변경에 실패했어요: ${error.message}`);
    else setEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, [flag]: !item[flag] } : item));
  }

  return (
    <main className="hades-shell">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Gowun+Dodum&family=Orbitron:wght@400;500;600;700;800&display=swap');
        :root{color-scheme:dark}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#080711;color:#f5f2ff;font-family:'Gowun Dodum',sans-serif}button,input,textarea,select{font:inherit}button{cursor:pointer}.hades-shell{min-height:100vh;position:relative;overflow:hidden;background:radial-gradient(ellipse at 70% -10%,rgba(107,49,180,.34),transparent 44%),radial-gradient(ellipse at 8% 42%,rgba(71,47,144,.16),transparent 38%),#080711}.hades-shell:before{content:'';position:fixed;inset:0;pointer-events:none;opacity:.16;background-image:linear-gradient(rgba(180,150,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(180,150,255,.08) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(to bottom,black,transparent 88%)}.topbar{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:22px;padding:22px clamp(18px,3vw,48px);border-bottom:1px solid rgba(182,148,255,.17);background:rgba(8,7,17,.72);backdrop-filter:blur(16px)}.brand{display:flex;align-items:center;gap:14px;min-width:220px}.brand-home-button{display:flex;align-items:center;gap:14px;min-width:0;padding:0;border:0;background:transparent;color:inherit;text-align:left}.brand-home-button:hover .brand-mark{border-color:#d0bfff;box-shadow:0 0 30px #9a70ff55,inset 0 0 18px #794bff35}.brand-home-button:focus-visible{outline:2px solid #bba3ff;outline-offset:5px;border-radius:8px}.brand-mark{width:45px;height:45px;display:grid;place-items:center;border:1px solid #9874ff;border-radius:14px;color:#d8c8ff;font:800 18px Orbitron,sans-serif;box-shadow:0 0 25px #794bff36,inset 0 0 18px #794bff20;transform:rotate(-4deg)}.brand-name{font:800 20px Orbitron,sans-serif;letter-spacing:.13em}.brand-sub{margin-top:5px;font-size:10px;letter-spacing:.28em;color:#a59abf}.top-nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:#d5c9ec;font-size:13px;letter-spacing:0}.top-nav a{display:inline-flex;align-items:center;gap:7px;padding:10px 12px;border:1px solid #493663;border-radius:10px;background:#171122;color:#e6dcf8;text-decoration:none;white-space:nowrap;transition:.2s}.top-nav a:hover{border-color:#a58aff;background:#28203a;color:#fff;box-shadow:0 0 18px #8d65ff20}.top-nav a.pv-link{border-color:#8c5caa;background:linear-gradient(135deg,#38214b,#21152e);color:#f0d9ff}.top-actions{display:flex;align-items:center;gap:9px}.ghost-btn,.primary-btn,.tiny-btn{border:1px solid #41335f;background:#151122;color:#e9e0ff;border-radius:10px;padding:10px 13px;font-size:12px;transition:.2s}.ghost-btn:hover,.tiny-btn:hover{border-color:#a18aff;background:#211934}.primary-btn{background:linear-gradient(135deg,#8b5cff,#5d39b8);border-color:#9b7aff;box-shadow:0 7px 22px #6b3de42e}.primary-btn:hover{filter:brightness(1.12)}.hero{position:relative;padding:32px clamp(18px,3vw,48px) 24px;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,.8fr);gap:28px;align-items:end}.hero:after{content:'';position:absolute;right:6%;top:4px;width:32%;height:170px;pointer-events:none;background:linear-gradient(115deg,transparent 10%,#9b74ff0c 32%,#a37bff19 49%,transparent 68%);filter:blur(12px);transform:skewX(-20deg)}.eyebrow{color:#bca7ff;letter-spacing:.28em;text-transform:uppercase;font:600 10px Orbitron,sans-serif}.hero h1{margin:12px 0 8px;font:800 clamp(27px,4vw,52px) Orbitron,sans-serif;letter-spacing:.035em;line-height:1.08;text-shadow:0 0 32px #9266ff40}.hero h1 em{font-style:normal;color:#b59aff}.hero-copy{margin:0;color:#a9a1bf;font-size:13px;line-height:1.8}.hero-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.stat-box{min-width:0;padding:17px 15px;border:1px solid #33264b;border-radius:15px;background:linear-gradient(145deg,#171226d9,#0e0b18d9);box-shadow:inset 0 1px #ffffff08}.stat-label{display:block;color:#968baF;font-size:10px;letter-spacing:.1em;margin-bottom:10px}.stat-box strong{font:700 clamp(19px,2.2vw,28px) Orbitron,sans-serif;color:#f4edff}.workspace{position:relative;z-index:1;display:grid;grid-template-columns:290px minmax(0,1fr);gap:20px;padding:0 clamp(18px,3vw,48px) 42px}.sidebar{min-width:0;display:flex;flex-direction:column;gap:14px}.panel{border:1px solid rgba(157,126,218,.22);border-radius:16px;background:linear-gradient(155deg,rgba(24,18,39,.94),rgba(13,11,23,.94));box-shadow:0 12px 35px #00000018}.panel-inner{padding:17px}.panel-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 15px;font-size:12px;font-weight:700;letter-spacing:.12em;color:#e5dcff}.panel-title small{color:#8d80aa;font-size:10px;font-weight:400;letter-spacing:0}.calendar-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.calendar-month{font:700 15px Orbitron,sans-serif;letter-spacing:.02em}.arrow-btn{width:27px;height:27px;border:1px solid #45345f;border-radius:8px;background:#191328;color:#d7c9ff}.weekdays,.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}.weekdays{margin-bottom:7px;color:#817797;font-size:10px}.day-btn{position:relative;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;padding:0;border:1px solid transparent;border-radius:8px;background:transparent;color:#c7bfd9;font-size:11px}.day-btn:hover{background:#28203c}.day-btn.selected{background:#7450c7;border-color:#b5a0ff;color:#fff;box-shadow:0 0 18px #8d65ff45}.day-btn.today:not(.selected){border-color:#8063bd}.day-dots{display:flex;gap:2px;height:3px;justify-content:center}.day-dot{width:3px;height:3px;border-radius:50%}.calendar-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;color:#817796;font-size:10px}.text-btn{border:0;background:none;color:#c2aaff;font-size:10px;padding:0}.search-wrap{position:relative}.search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9d8bbd;font-size:15px}.search-input,.select-input,.form-input,.form-textarea{width:100%;border:1px solid #3a2e52;background:#0c0a15;color:#f1eaff;border-radius:10px;padding:11px 12px;outline:none;font-size:12px}.search-input{padding-left:34px}.search-input:focus,.select-input:focus,.form-input:focus,.form-textarea:focus{border-color:#9874ff;box-shadow:0 0 0 3px #8d65ff20}.filter-list{display:flex;flex-direction:column;gap:4px}.filter-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:9px 10px;border:1px solid transparent;border-radius:9px;background:transparent;color:#b9b0ce;text-align:left;font-size:12px}.filter-btn:hover{background:#211a31}.filter-btn.active{border-color:#5c4389;background:linear-gradient(90deg,#382657,#20182f);color:#f5eeff}.filter-count{color:#8f83a8;font:11px Orbitron,sans-serif}.member-list{display:flex;flex-direction:column;gap:9px}.member-row{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:5px 0;border:0;background:none;color:#c7bfd9;font-size:12px;text-align:left}.member-name{display:flex;align-items:center;gap:9px}.member-dot{width:8px;height:8px;border-radius:50%;box-shadow:0 0 11px currentColor}.member-row.active .member-name{color:#fff}.member-count{font:11px Orbitron,sans-serif;color:#8e83a6}.main-content{min-width:0}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:15px 17px;margin-bottom:15px}.toolbar-left{display:flex;align-items:center;gap:12px;min-width:0}.toolbar-title{font-size:14px;font-weight:700;color:#f0eaff}.toolbar-sub{margin-top:4px;font-size:10px;color:#8f84a5}.filter-chips{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.chip{padding:7px 10px;border:1px solid #3b2f52;border-radius:999px;background:#120f1d;color:#a99fbe;font-size:10px;white-space:nowrap}.chip.active{background:#382557;border-color:#8564c6;color:#f1e7ff}.toolbar-right{display:flex;align-items:center;gap:8px}.select-input{width:auto;min-width:108px;padding:9px 10px}.pinned-toggle{display:flex;align-items:center;gap:7px;color:#b6accb;font-size:11px;white-space:nowrap}.pinned-toggle input{accent-color:#a17aff}.result-line{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 2px 13px}.result-line h2{margin:0;font-size:15px;font-weight:700}.result-line p{margin:5px 0 0;color:#8e84a4;font-size:11px}.result-count{font:600 11px Orbitron,sans-serif;color:#bba6ff}.cards-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.event-card{min-width:0;overflow:hidden;border:1px solid rgba(156,126,216,.22);border-radius:15px;background:linear-gradient(160deg,#171225,#0f0c19);transition:transform .22s,border-color .22s,box-shadow .22s}.event-card:hover{transform:translateY(-3px);border-color:#7658ac;box-shadow:0 14px 30px #00000035}.card-media{position:relative;aspect-ratio:16/9;overflow:hidden;background:radial-gradient(ellipse at 50% 20%,#45306b,#171024 70%);border-bottom:1px solid #322542}.card-media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s}.event-card:hover .card-media img{transform:scale(1.035)}.media-placeholder{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#9b86c6;background:radial-gradient(ellipse at center,#33234f 0%,#151020 65%)}.placeholder-mark{font:800 23px Orbitron,sans-serif;letter-spacing:.16em;text-shadow:0 0 22px #9c70ff70}.placeholder-caption{font:10px Orbitron,sans-serif;letter-spacing:.24em;color:#796a99}.video-frame{width:100%;height:100%;border:0;display:block}.card-top-tags{position:absolute;left:10px;top:10px;display:flex;gap:5px;flex-wrap:wrap}.tag{padding:5px 7px;border:1px solid #ffffff22;border-radius:6px;background:#090711d9;color:#e8dfff;font-size:9px;backdrop-filter:blur(8px)}.tag.important{background:#4b2d1bdb;border-color:#c98749;color:#ffd39e}.tag.pinned{background:#39265ddf;border-color:#9270d9;color:#e4d6ff}.card-date{position:absolute;right:10px;bottom:10px;padding:8px 11px;border:1px solid #c6adff99;border-radius:8px;background:#090711f2;color:#fff;font:700 13px Orbitron,sans-serif;letter-spacing:.04em;box-shadow:0 3px 15px #0009,0 0 14px #9b74ff22;backdrop-filter:blur(8px)}.card-body{padding:14px}.card-meta{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-bottom:9px}.category-tag{color:#bda7ff;font-size:10px}.member-tag{display:flex;align-items:center;gap:5px;color:#b9afca;font-size:10px}.member-tag i{width:6px;height:6px;border-radius:50%;display:inline-block}.card-title{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:42px;margin:0;color:#f4efff;font-size:15px;line-height:1.45;font-weight:700;word-break:keep-all}.card-description{display:block;overflow:visible;min-height:0;height:auto;max-height:none;margin:10px 0 15px;color:#c0b6d0;font-size:13px;line-height:1.85;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}.card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px solid #2b223b}.card-footer-left{display:flex;gap:6px;flex-wrap:wrap}.mini-link{border:0;background:none;color:#c1aaff;padding:0;font-size:10px;text-decoration:none}.card-admin{display:flex;gap:5px}.tiny-btn{padding:5px 7px;border-radius:6px;font-size:10px}.empty-state{grid-column:1/-1;padding:60px 20px;text-align:center;border:1px dashed #49365e;border-radius:16px;background:#100d1a}.empty-symbol{font:700 30px Orbitron,sans-serif;color:#7e61b5}.empty-state h3{margin:12px 0 7px;font-size:15px}.empty-state p{margin:0;color:#8f84a4;font-size:12px}.notice{padding:11px 13px;margin-bottom:14px;border:1px solid #744b58;border-radius:10px;background:#29131b;color:#ffc5d1;font-size:12px;line-height:1.6;overflow-wrap:anywhere}.loading-state{grid-column:1/-1;padding:50px;text-align:center;color:#b9a6e8}.footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:24px;padding:18px 4px;color:#726783;font:10px Orbitron,sans-serif;letter-spacing:.12em}.footer strong{color:#a895ce;font-weight:600}.modal-backdrop{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:18px;background:#05040bd9;backdrop-filter:blur(10px)}.modal{width:min(620px,100%);max-height:92vh;overflow:auto;border:1px solid #5c477f;border-radius:18px;background:#110d1c;box-shadow:0 25px 90px #0009}.modal-head{position:sticky;top:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid #342647;background:#110d1c}.modal-head h2{margin:0;font-size:15px}.close-btn{width:30px;height:30px;border:1px solid #443356;border-radius:8px;background:#20172d;color:#e7dcff;font-size:18px}.modal-form{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:20px}.field{display:flex;flex-direction:column;gap:7px;min-width:0}.field.full{grid-column:1/-1}.field label{color:#bcb0d1;font-size:11px}.form-textarea{min-height:110px;resize:vertical;line-height:1.65}.form-checks{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.form-checks label{display:flex;align-items:center;gap:7px}.form-checks input{accent-color:#9c7aff}.modal-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;padding-top:7px}.login-modal{width:min(400px,100%);padding:22px}.login-modal h2{margin:0 0 8px}.login-modal p{margin:0 0 18px;color:#a69bb9;font-size:12px;line-height:1.6}.login-fields{display:flex;flex-direction:column;gap:12px}.login-fields label{display:flex;flex-direction:column;gap:7px;color:#c8bddb;font-size:11px}.login-error{color:#ff9cae;font-size:11px}.small-note{color:#7f7494;font-size:10px;line-height:1.6;margin-top:12px}.mobile-filter-btn{display:none}.mobile-only{display:none}.scroll-top-button{position:fixed;right:24px;bottom:24px;z-index:15;width:48px;height:48px;display:grid;place-items:center;border:1px solid #9a7cff;border-radius:15px;background:linear-gradient(145deg,#33214fef,#171126f5);color:#f4edff;font-size:25px;font-weight:700;box-shadow:0 8px 28px #0008,0 0 22px #8d65ff35;backdrop-filter:blur(10px);transition:transform .2s,opacity .2s,box-shadow .2s}.scroll-top-button:hover{transform:translateY(-3px);box-shadow:0 10px 32px #0009,0 0 28px #8d65ff65}.scroll-top-button:focus-visible{outline:2px solid #d2c3ff;outline-offset:3px}
        /* 가독성 개선: 한국어 본문은 선명한 산세리프, 작은 보조 문구도 충분한 크기로 */
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');
        html,body,.hades-shell{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;letter-spacing:0;}
        .brand-sub{font-size:11px;letter-spacing:.12em}.top-nav{font-size:13px}.eyebrow{font-size:11px;letter-spacing:.16em}.hero-copy{font-size:15px;line-height:1.9;color:#c2b9d5}.stat-label{font-size:12px;letter-spacing:.04em;color:#b7accd}.stat-box strong{font-size:clamp(22px,2.4vw,31px)}
        .panel-title{font-size:14px;letter-spacing:.04em}.panel-title small{font-size:12px}.weekdays{font-size:12px;color:#a89dbd}.day-btn{font-size:13px}.calendar-foot{font-size:11px;color:#a79bbd}.text-btn{font-size:12px}.search-input,.select-input,.form-input,.form-textarea{font-size:14px}.filter-btn,.member-row{font-size:14px}.filter-count,.member-count{font-size:12px}.toolbar-title{font-size:16px}.toolbar-sub{font-size:12px;color:#b0a5c4}.chip{font-size:12px}.pinned-toggle{font-size:13px}.result-line h2{font-size:18px}.result-line p{font-size:13px;color:#b0a5c4}.result-count{font-size:12px}.card-date{font-size:12px}.tag{font-size:11px}.card-meta .category-tag,.member-tag{font-size:12px}.card-title{font-size:17px;line-height:1.55;min-height:52px}.card-description{font-size:14px;line-height:1.85;color:#d0c7df;min-height:0;max-height:none;overflow:visible;display:block}.mini-link{font-size:12px}.tiny-btn{font-size:12px}.footer{font-size:11px;letter-spacing:.06em;color:#9a8eaf}.field label,.login-fields label{font-size:13px}.login-modal p{font-size:14px;color:#c0b6d0}.small-note{font-size:12px;color:#a79bbd}.modal-head h2{font-size:18px}.empty-state h3{font-size:18px}.empty-state p,.notice{font-size:14px}
        .start-date-line{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:17px;color:#b9aecb;font-size:13px}.start-date-line strong{color:#eee5ff;font-size:14px}.start-date-line strong:last-of-type{color:#d1baff;font-family:Orbitron,sans-serif}.anniversary-panel{position:relative;overflow:hidden;border-color:#8d5b8a;background:radial-gradient(ellipse at 100% 0%,#7d3f7638,transparent 55%),linear-gradient(145deg,#281427,#15101d)}.anniversary-panel:after{content:'✦';position:absolute;right:15px;top:9px;color:#ff9bcf;font-size:34px;opacity:.16}.anniversary-date{font-size:12px;color:#e6a8ce;letter-spacing:.08em}.anniversary-name{margin:9px 0 5px;font-size:20px;font-weight:800;color:#fff}.anniversary-count{display:inline-flex;align-items:center;gap:7px;margin-top:9px;padding:7px 11px;border:1px solid #d56bb066;border-radius:9px;background:#9e3d7528;color:#ffc5e2;font-size:14px;font-weight:800}.anniversary-note{margin-top:8px;font-size:12px;line-height:1.7;color:#c5adc2}
        .soop-member-list{display:flex;flex-direction:column;gap:9px}
        .soop-member{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #332744;border-radius:11px;background:#100d1b;color:#f0eaff;text-decoration:none;transition:border-color .2s,background .2s}
        .soop-member:hover{border-color:#8564c6;background:#21182f}
        .soop-avatar{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:10px;background:#21182f;font-size:13px;font-weight:800}
        .soop-member-info{min-width:0;flex:1}.soop-member-name{font-size:13px;font-weight:700}
        .soop-member-id{display:block;margin-top:3px;color:#968baF;font-size:10px}
        .soop-status{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:11px;font-weight:700}
        .soop-status-dot{width:7px;height:7px;border-radius:50%;display:inline-block}
        .soop-live{color:#75f0a1}.soop-live .soop-status-dot{background:#47e783;box-shadow:0 0 10px #47e783aa}
        .soop-offline{color:#a69bb9}.soop-offline .soop-status-dot{background:#716780}
        .soop-unknown{color:#f2cc78}.soop-unknown .soop-status-dot{background:#e8b94e}
        .soop-panel-foot{margin-top:11px;color:#a79bbd;font-size:11px;line-height:1.6}
        .soop-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
        .soop-live-count{padding:4px 7px;border:1px solid #286a45;border-radius:999px;background:#10331f;color:#80f0a8;font-size:10px;font-weight:700}
        @media(max-width:1250px){.workspace{grid-template-columns:260px minmax(0,1fr);gap:14px}.cards-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.top-nav{gap:6px}.top-nav a{padding:8px 9px;font-size:12px}.hero{grid-template-columns:minmax(0,1.2fr) minmax(260px,.9fr)}}
        @media(max-width:850px){.topbar{padding:15px 18px;flex-wrap:wrap}.top-nav{display:flex;order:3;width:100%;justify-content:flex-start}.hero{grid-template-columns:1fr;padding-top:25px}.hero-stats{max-width:600px}.workspace{grid-template-columns:1fr}.sidebar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.sidebar .panel:first-child{grid-row:span 2}.cards-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.toolbar{align-items:flex-start}.toolbar-right{flex-wrap:wrap}.brand{min-width:0}.brand-name{font-size:16px}}
        @media(max-width:560px){.top-nav{gap:6px}.top-nav a{padding:7px 8px;font-size:11px}.hero-copy{font-size:14px}.stat-label{font-size:10px}.stat-box strong{font-size:18px}.filter-btn,.member-row{font-size:14px}.card-title{font-size:17px}.card-description{font-size:14px;line-height:1.85;min-height:0;max-height:none;overflow:visible;display:block}.anniversary-name{font-size:19px}.topbar{padding:13px 14px}.brand-home-button{gap:9px}.brand-mark{width:38px;height:38px}.scroll-top-button{right:14px;bottom:14px;width:43px;height:43px;border-radius:13px}.brand-name{font-size:13px;letter-spacing:.08em}.brand-sub{font-size:8px}.top-actions .ghost-btn{display:none}.hero{padding:23px 14px 18px;gap:18px}.hero h1{font-size:29px}.hero-copy{font-size:11px}.hero-stats{gap:7px}.stat-box{padding:12px 10px;border-radius:11px}.stat-label{font-size:8px}.stat-box strong{font-size:18px}.workspace{padding:0 14px 25px}.sidebar{grid-template-columns:1fr}.sidebar .panel:first-child{grid-row:auto}.panel-inner{padding:14px}.toolbar{padding:12px}.toolbar-left{width:100%}.toolbar-right{width:100%;justify-content:space-between}.filter-chips{flex-wrap:nowrap;overflow-x:auto;padding-bottom:3px}.chip{flex-shrink:0}.cards-grid{grid-template-columns:1fr;gap:12px}.card-media{aspect-ratio:16/8}.card-title{min-height:0}.card-description{min-height:0}.result-line{margin-top:15px}.footer{flex-direction:column;align-items:flex-start}.modal-form{grid-template-columns:1fr;padding:15px}.field.full,.modal-actions{grid-column:auto}.modal-head{padding:15px}.modal-form .form-checks{gap:12px}}
      `}</style>

      <header className="topbar">
        <div className="brand">
          <button type="button" className="brand-home-button" aria-label="홈으로 이동" title="맨 위로 이동" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className="brand-mark">H</span>
            <span><span className="brand-name" style={{ display: "block" }}>HADES TIMELINE</span><span className="brand-sub" style={{ display: "block" }}>FROM HELL TO THE STAGE</span></span>
          </button>
        </div>
        <nav className="top-nav" aria-label="하데스 공식 링크"><a href="https://cafe.naver.com/moomoo" target="_blank" rel="noreferrer">☕ 팬카페 ↗</a><a href="https://www.youtube.com/channel/UCZjhbR54UmZ67ixwIpM0eBQ" target="_blank" rel="noreferrer">▶ 공식 유튜브 ↗</a><a className="pv-link" href="https://youtu.be/J82aRVvDOwk?si=BEFKHDZxGCSLkX4X" target="_blank" rel="noreferrer">✦ DEBUT PV ↗</a></nav>
        <div className="top-actions">
          {adminMode ? <><span className="brand-sub">ADMIN</span><button className="ghost-btn" onClick={openNew}>＋ 기록 추가</button><button className="ghost-btn" onClick={() => void handleLogout()}>로그아웃</button></> : <button className="ghost-btn" onClick={() => setLoginOpen(true)}>관리자 로그인</button>}
        </div>
      </header>

      <section className="hero">
        <div><div className="eyebrow">THE CHRONICLE OF HADES</div><h1>EVERY MOMENT.<br /><em>ONE HISTORY.</em></h1><p className="hero-copy">하데스가 걸어온 순간들을 기록하는 아카이브.<br />무대 위의 기억부터 작은 순간까지, 우리의 시간을 모읍니다.</p><div className="start-date-line">활동 시작일 <strong>2025.09.05</strong><span>·</span><strong>D+{daysActive.toLocaleString("ko-KR")}</strong><span>오늘까지 함께한 시간</span></div></div>
        <div className="hero-stats"><Stat label="TOTAL ARCHIVES" value={events.length.toLocaleString("ko-KR")} /><Stat label="DAYS TOGETHER" value={daysActive.toLocaleString("ko-KR")} accent="#c2a6ff" /><Stat label="PINNED MOMENTS" value={events.filter((event) => event.pinned).length.toLocaleString("ko-KR")} accent="#ffd85a" /></div>
      </section>

      <div className="workspace">
        <aside className="sidebar">
          <section className="panel"><div className="panel-inner">
            <div className="calendar-head"><button className="arrow-btn" aria-label="이전 달" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}>‹</button><div className="calendar-month">{calendarDate.getFullYear()} <span style={{ color: "#bba3ff" }}>{MONTH_NAMES[calendarDate.getMonth()]}</span></div><button className="arrow-btn" aria-label="다음 달" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}>›</button></div>
            <div className="weekdays">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-grid">{calendarCells.map((date, index) => {
              if (!date) return <span key={`blank-${index}`} />;
              const records = monthEvents.filter((event) => event.date === date);
              const today = date === new Date().toISOString().slice(0, 10);
              const selected = selectedDate === date;
              const colors = Array.from(new Set(records.map((event) => MEMBER_COLORS[getMember(event)]).filter(Boolean))).slice(0, 3);
              return <button key={date} className={`day-btn ${selected ? "selected" : ""} ${today ? "today" : ""}`} title={`${date} · 기록 ${records.length}개`} onClick={() => setSelectedDate(selected ? "" : date)}><span>{Number(date.slice(-2))}</span><span className="day-dots">{colors.map((color, i) => <i key={i} className="day-dot" style={{ background: color }} />)}</span></button>;
            })}</div>
            <div className="calendar-foot"><span>{monthEvents.length} RECORDS THIS MONTH</span><button className="text-btn" onClick={() => setSelectedDate("")}>날짜 초기화</button></div>
          </div></section>

          <section className="panel"><div className="panel-inner"><h3 className="panel-title">SEARCH ARCHIVE <small>기록 검색</small></h3><div className="search-wrap"><span className="search-icon">⌕</span><input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목, 내용 검색..." /></div></div></section>

          <section className="panel"><div className="panel-inner"><h3 className="panel-title">CATEGORIES <small>분류별 기록</small></h3><div className="filter-list">{categories.map((category) => <button key={category} className={`filter-btn ${categoryFilter === category ? "active" : ""}`} onClick={() => setCategoryFilter(category)}><span>{category === "전체" ? "✦" : "◇"} &nbsp;{category}</span><span className="filter-count">{category === "전체" ? events.length : events.filter((event) => event.category === category).length}</span></button>)}</div></div></section>

          <section className="panel"><div className="panel-inner">
            <div className="soop-panel-head"><h3 className="panel-title" style={{ marginBottom: 0 }}>SOOP LIVE <small>실시간 방송 현황</small></h3><span className="soop-live-count">{SOOP_MEMBERS.filter((member) => soopStatuses[member.id]?.live === true).length} LIVE</span></div>
            <div className="soop-member-list" style={{ marginTop: 13 }}>
              {SOOP_MEMBERS.map((member) => {
                const status = soopStatuses[member.id];
                const live = status?.live === true;
                const offline = status?.live === false;
                const statusClass = live ? "soop-live" : offline ? "soop-offline" : "soop-unknown";
                const statusText = soopLoading && !status ? "확인 중" : live ? "방송 중" : offline ? "방송 종료" : "확인 불가";
                return <a className="soop-member" key={member.id} href={member.url} target="_blank" rel="noreferrer" aria-label={`${member.name} SOOP 방송국 열기`}>
                  <span className="soop-avatar" style={{ color: MEMBER_COLORS[member.name], border: `1px solid ${MEMBER_COLORS[member.name]}55` }}>{member.name.slice(0, 1)}</span>
                  <span className="soop-member-info"><span className="soop-member-name">{member.name}</span><span className="soop-member-id">{member.id}</span></span>
                  <span className={`soop-status ${statusClass}`}><i className="soop-status-dot" />{statusText}</span>
                </a>;
              })}
            </div>
            <div className="soop-panel-foot">{soopLoading && !soopCheckedAt ? "SOOP 방송 상태를 확인하고 있어요." : soopCheckedAt ? `약 60초마다 자동 갱신 · 마지막 확인 ${new Date(soopCheckedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "상태를 확인하지 못했어요. 잠시 후 자동으로 다시 확인합니다."} · 항목을 누르면 방송국으로 이동</div>
          </div></section>

          <section className="panel"><div className="panel-inner"><h3 className="panel-title">THE MEMBERS <small>멤버별 기록</small></h3><div className="member-list"><button className={`member-row ${memberFilter === "전체" ? "active" : ""}`} onClick={() => setMemberFilter("전체")}><span className="member-name"><i className="member-dot" style={{ color: "#b7a0ff", background: "#b7a0ff" }} />전체 멤버</span><span className="member-count">{events.length}</span></button>{totalMembers.map((member) => <button key={member.name} className={`member-row ${memberFilter === member.name ? "active" : ""}`} onClick={() => setMemberFilter(memberFilter === member.name ? "전체" : member.name)}><span className="member-name"><i className="member-dot" style={{ color: member.color, background: member.color }} />{member.name}</span><span className="member-count">{member.count}</span></button>)}</div></div></section>

          <section className="panel anniversary-panel"><div className="panel-inner"><h3 className="panel-title">UPCOMING ANNIVERSARY <small>다가오는 기념일</small></h3><div className="anniversary-date">2026.11.11 · BIRTHDAY</div><div className="anniversary-name">솜주먹 생일</div><div className="anniversary-count">{birthdayDaysLeft >= 0 ? `D-${birthdayDaysLeft}` : "기념일이 지났어요"}</div><div className="anniversary-note">분홍빛으로 기억할 솜주먹의 특별한 날</div></div></section>
        </aside>

        <section className="main-content">
          {dbError && <div className="notice">{dbError}</div>}
          <div className="panel toolbar"><div className="toolbar-left"><div><div className="toolbar-title">TIMELINE ARCHIVE</div><div className="toolbar-sub">하데스의 순간을 찾아보세요</div></div></div><div className="toolbar-right"><label className="pinned-toggle"><input type="checkbox" checked={showPinnedOnly} onChange={(e) => setShowPinnedOnly(e.target.checked)} /> 고정 기록만</label><select className="select-input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} aria-label="정렬"><option value="latest">최신순</option><option value="oldest">오래된순</option><option value="title">제목순</option></select>{adminMode && <button className="primary-btn" onClick={openNew}>＋ 기록 추가</button>}</div></div>
          <div className="filter-chips">{categories.slice(0, 9).map((category) => <button key={category} className={`chip ${categoryFilter === category ? "active" : ""}`} onClick={() => setCategoryFilter(category)}>{category}</button>)}{selectedDate && <button className="chip active" onClick={() => setSelectedDate("")}>날짜 {formatDate(selectedDate)} ×</button>}{memberFilter !== "전체" && <button className="chip active" onClick={() => setMemberFilter("전체")}>{memberFilter} ×</button>}<button className="chip" onClick={resetFilters}>필터 초기화 ↺</button></div>
          <div className="result-line"><div><h2>{selectedDate ? `${formatDate(selectedDate)} 기록` : memberFilter !== "전체" ? `${memberFilter}의 기록` : categoryFilter !== "전체" ? `${categoryFilter} 기록` : "모든 순간"}</h2><p>HADES의 활동을 시간순으로 기록합니다.</p></div><span className="result-count">{filteredEvents.length} RESULTS</span></div>
          <div className="cards-grid">
            {loading ? <div className="loading-state">ARCHIVE LOADING...</div> : filteredEvents.length === 0 ? <div className="empty-state"><div className="empty-symbol">H.</div><h3>아직 표시할 기록이 없어요</h3><p>다른 날짜나 카테고리를 선택하거나 검색어를 바꿔보세요.</p><div style={{ marginTop: 16 }}><button className="ghost-btn" onClick={resetFilters}>필터 초기화</button>{adminMode && <button className="primary-btn" style={{ marginLeft: 8 }} onClick={openNew}>첫 기록 추가하기</button>}</div></div> : filteredEvents.map((event) => {
              const member = getMember(event); const memberColor = MEMBER_COLORS[member] ?? "#b8a2ff"; const videoId = youtubeId(event.youtubeUrl);
              return <article className="event-card" key={event.id}>
                <div className="card-media">{videoId ? <iframe className="video-frame" src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={event.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : event.imageUrl ? <img src={event.imageUrl} alt={event.title} loading="lazy" /> : <div className="media-placeholder"><div className="placeholder-mark">HADES</div><div className="placeholder-caption">MEMORY ARCHIVE</div></div>}
                  <div className="card-top-tags">{event.pinned && <span className="tag pinned">★ PINNED</span>}{event.important && <span className="tag important">✦ IMPORTANT</span>}</div><span className="card-date">{formatDate(event.date)}</span>
                </div>
                <div className="card-body"><div className="card-meta"><span className="category-tag">◇ {event.category || "기타"}{event.time ? ` · ${event.time}` : ""}</span><span className="member-tag"><i style={{ background: memberColor }} />{member}</span></div><h3 className="card-title">{event.title}</h3><p className="card-description">{event.description || "기록된 설명이 없습니다."}</p><div className="card-footer"><div className="card-footer-left">{event.youtubeUrl && !videoId && <a className="mini-link" href={event.youtubeUrl} target="_blank" rel="noreferrer">▶ 영상 보기</a>}{event.imageUrl && videoId && <a className="mini-link" href={event.imageUrl} target="_blank" rel="noreferrer">사진 보기 ↗</a>}{!event.imageUrl && !event.youtubeUrl && <span style={{ color: "#6f6584", fontSize: 10 }}>HADES ARCHIVE</span>}</div>{adminMode && <div className="card-admin"><button className="tiny-btn" title="고정 전환" onClick={() => void toggleFlag(event, "pinned")}>{event.pinned ? "★" : "☆"}</button><button className="tiny-btn" title="중요 표시 전환" onClick={() => void toggleFlag(event, "important")}>{event.important ? "✦" : "◇"}</button><button className="tiny-btn" onClick={() => openEdit(event)}>수정</button><button className="tiny-btn" onClick={() => void deleteEvent(event)}>삭제</button></div>}</div></div>
              </article>;
            })}
          </div>
          <footer className="footer"><span><strong>HADES TIMELINE</strong> · FROM HELL TO THE STAGE</span><span>EST. 2025.09.05 · {daysActive.toLocaleString("ko-KR")} DAYS</span></footer>
        </section>
      </div>

      {loginOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setLoginOpen(false); }}><section className="modal login-modal"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}><div><div className="eyebrow" style={{ marginBottom: 9 }}>ADMIN ACCESS</div><h2>관리자 로그인</h2></div><button className="close-btn" onClick={() => setLoginOpen(false)}>×</button></div><p>기록을 추가하거나 수정하려면 관리자 계정으로 로그인해 주세요.</p><form className="login-fields" onSubmit={handleLogin}><label>이메일<input className="form-input" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required autoComplete="username" /></label><label>비밀번호<input className="form-input" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required autoComplete="current-password" /></label>{loginError && <div className="login-error">{loginError}</div>}<button className="primary-btn" type="submit">로그인</button></form><div className="small-note">Supabase Auth에 등록된 기존 관리자 계정을 사용합니다.</div></section></div>}

      {showScrollTop && <button type="button" className="scroll-top-button" aria-label="페이지 맨 위로 이동" title="맨 위로" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>}

      {editorOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setEditorOpen(false); }}><section className="modal"><div className="modal-head"><h2>{editingId === null ? "새 타임라인 기록" : "타임라인 기록 수정"}</h2><button className="close-btn" onClick={() => setEditorOpen(false)} disabled={saving}>×</button></div><form className="modal-form" onSubmit={saveEvent}>
        <div className="field"><label>날짜 *</label><input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required min="2025-09-05" /></div>
        <div className="field"><label>시간</label><input className="form-input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
        <div className="field full"><label>제목 *</label><input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="활동 제목을 입력하세요" /></div>
        <div className="field"><label>카테고리</label><input className="form-input" list="timeline-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /><datalist id="timeline-categories">{categories.filter((item) => item !== "전체").map((item) => <option key={item} value={item} />)}</datalist></div>
        <div className="field"><label>멤버 / 활동 유형</label><input className="form-input" value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })} placeholder="예: 연초록, 단체 활동" /></div>
        <div className="field full"><label>내용</label><textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="활동에 대한 설명을 적어주세요." /></div>
        <div className="field full"><label>사진 업로드</label><input className="form-input" type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />{form.imageUrl && !photoFile && <span className="small-note">기존 사진이 연결되어 있어요. 새 사진을 선택하지 않으면 유지됩니다.</span>}</div>
        <div className="field full"><label>또는 사진 URL</label><input className="form-input" type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." /></div>
        <div className="field full"><label>YouTube URL</label><input className="form-input" type="url" value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." /></div>
        <div className="field full form-checks"><label><input type="checkbox" checked={form.important} onChange={(e) => setForm({ ...form, important: e.target.checked })} /> 중요 기록</label><label><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> 상단 고정</label></div>
        <div className="modal-actions"><button className="ghost-btn" type="button" onClick={() => setEditorOpen(false)} disabled={saving}>취소</button><button className="primary-btn" type="submit" disabled={saving}>{saving ? "저장 중..." : editingId === null ? "기록 저장" : "수정 내용 저장"}</button></div>
      </form></section></div>}
    </main>
  );
}
