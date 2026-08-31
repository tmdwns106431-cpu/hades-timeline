"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category =
  | "데뷔"
  | "음원"
  | "콘텐츠"
  | "방송"
  | "공연"
  | "기타";

type ActivityType = "단체" | "개인";

type Event = {
  id: number;
  date: string;
  time: string;
  title: string;
  description: string;
  imageUrl: string;
  imageKey?: string;
  youtubeUrl: string;
  important: boolean;
  pinned: boolean;
  category: Category;
  activityType: ActivityType;
};

type Filter =
  | "all"
  | "pinned"
  | "important"
  | "단체"
  | "개인"
  | Category;

const categories: Category[] = [
  "데뷔",
  "음원",
  "콘텐츠",
  "방송",
  "공연",
  "기타",
];

const categoryStyle: Record<Category, string> = {
  데뷔: "bg-pink-500/15 text-pink-300 border-pink-400/20",
  음원: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20",
  콘텐츠: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  방송: "bg-yellow-500/15 text-yellow-300 border-yellow-400/20",
  공연: "bg-lime-500/15 text-lime-300 border-lime-400/20",
  기타: "bg-slate-500/15 text-slate-300 border-slate-400/20",
};

const members = [
  {
    name: "솜주먹",
    month: 11,
    day: 11,
    color: "border-pink-400/20 bg-pink-400/[0.07] text-pink-300",
    dot: "bg-pink-400",
  },
  {
    name: "연초록",
    month: 8,
    day: 1,
    color: "border-lime-400/20 bg-lime-400/[0.07] text-lime-300",
    dot: "bg-lime-400",
  },
  {
    name: "챈나",
    month: 2,
    day: 26,
    color: "border-indigo-400/30 bg-indigo-400/[0.09] text-indigo-300",
    dot: "bg-indigo-400",
  },
  {
    name: "띵귤",
    month: 12,
    day: 24,
    color: "border-yellow-400/20 bg-yellow-400/[0.07] text-yellow-300",
    dot: "bg-yellow-400",
  },
  {
    name: "키마",
    month: 4,
    day: 22,
    color: "border-purple-400/20 bg-purple-400/[0.07] text-purple-300",
    dot: "bg-purple-400",
  },
];

function getDaysBetween(start: Date, end: Date) {
  const a = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  ).getTime();

  const b = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  ).getTime();

  return Math.floor((b - a) / 86400000);
}

function getHadesDays() {
  return getDaysBetween(
    new Date(2025, 8, 5),
    new Date()
  );
}

function getBirthdayInfo(month: number, day: number) {
  const today = new Date();

  let birthday = new Date(
    today.getFullYear(),
    month - 1,
    day
  );

  if (birthday < new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )) {
    birthday = new Date(
      today.getFullYear() + 1,
      month - 1,
      day
    );
  }

  const days = getDaysBetween(today, birthday);

  return {
    days,
    isToday: days === 0,
  };
}

function getYoutubeId(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (
      host === "youtube.com" ||
      host === "m.youtube.com"
    ) {
      const v = parsed.searchParams.get("v");
      if (v) return v;

      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname
          .split("/shorts/")[1]
          ?.split("/")[0] || null;
      }

      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname
          .split("/embed/")[1]
          ?.split("/")[0] || null;
      }
    }

    if (host === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function getYoutubeThumbnail(url: string) {
  const id = getYoutubeId(url);
  return id
    ? `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    : null;
}

function sortEvents(
  events: Event[],
  order: "newest" | "oldest"
) {
  return [...events].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }

    const aValue = `${a.date} ${a.time}`;
    const bValue = `${b.date} ${b.time}`;

    return order === "newest"
      ? bValue.localeCompare(aValue)
      : aValue.localeCompare(bValue);
  });
}

function getMonthLabel(date: string) {
  const parts = date.split("-");

  if (parts.length >= 2) {
    return `${parts[0]}년 ${Number(parts[1])}월`;
  }

  const dotParts = date.split(".");

  if (dotParts.length >= 2) {
    return `${dotParts[0]}년 ${Number(dotParts[1])}월`;
  }

  return date;
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");

        let width = img.width;
        let height = img.height;

        const max = 1600;

        if (width > max || height > max) {
          const ratio = Math.min(
            max / width,
            max / height
          );

          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas 오류"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("이미지 압축 실패"));
              return;
            }

            resolve(blob);
          },
          "image/jpeg",
          0.8
        );
      };

      img.onerror = () =>
        reject(new Error("이미지 로드 실패"));

      img.src = reader.result as string;
    };

    reader.onerror = () =>
      reject(new Error("파일 읽기 실패"));

    reader.readAsDataURL(file);
  });
}

async function uploadImage(
  key: string,
  blob: Blob
) {
  const { error } = await supabase.storage
    .from("timeline-images")
    .upload(key, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("timeline-images")
    .getPublicUrl(key);

  return data.publicUrl;
}

async function deleteImage(key?: string) {
  if (!key) return;

  const { error } = await supabase.storage
    .from("timeline-images")
    .remove([key]);

  if (error) {
    console.error("사진 삭제 오류:", error);
  }
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [playingVideoId, setPlayingVideoId] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<Filter>("all");

  const [sortOrder, setSortOrder] =
    useState<"newest" | "oldest">("newest");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [youtubeUrl, setYoutubeUrl] =
    useState("");

  const [imagePreview, setImagePreview] =
    useState("");

  const [pendingImageBlob, setPendingImageBlob] =
    useState<Blob | null>(null);

  const [oldImageKey, setOldImageKey] =
    useState<string | undefined>();

  const [important, setImportant] =
    useState(false);

  const [pinned, setPinned] = useState(false);

  const [category, setCategory] =
    useState<Category>("기타");

  const [activityType, setActivityType] =
    useState<ActivityType>("단체");

  const [today, setToday] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [showTopButton, setShowTopButton] =
    useState(false);

  const is365Days = today === "2026-09-05";

  /* =========================
     로그인
  ========================= */

  useEffect(() => {
    document.title = "HADES TIMELINE";

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /* =========================
     날짜
  ========================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setToday(
        new Date().toISOString().slice(0, 10)
      );
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  /* =========================
     스크롤
  ========================= */

  useEffect(() => {
    const handleScroll = () => {
      setShowTopButton(window.scrollY > 500);
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    handleScroll();

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );
  }, []);

  /* =========================
     Supabase 기록 불러오기
     ★ LocalStorage 사용 안 함
  ========================= */

  const loadEvents = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("timeline")
      .select("*")
      .order("date", { ascending: false })
      .order("time", { ascending: false });

    if (error) {
      console.error(
        "Supabase 기록 불러오기 오류:",
        error
      );

      alert(
        "기록을 불러오지 못했습니다."
      );

      setEvents([]);
      setLoading(false);
      return;
    }

    const converted: Event[] = (data || []).map(
      (item) => ({
        id: Number(item.id),
        date: item.date || "",
        time: item.time || "",
        title: item.title || "",
        description: item.description || "",
        imageUrl: item.image_url || "",
        imageKey: item.image_key || undefined,
        youtubeUrl: item.youtube_url || "",
        important: Boolean(item.important),
        pinned: Boolean(item.pinned),
        category:
          (item.category || "기타") as Category,
        activityType:
          (item.activity_type || "단체") as ActivityType,
      })
    );

    setEvents(converted);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  /* =========================
     폼 초기화
  ========================= */

  const resetForm = () => {
    setEditingId(null);
    setDate("");
    setTime("");
    setTitle("");
    setDescription("");
    setYoutubeUrl("");
    setImagePreview("");
    setPendingImageBlob(null);
    setOldImageKey(undefined);
    setImportant(false);
    setPinned(false);
    setCategory("기타");
    setActivityType("단체");
    setShowForm(false);
  };

  /* =========================
     수정
  ========================= */

  const startEdit = (event: Event) => {
    setEditingId(event.id);
    setDate(event.date);
    setTime(event.time);
    setTitle(event.title);
    setDescription(event.description);
    setYoutubeUrl(event.youtubeUrl);
    setImagePreview(event.imageUrl);
    setPendingImageBlob(null);
    setOldImageKey(event.imageKey);
    setImportant(event.important);
    setPinned(event.pinned);
    setCategory(event.category);
    setActivityType(event.activityType);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================
     기록 저장
  ========================= */

  const addEvent = async () => {
    console.log("현재 로그인 사용자:", user?.id);
    if (!user) {
      alert("운영자 로그인 후 이용해주세요.");
      return;
    }

    if (!date || !time || !title.trim()) {
      alert(
        "날짜, 시간, 제목을 입력해주세요."
      );
      return;
    }

    try {
      /* 수정 */

      if (editingId !== null) {
        const current = events.find(
          (event) => event.id === editingId
        );

        let imageUrl =
          current?.imageUrl || "";

        let imageKey =
          current?.imageKey;

        if (pendingImageBlob) {
          imageKey = `image-${editingId}.jpg`;

          imageUrl = await uploadImage(
            imageKey,
            pendingImageBlob
          );

          if (
            oldImageKey &&
            oldImageKey !== imageKey
          ) {
            await deleteImage(oldImageKey);
          }
        }

        const { data, error } =
          await supabase
            .from("timeline")
            .update({
              date,
              time,
              title: title.trim(),
              description,
              image_url: imageUrl,
              image_key: imageKey || null,
              youtube_url: youtubeUrl,
              important,
              pinned,
              category,
              activity_type: activityType,
            })
            .eq("id", editingId)
            .select("*")
           .single();

        if (error) throw error;
      

        const updated: Event = {
          id: Number(data.id),
          date: data.date || "",
          time: data.time || "",
          title: data.title || "",
          description: data.description || "",
          imageUrl: data.image_url || "",
          imageKey:
            data.image_key || undefined,
          youtubeUrl:
            data.youtube_url || "",
          important: Boolean(data.important),
          pinned: Boolean(data.pinned),
          category:
            (data.category || "기타") as Category,
          activityType:
            (data.activity_type ||
              "단체") as ActivityType,
        };

        setEvents((currentEvents) =>
          currentEvents.map((event) =>
            event.id === editingId
              ? updated
              : event
          )
        );

        resetForm();
        return;
      }

      /* 새 기록 */

      const { data, error } =
        await supabase
          .from("timeline")
          .insert({
            date,
            time,
            title: title.trim(),
            description,
            image_url: "",
            image_key: null,
            youtube_url: youtubeUrl,
            important,
            pinned,
            category,
            activity_type: activityType,
          })
          .select("*")
          .single();

      if (error) throw error;

      let imageUrl = "";
      let imageKey: string | undefined;

      if (pendingImageBlob) {
        imageKey = `image-${data.id}.jpg`;

        imageUrl = await uploadImage(
          imageKey,
          pendingImageBlob
        );

        const { error: imageError } =
          await supabase
            .from("timeline")
            .update({
              image_url: imageUrl,
              image_key: imageKey,
            })
            .eq("id", data.id);

        if (imageError) {
          throw imageError;
        }
      }

      const newEvent: Event = {
        id: Number(data.id),
        date: data.date || "",
        time: data.time || "",
        title: data.title || "",
        description: data.description || "",
        imageUrl:
          imageUrl || data.image_url || "",
        imageKey:
          imageKey ||
          data.image_key ||
          undefined,
        youtubeUrl:
          data.youtube_url || "",
        important: Boolean(data.important),
        pinned: Boolean(data.pinned),
        category:
          (data.category || "기타") as Category,
        activityType:
          (data.activity_type ||
            "단체") as ActivityType,
      };

      setEvents((current) => [
        newEvent,
        ...current,
      ]);

      resetForm();
    } catch (error) {
      console.error(
        "기록 저장 오류:",
        error
      );

      alert(
        "기록 저장 중 문제가 발생했습니다."
      );
    }
  };

  /* =========================
     기록 삭제
  ========================= */

  const deleteEvent = async (event: Event) => {
    if (!user) {
      alert("운영자 로그인 후 이용해주세요.");
      return;
    }

    const confirmed = window.confirm(
      `"${event.title}" 기록을 삭제할까요?\n\n삭제하면 복구할 수 없습니다.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("timeline")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      if (event.imageKey) {
        await deleteImage(event.imageKey);
      }

      setEvents((current) =>
        current.filter(
          (item) => item.id !== event.id
        )
      );

      if (
        playingVideoId ===
        getYoutubeId(event.youtubeUrl)
      ) {
        setPlayingVideoId(null);
      }
    } catch (error) {
      console.error(error);

      alert(
        "기록 삭제 중 문제가 발생했습니다."
      );
    }
  };

  /* =========================
     사진 삭제
  ========================= */

  const deleteEventImage = async (
    event: Event
  ) => {
    if (!user) {
      alert("운영자 로그인 후 이용해주세요.");
      return;
    }

    try {
      if (event.imageKey) {
        await deleteImage(event.imageKey);
      }

      const { error } = await supabase
        .from("timeline")
        .update({
          image_url: "",
          image_key: null,
        })
        .eq("id", event.id);

      if (error) throw error;

      setEvents((current) =>
        current.map((item) =>
          item.id === event.id
            ? {
                ...item,
                imageUrl: "",
                imageKey: undefined,
              }
            : item
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        "사진 삭제 중 문제가 발생했습니다."
      );
    }
  };

  /* =========================
     중요
  ========================= */

  const toggleImportant = async (
    event: Event
  ) => {
    if (!user) {
      alert("운영자 로그인 후 이용해주세요.");
      return;
    }

    const value = !event.important;

    const { error } = await supabase
      .from("timeline")
      .update({
        important: value,
      })
      .eq("id", event.id);

    if (error) {
      alert(
        "중요 설정 변경에 실패했습니다."
      );
      return;
    }

    setEvents((current) =>
      current.map((item) =>
        item.id === event.id
          ? {
              ...item,
              important: value,
            }
          : item
      )
    );
  };

  /* =========================
     고정
  ========================= */

  const togglePinned = async (
    event: Event
  ) => {
    if (!user) {
      alert("운영자 로그인 후 이용해주세요.");
      return;
    }

    const value = !event.pinned;

    const { error } = await supabase
      .from("timeline")
      .update({
        pinned: value,
      })
      .eq("id", event.id);

    if (error) {
      alert(
        "고정 설정 변경에 실패했습니다."
      );
      return;
    }

    setEvents((current) =>
      current.map((item) =>
        item.id === event.id
          ? {
              ...item,
              pinned: value,
            }
          : item
      )
    );
  };

  /* =========================
     필터
  ========================= */

  const filteredEvents = useMemo(() => {
    const keyword =
      search.toLowerCase().trim();

    const result = events.filter((event) => {
      const matchesSearch =
        !keyword ||
        event.title
          .toLowerCase()
          .includes(keyword) ||
        event.description
          .toLowerCase()
          .includes(keyword);

      const matchesFilter =
        filter === "all" ||
        (filter === "pinned" &&
          event.pinned) ||
        (filter === "important" &&
          event.important) ||
        event.category === filter ||
        event.activityType === filter;

      return (
        matchesSearch &&
        matchesFilter
      );
    });

    return sortEvents(
      result,
      sortOrder
    );
  }, [
    events,
    search,
    filter,
    sortOrder,
  ]);

  const pinnedCount = events.filter(
    (event) => event.pinned
  ).length;

  const importantCount = events.filter(
    (event) => event.important
  ).length;

  const birthdayData = members.map(
    (member) => ({
      ...member,
      ...getBirthdayInfo(
        member.month,
        member.day
      ),
    })
  );

  const hadesDays = getHadesDays();

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#030712] text-white">

      {/* 365 DAYS */}

      {is365Days && (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
          <div className="absolute inset-0 bg-purple-500/[0.08] backdrop-blur-[1px]" />

          <div className="absolute inset-x-4 top-[38%] mx-auto max-w-xl text-center">
            <div className="rounded-[2rem] border border-white/15 bg-[#080b18]/90 px-6 py-8 shadow-2xl backdrop-blur-xl">
              <p className="text-xs font-black tracking-[0.4em] text-cyan-300">
                FROM HELL TO THE STAGE
              </p>

              <div className="mt-3 text-5xl font-black sm:text-7xl">
                365 DAYS
              </div>

              <p className="mt-3 text-sm font-bold text-slate-400">
                HADES와 함께한 1년
              </p>

              <div className="mt-5 text-2xl">
                ✦ ✦ ✦
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 배경 */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/space-bg.jpg.jfif')",
          }}
        />

        <div className="absolute inset-0 bg-[#030712]/20" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.16),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.10),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(6,182,212,0.08),transparent_30%)]" />

        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:55px_55px]" />
      </div>

      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#030712]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 sm:h-14 sm:w-14">
                <img
                  src="/hades-mark.png"
                  alt="HADES"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <h1 className="text-2xl font-black sm:text-3xl">
                  HADES TIMELINE
                </h1>

                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.32em] text-cyan-300">
                  FROM HELL TO THE STAGE
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs font-medium text-slate-400 sm:text-sm">
              The Journey of HADES
            </p>

            {user ? (
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                }}
                className="mt-3 rounded-xl border border-pink-400/20 bg-pink-400/10 px-4 py-2 text-xs font-bold text-pink-300"
              >
                운영자 로그아웃
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const email = window.prompt(
                    "운영자 이메일"
                  );

                  const password =
                    window.prompt(
                      "운영자 비밀번호"
                    );

                  if (!email || !password) {
                    return;
                  }

                  const { error } =
                    await supabase.auth.signInWithPassword(
                      {
                        email,
                        password,
                      }
                    );

                  if (error) {
                    alert(
                      "로그인에 실패했습니다."
                    );
                  }
                }}
                className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300"
              >
                🔐 운영자 로그인
              </button>
            )}
          </div>

          {user && (
            <button
              type="button"
              onClick={() =>
                setShowForm(!showForm)
              }
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 px-5 py-3.5 text-sm font-black sm:w-auto"
            >
              {showForm
                ? "닫기"
                : "＋ 기록 추가"}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-7 sm:py-10">

        {/* INTRO */}

        <div className="mb-7 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] backdrop-blur-xl">

          <div className="p-5 sm:p-8">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                  THE JOURNEY
                </p>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Every Moment, Every Stage
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
                  HADES의 시작부터 지금까지,
                  모든 순간을 기록합니다.
                </p>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <a
                    href="https://www.youtube.com/@HADES_offi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-center text-xs font-black text-red-300"
                  >
                    ▶ HADES 공식 YouTube
                  </a>
<a
  href="https://www.youtube.com/watch?v=J82aRVvDOwk"
  target="_blank"
  rel="noopener noreferrer"
  className="rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-2.5 text-center text-xs font-black text-purple-300"
>
  🎬 하데스 HADES Debut PV
</a>
                  <a
                    href="https://cafe.naver.com/moomoo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-2.5 text-center text-xs font-black text-green-300"
                  >
                    ☕ MOO & HADES 공식 팬카페
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-5 text-center sm:min-w-[230px]">
                <p className="text-[10px] font-black tracking-[0.3em] text-purple-300">
                  HADES SINCE
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  2025.09.05
                </p>

                <div className="mt-2 text-4xl font-black">
                  DAY {hadesDays}
                </div>

                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  함께한 시간
                </p>
              </div>

            </div>
          </div>

          {/* 생일 */}

          <div className="border-t border-white/10 bg-black/10 p-5 sm:p-7">
            <div className="mb-4">
              <p className="text-[10px] font-black tracking-[0.28em] text-pink-300">
                BIRTHDAY COUNTDOWN
              </p>

              <h3 className="mt-1 text-lg font-black">
                HADES MEMBERS
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {birthdayData.map((member) => (
                <div
                  key={member.name}
                  className={`rounded-2xl border p-3 ${member.color}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${member.dot}`}
                    />

                    <span className="truncate text-xs font-black">
                      {member.name}
                    </span>
                  </div>

                  <div className="mt-3">
                    {member.isToday ? (
                      <div className="text-lg font-black">
                        🎂 TODAY!
                      </div>
                    ) : (
                      <>
                        <span className="text-2xl font-black">
                          D-{member.days}
                        </span>

                        <p className="mt-1 text-[10px] font-bold opacity-60">
                          {member.month}.
                          {String(
                            member.day
                          ).padStart(2, "0")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STATS */}

        <div className="mb-7 grid grid-cols-3 gap-2 sm:gap-4">

          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-center sm:p-5">
            <div className="text-[10px] font-black text-slate-500">
              전체 기록
            </div>

            <div className="mt-1 text-xl font-black sm:text-3xl">
              {events.length}
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-400/10 bg-yellow-400/[0.035] p-3 text-center sm:p-5">
            <div className="text-[10px] font-black text-yellow-300">
              📌 고정
            </div>

            <div className="mt-1 text-xl font-black text-yellow-300 sm:text-3xl">
              {pinnedCount}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.035] p-3 text-center sm:p-5">
            <div className="text-[10px] font-black text-amber-300">
              ⭐ 중요
            </div>

            <div className="mt-1 text-xl font-black text-amber-300 sm:text-3xl">
              {importantCount}
            </div>
          </div>

        </div>

        {/* FORM */}

        {showForm && user && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-purple-400/20 bg-[#0b0a18]/90 backdrop-blur-xl">

            <div className="border-b border-white/10 px-5 py-5 sm:px-7">
              <p className="text-xs font-black tracking-widest text-cyan-300">
                {editingId !== null
                  ? "EDIT RECORD"
                  : "NEW RECORD"}
              </p>

              <h2 className="mt-1 text-xl font-black sm:text-2xl">
                {editingId !== null
                  ? "기록 수정"
                  : "새 기록 추가"}
              </h2>
            </div>

            <div className="p-5 sm:p-7">

              <div className="grid gap-4 sm:grid-cols-2">

                <input
                  type="date"
                  value={date}
                  onChange={(e) =>
                    setDate(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
                />

                <input
                  type="time"
                  value={time}
                  onChange={(e) =>
                    setTime(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
                />

              </div>

              <input
                type="text"
                placeholder="기록 제목"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
              />

              <textarea
                placeholder="기록 내용을 입력해주세요..."
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                rows={5}
                className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 outline-none"
              />

              <div className="mt-5">

                <label className="mb-2 block text-xs font-black text-cyan-300">
                  카테고리
                </label>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setCategory(item)
                      }
                      className={`rounded-xl border px-4 py-3 text-sm font-black ${
                        category === item
                          ? categoryStyle[item]
                          : "border-white/10 bg-white/5 text-slate-400"
                      }`}
                    >
                      {item}
                    </button>
                  ))}

                </div>
              </div>

              <div className="mt-5">

                <label className="mb-2 block text-xs font-black text-cyan-300">
                  활동 형태
                </label>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setActivityType("단체")
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-black ${
                      activityType === "단체"
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    👥 단체
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActivityType("개인")
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-black ${
                      activityType === "개인"
                        ? "border-pink-400/30 bg-pink-400/10 text-pink-300"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    👤 개인
                  </button>

                </div>
              </div>

              {/* 이미지 */}

              <div className="mt-5">

                <label className="mb-2 block text-xs font-black text-cyan-300">
                  이미지 첨부
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file =
                      e.target.files?.[0];

                    if (!file) return;

                    try {
                      const blob =
                        await compressImage(
                          file
                        );

                      setPendingImageBlob(
                        blob
                      );

                      setImagePreview(
                        URL.createObjectURL(
                          blob
                        )
                      );
                    } catch {
                      alert(
                        "이미지 처리 중 문제가 발생했습니다."
                      );
                    }

                    e.target.value = "";
                  }}
                  className="w-full rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-xs text-slate-400"
                />

              </div>

              <input
                type="url"
                placeholder="유튜브 링크 (선택)"
                value={youtubeUrl}
                onChange={(e) =>
                  setYoutubeUrl(
                    e.target.value
                  )
                }
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">

                <label className="flex items-center gap-3 rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-sm font-bold text-amber-300">
                  <input
                    type="checkbox"
                    checked={important}
                    onChange={(e) =>
                      setImportant(
                        e.target.checked
                      )
                    }
                  />
                  ⭐ 중요 기록
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-yellow-400/10 bg-yellow-400/5 px-4 py-3 text-sm font-bold text-yellow-300">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) =>
                      setPinned(
                        e.target.checked
                      )
                    }
                  />
                  📌 상단 고정
                </label>

              </div>

              {imagePreview && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/30">

                  <img
                    src={imagePreview}
                    alt="미리보기"
                    className="max-h-[650px] w-full object-contain"
                  />

                  <div className="border-t border-white/10 p-3">

                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          editingId !== null
                        ) {
                          const event =
                            events.find(
                              (item) =>
                                item.id ===
                                editingId
                            );

                          if (event) {
                            await deleteEventImage(
                              event
                            );
                          }
                        }

                        setImagePreview("");
                        setPendingImageBlob(
                          null
                        );
                        setOldImageKey(
                          undefined
                        );
                      }}
                      className="w-full rounded-xl border border-pink-400/20 bg-pink-400/10 px-4 py-2.5 text-xs font-bold text-pink-300"
                    >
                      🗑️ 사진 삭제
                    </button>

                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">

                <button
                  type="button"
                  onClick={addEvent}
                  className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 px-6 py-3 text-sm font-black"
                >
                  {editingId !== null
                    ? "수정 저장"
                    : "기록 저장"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-300"
                >
                  취소
                </button>

              </div>

            </div>
          </div>
        )}

        {/* SEARCH */}

        <div className="mb-4">

          <input
            type="text"
            placeholder="🔍 타임라인 검색..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-sm outline-none backdrop-blur-xl"
          />

        </div>

        {/* FILTER */}

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">

          <div className="flex flex-wrap gap-2">

            {(
              [
                ["all", "전체"],
                ["pinned", "📌 고정"],
                ["important", "⭐ 중요"],
                ["단체", "👥 단체"],
                ["개인", "👤 개인"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFilter(value)
                }
                className={`rounded-xl px-4 py-2 text-xs font-black ${
                  filter === value
                    ? "bg-white text-black"
                    : "bg-white/5 text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}

            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setFilter(item)
                }
                className={`rounded-xl border px-4 py-2 text-xs font-black ${
                  filter === item
                    ? categoryStyle[item]
                    : "border-transparent bg-white/5 text-slate-400"
                }`}
              >
                {item}
              </button>
            ))}

          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">

            <div className="flex items-center gap-2">

              <span className="text-xs font-bold text-slate-500">
                정렬
              </span>

              <button
                type="button"
                onClick={() =>
                  setSortOrder("newest")
                }
                className={`rounded-xl px-3 py-2 text-xs font-black ${
                  sortOrder === "newest"
                    ? "bg-white text-black"
                    : "bg-white/5 text-slate-400"
                }`}
              >
                최신순
              </button>

              <button
                type="button"
                onClick={() =>
                  setSortOrder("oldest")
                }
                className={`rounded-xl px-3 py-2 text-xs font-black ${
                  sortOrder === "oldest"
                    ? "bg-white text-black"
                    : "bg-white/5 text-slate-400"
                }`}
              >
                오래된순
              </button>

            </div>

            <div className="text-xs font-semibold text-slate-500">
              {filteredEvents.length}개의 기록
            </div>

          </div>
        </div>

        {/* TIMELINE */}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] px-5 py-16 text-center">
            <div className="text-3xl">
              ⏳
            </div>

            <p className="mt-4 text-sm font-bold text-slate-400">
              기록을 불러오는 중...
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] px-5 py-14 text-center">
            <div className="text-5xl">
              🔎
            </div>

            <h3 className="mt-4 text-lg font-black">
              기록을 찾을 수 없어요
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              새로운 기록을 추가해보세요.
            </p>
          </div>
        ) : (
          <section className="relative">

            <div className="absolute bottom-5 left-[7px] top-5 w-px bg-gradient-to-b from-pink-400 via-indigo-400 via-lime-400 via-purple-400 to-yellow-300" />

            <div className="space-y-10">

              {filteredEvents.map(
                (event, index) => {
                  const previous =
                    filteredEvents[
                      index - 1
                    ];

                  const currentMonth =
                    getMonthLabel(
                      event.date
                    );

                  const previousMonth =
                    previous
                      ? getMonthLabel(
                          previous.date
                        )
                      : null;

                  const showMonth =
                    currentMonth !==
                    previousMonth;

                  const youtubeId =
                    getYoutubeId(
                      event.youtubeUrl
                    );

                  const thumbnail =
                    getYoutubeThumbnail(
                      event.youtubeUrl
                    );

                  return (
                    <div key={event.id}>

                      {showMonth && (
                        <div className="relative mb-5 pl-6 sm:pl-9">
                          <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-300">
                            📅 {currentMonth}
                          </span>
                        </div>
                      )}

                      <article className="relative pl-6 sm:pl-9">

                        <div
                          className={`absolute left-[-1px] top-2 h-4 w-4 rounded-full border-4 border-[#030712] shadow-[0_0_12px_currentColor] ${
                            [
                              "bg-pink-300 text-pink-300",
                              "bg-indigo-300 text-indigo-300",
                              "bg-purple-400 text-purple-400",
                              "bg-lime-400 text-lime-400",
                              "bg-yellow-300 text-yellow-300",
                            ][index % 5]
                          }`}
                        />

                        <div className="mb-3 flex flex-wrap items-center gap-2">

                          <span className="rounded-lg border border-cyan-400/15 bg-cyan-400/10 px-2.5 py-1 text-xs font-black text-cyan-300">
                            {event.date}
                          </span>

                          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
                            🕐 {event.time}
                          </span>

                          <span
                            className={`rounded-lg border px-2.5 py-1 text-xs font-black ${categoryStyle[event.category]}`}
                          >
                            {event.category}
                          </span>

                          <span className={`rounded-lg border px-2.5 py-1 text-xs font-black ${
                            event.activityType === "개인"
                              ? "border-pink-400/20 bg-pink-400/10 text-pink-300"
                              : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                          }`}>
                            {event.activityType === "개인"
                              ? "👤 개인"
                              : "👥 단체"}
                          </span>

                          {event.pinned && (
                            <span className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1 text-xs font-black text-yellow-300">
                              📌 고정
                            </span>
                          )}

                          {event.important && (
                            <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-black text-amber-300">
                              ⭐ 중요
                            </span>
                          )}

                        </div>

                        <div
                          className={`overflow-hidden rounded-3xl border bg-[#080b18]/80 ${
                            event.important
                              ? "border-amber-400/30"
                              : "border-white/10"
                          }`}
                        >

                          <div className="p-5 sm:p-6">

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                              <h2 className="min-w-0 text-lg font-black leading-snug sm:text-xl">
                                {event.title}
                              </h2>

                              {user && (
                                <div className="flex shrink-0 flex-wrap gap-2">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      togglePinned(event)
                                    }
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                                      event.pinned
                                        ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
                                        : "border-white/10 bg-white/5 text-slate-500"
                                    }`}
                                  >
                                    📌
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleImportant(event)
                                    }
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                                      event.important
                                        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                                        : "border-white/10 bg-white/5 text-slate-500"
                                    }`}
                                  >
                                    ⭐
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      startEdit(event)
                                    }
                                    className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300"
                                  >
                                    수정
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteEvent(event)
                                    }
                                    className="rounded-lg border border-pink-400/20 bg-pink-400/10 px-3 py-1.5 text-xs font-bold text-pink-300"
                                  >
                                    삭제
                                  </button>

                                </div>
                              )}

                            </div>

                            <div className="mt-4 h-px bg-gradient-to-r from-fuchsia-400/30 via-cyan-400/20 to-transparent" />

                            {event.description && (
                              <p className="mt-4 whitespace-pre-wrap break-words text-[14px] leading-7 text-slate-300 sm:text-[15px]">
                                {event.description}
                              </p>
                            )}

                            {event.imageUrl && (
                              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/40">

                                <img
                                  src={event.imageUrl}
                                  alt={event.title}
                                  className="block max-h-[650px] w-full object-contain"
                                />

                                {user && (
                                  <div className="border-t border-white/10 p-3">

                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteEventImage(event)
                                      }
                                      className="w-full rounded-xl border border-pink-400/20 bg-pink-400/10 px-4 py-2.5 text-xs font-bold text-pink-300"
                                    >
                                      🗑️ 사진 삭제
                                    </button>

                                  </div>
                                )}

                              </div>
                            )}

                            {youtubeId &&
                              thumbnail && (
                                <div className="mt-5 overflow-hidden rounded-2xl bg-black">

                                  {playingVideoId === youtubeId ? (
                                    <iframe
                                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1`}
                                      title={event.title}
                                      className="aspect-video w-full"
                                      allow="autoplay; encrypted-media; picture-in-picture"
                                      allowFullScreen
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPlayingVideoId(
                                          youtubeId
                                        )
                                      }
                                      className="group relative block w-full"
                                    >

                                      <img
                                        src={thumbnail}
                                        alt={`${event.title} 유튜브 썸네일`}
                                        className="aspect-video w-full object-cover"
                                      />

                                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">

                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl sm:h-20 sm:w-20">
                                          <span className="ml-1 text-2xl sm:text-3xl">
                                            ▶
                                          </span>
                                        </div>

                                      </div>
                                    </button>
                                  )}

                                </div>
                              )}

                          </div>
                        </div>
                      </article>
                    </div>
                  );
                }
              )}

            </div>
          </section>
        )}

        <footer className="mt-14 border-t border-white/10 py-8 text-center">

          <p className="text-xs font-black tracking-[0.25em] text-slate-500">
            FROM HELL TO THE STAGE
          </p>

          <p className="mt-2 text-[11px] text-slate-600">
            본 사이트는 HADES 팬이 제작한
            비공식 팬페이지입니다.
          </p>

        </footer>

      </div>

      {showTopButton && (
        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#0b1020]/90 text-xl font-black shadow-2xl sm:bottom-7 sm:right-7 sm:h-14 sm:w-14"
        >
          ↑
        </button>
      )}

    </main>
  );
}