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

  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  let birthday = new Date(
    today.getFullYear(),
    month - 1,
    day
  );

  if (birthday < todayDate) {
    birthday = new Date(
      today.getFullYear() + 1,
      month - 1,
      day
    );
  }

  const days = getDaysBetween(todayDate, birthday);

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
        return (
          parsed.pathname
            .split("/shorts/")[1]
            ?.split("/")[0] || null
        );
      }

      if (parsed.pathname.startsWith("/embed/")) {
        return (
          parsed.pathname
            .split("/embed/")[1]
            ?.split("/")[0] || null
        );
      }
    }

    if (host === "youtu.be") {
      return (
        parsed.pathname.slice(1).split("/")[0] || null
      );
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

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(
                new Error("이미지 압축 실패")
              );
              return;
            }

            resolve(blob);
          },
          "image/jpeg",
          0.8
        );
      };

      img.onerror = () =>
        reject(
          new Error("이미지 로드 실패")
        );

      img.src = reader.result as string;
    };

    reader.onerror = () =>
      reject(
        new Error("파일 읽기 실패")
      );

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
    console.error(
      "사진 삭제 오류:",
      error
    );
  }
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [playingVideoId, setPlayingVideoId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("all");

  const [sortOrder, setSortOrder] =
    useState<"newest" | "oldest">(
      "newest"
    );

  const [date, setDate] =
    useState("");

  const [time, setTime] =
    useState("");

  const [title, setTitle] =
    useState("");

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

  const [pinned, setPinned] =
    useState(false);

  const [category, setCategory] =
    useState<Category>("기타");

  const [activityType, setActivityType] =
    useState<ActivityType>("단체");

  const [today, setToday] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const [showTopButton, setShowTopButton] =
    useState(false);

  const [highlightedEventId, setHighlightedEventId] =
    useState<number | null>(null);

  const [showSpecialCelebration, setShowSpecialCelebration] =
    useState(false);

  const is365Days =
    today === "2026-09-05";

  useEffect(() => {
    document.title =
      "HADES TIMELINE";

    supabase.auth
      .getUser()
      .then(({ data }) => {
        setUser(data.user);
      });

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(
            session?.user ?? null
          );
        }
      );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer =
      setInterval(() => {
        setToday(
          new Date()
            .toISOString()
            .slice(0, 10)
        );
      }, 60000);

    return () =>
      clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowTopButton(
        window.scrollY > 500
      );
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

  const loadEvents = async () => {
    setLoading(true);

    const { data, error } =
      await supabase
        .from("timeline")
        .select("*")
        .order("date", {
          ascending: false,
        })
        .order("time", {
          ascending: false,
        });

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

    const converted: Event[] =
      (data || []).map((item) => ({
        id: Number(item.id),
        date: item.date || "",
        time: item.time || "",
        title: item.title || "",
        description:
          item.description || "",
        imageUrl:
          item.image_url || "",
        imageKey:
          item.image_key ||
          undefined,
        youtubeUrl:
          item.youtube_url || "",
        important:
          Boolean(item.important),
        pinned:
          Boolean(item.pinned),
        category:
          (item.category ||
            "기타") as Category,
        activityType:
          (item.activity_type ||
            "단체") as ActivityType,
      }));

    setEvents(converted);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

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

  const startEdit = (
    event: Event
  ) => {
    setEditingId(event.id);
    setDate(event.date);
    setTime(event.time);
    setTitle(event.title);
    setDescription(
      event.description
    );
    setYoutubeUrl(
      event.youtubeUrl
    );
    setImagePreview(
      event.imageUrl
    );
    setPendingImageBlob(null);
    setOldImageKey(
      event.imageKey
    );
    setImportant(
      event.important
    );
    setPinned(event.pinned);
    setCategory(
      event.category
    );
    setActivityType(
      event.activityType
    );
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const addEvent = async () => {
    console.log(
      "현재 로그인 사용자:",
      user?.id
    );

    if (!user) {
      alert(
        "관리자 로그인 후 이용해주세요."
      );
      return;
    }

    if (
      !date ||
      !time ||
      !title.trim()
    ) {
      alert(
        "날짜, 시간, 제목을 입력해주세요."
      );
      return;
    }

    try {
      if (editingId !== null) {
        const current =
          events.find(
            (event) =>
              event.id ===
              editingId
          );

        let imageUrl =
          current?.imageUrl || "";

        let imageKey =
          current?.imageKey;

        if (pendingImageBlob) {
          imageKey =
            `image-${editingId}.jpg`;

          imageUrl =
            await uploadImage(
              imageKey,
              pendingImageBlob
            );

          if (
            oldImageKey &&
            oldImageKey !== imageKey
          ) {
            await deleteImage(
              oldImageKey
            );
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
              image_key:
                imageKey || null,
              youtube_url:
                youtubeUrl,
              important,
              pinned,
              category,
              activity_type:
                activityType,
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
          description:
            data.description || "",
          imageUrl:
            data.image_url || "",
          imageKey:
            data.image_key ||
            undefined,
          youtubeUrl:
            data.youtube_url || "",
          important:
            Boolean(
              data.important
            ),
          pinned:
            Boolean(data.pinned),
          category:
            (data.category ||
              "기타") as Category,
          activityType:
            (data.activity_type ||
              "단체") as ActivityType,
        };

        setEvents(
          (currentEvents) =>
            currentEvents.map(
              (event) =>
                event.id ===
                editingId
                  ? updated
                  : event
            )
        );

        resetForm();
        return;
      }

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
            youtube_url:
              youtubeUrl,
            important,
            pinned,
            category,
            activity_type:
              activityType,
          })
          .select("*")
          .single();

      if (error) throw error;

      let imageUrl = "";
      let imageKey:
        | string
        | undefined;

      if (pendingImageBlob) {
        imageKey =
          `image-${data.id}.jpg`;

        imageUrl =
          await uploadImage(
            imageKey,
            pendingImageBlob
          );

        const {
          error: imageError,
        } = await supabase
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
        description:
          data.description || "",
        imageUrl:
          imageUrl ||
          data.image_url ||
          "",
        imageKey:
          imageKey ||
          data.image_key ||
          undefined,
        youtubeUrl:
          data.youtube_url || "",
        important:
          Boolean(data.important),
        pinned:
          Boolean(data.pinned),
        category:
          (data.category ||
            "기타") as Category,
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

  const deleteEvent = async (
    event: Event
  ) => {
    if (!user) {
      alert(
        "관리자 로그인 후 이용해주세요."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `"${event.title}" 기록을 삭제할까요?\n\n삭제하면 복구할 수 없습니다.`
      );

    if (!confirmed) return;

    try {
      const { error } =
        await supabase
          .from("timeline")
          .delete()
          .eq("id", event.id);

      if (error) throw error;

      if (event.imageKey) {
        await deleteImage(
          event.imageKey
        );
      }

      setEvents((current) =>
        current.filter(
          (item) =>
            item.id !== event.id
        )
      );

      if (
        playingVideoId ===
        getYoutubeId(
          event.youtubeUrl
        )
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

  const deleteEventImage =
    async (event: Event) => {
      if (!user) {
        alert(
          "관리자 로그인 후 이용해주세요."
        );
        return;
      }

      try {
        if (event.imageKey) {
          await deleteImage(
            event.imageKey
          );
        }

        const { error } =
          await supabase
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
                  imageKey:
                    undefined,
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

  const toggleImportant =
    async (event: Event) => {
      if (!user) {
        alert(
          "관리자 로그인 후 이용해주세요."
        );
        return;
      }

      const value =
        !event.important;

      const { error } =
        await supabase
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

  const togglePinned =
    async (event: Event) => {
      if (!user) {
        alert(
          "관리자 로그인 후 이용해주세요."
        );
        return;
      }

      const value =
        !event.pinned;

      const { error } =
        await supabase
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

  const filteredEvents =
    useMemo(() => {
      const keyword =
        search
          .toLowerCase()
          .trim();

      const result =
        events.filter((event) => {
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
            event.category ===
              filter ||
            event.activityType ===
              filter;

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

  const pinnedCount =
    events.filter(
      (event) => event.pinned
    ).length;

  const importantCount =
    events.filter(
      (event) => event.important
    ).length;

  const pinnedEvents = useMemo(() => {
    return sortEvents(
      events.filter((event) => event.pinned),
      "newest"
    ).slice(0, 3);
  }, [events]);

  const scrollToEvent = (id: number) => {
    setSearch("");
    setFilter("all");
    setHighlightedEventId(id);

    window.setTimeout(() => {
      document
        .getElementById(`event-${id}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 80);

    window.setTimeout(() => {
      setHighlightedEventId(null);
    }, 1800);
  };

  const birthdayData =
    members.map((member) => ({
      ...member,
      ...getBirthdayInfo(
        member.month,
        member.day
      ),
    }));

  const birthdayToday =
    birthdayData.find(
      (member) =>
        member.isToday
    );

  const isBirthdayToday =
    Boolean(birthdayToday);

  useEffect(() => {
    if (
      !is365Days &&
      !isBirthdayToday
    ) {
      setShowSpecialCelebration(false);
      return;
    }

    setShowSpecialCelebration(true);

    const timer =
      window.setTimeout(() => {
        setShowSpecialCelebration(false);
      }, 10000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    is365Days,
    isBirthdayToday,
  ]);

  const isSpecialDay =
    showSpecialCelebration;

  const hadesDays =
    getHadesDays();

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#030712] text-white">

      {isSpecialDay && (
        <div
          className={`pointer-events-none fixed inset-0 z-[100] overflow-hidden ${
            is365Days
              ? "anniversary-celebration"
              : ""
          }`}
        >

          {is365Days && (
            <>
              <div className="anniversary-glow absolute inset-0" />

              <div className="anniversary-light absolute left-1/2 top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full" />

              <div className="anniversary-particles absolute inset-0">
                {Array.from({
                  length: 28,
                }).map((_, index) => (
                  <span
                    key={index}
                    className={`anniversary-particle anniversary-particle-${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute inset-0 bg-black/[0.12]" />

          <div
            className={`firework firework-1 ${
              is365Days
                ? "anniversary-firework"
                : ""
            }`}
          >
            {Array.from({
              length: 12,
            }).map((_, index) => (
              <span key={index} />
            ))}
          </div>

          <div
            className={`firework firework-2 ${
              is365Days
                ? "anniversary-firework"
                : ""
            }`}
          >
            {Array.from({
              length: 12,
            }).map((_, index) => (
              <span key={index} />
            ))}
          </div>

          <div
            className={`firework firework-3 ${
              is365Days
                ? "anniversary-firework"
                : ""
            }`}
          >
            {Array.from({
              length: 12,
            }).map((_, index) => (
              <span key={index} />
            ))}
          </div>

          {is365Days && (
            <>
              <div className="firework firework-4 anniversary-firework">
                {Array.from({
                  length: 12,
                }).map((_, index) => (
                  <span key={index} />
                ))}
              </div>

              <div className="firework firework-5 anniversary-firework">
                {Array.from({
                  length: 12,
                }).map((_, index) => (
                  <span key={index} />
                ))}
              </div>
            </>
          )}

          <div
            className={`absolute inset-x-4 top-[22%] flex justify-center ${
              is365Days
                ? "anniversary-card-wrap"
                : ""
            }`}
          >

            {is365Days ? (
              <div className="anniversary-card relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/20 bg-[#080b18]/90 px-6 py-8 text-center shadow-[0_0_80px_rgba(168,85,247,0.35)] backdrop-blur-2xl sm:px-10 sm:py-10">

                <button
                  type="button"
                  onClick={() =>
                    setShowSpecialCelebration(false)
                  }
                  className="pointer-events-auto absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl font-bold leading-none text-white/80 shadow-lg backdrop-blur-md transition hover:bg-white/20 hover:text-white sm:right-4 sm:top-4"
                  aria-label="닫기"
                >
                  ×
                </button>

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.18),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.18),transparent_45%)]" />

                <div className="relative">

                  <div className="anniversary-crown text-4xl sm:text-5xl">
                    ✦
                  </div>

                  <p className="mt-2 text-[10px] font-black tracking-[0.45em] text-cyan-300 sm:text-xs">
                    HADES ANNIVERSARY
                  </p>

                  <p className="anniversary-title mt-3 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
                    HAPPY 1st
                  </p>

                  <p className="anniversary-title anniversary-title-delay mt-3 text-3xl font-black tracking-[-0.03em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 sm:text-5xl">
                    ANNIVERSARY
                  </p>

                  <div className="anniversary-days mt-5">
                    <span className="text-6xl font-black tracking-[-0.05em] text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.35)] sm:text-8xl">
                      365
                    </span>

                    <span className="ml-2 text-2xl font-black tracking-widest text-cyan-300 sm:text-4xl">
                      DAYS
                    </span>
                  </div>

                  <div className="mx-auto mt-5 h-px w-32 bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                  <p className="mt-5 text-sm font-bold text-slate-300 sm:text-base">
                    HADES와 함께한 첫 번째 1년
                  </p>

                  <p className="mt-2 text-[11px] font-medium text-slate-500 sm:text-xs">
                    FROM HELL TO THE STAGE
                  </p>

                  <div className="mt-6 flex justify-center gap-5 text-xl sm:text-2xl">
                    <span className="anniversary-star">
                      ✦
                    </span>

                    <span className="anniversary-star anniversary-star-2">
                      ✦
                    </span>

                    <span className="anniversary-star anniversary-star-3">
                      ✦
                    </span>
                  </div>

                </div>
              </div>
            ) : (
              <div className="relative rounded-3xl border border-white/15 bg-[#080b18]/90 px-6 py-5 text-center shadow-2xl backdrop-blur-xl sm:px-8 sm:py-6">

                <button
                  type="button"
                  onClick={() =>
                    setShowSpecialCelebration(false)
                  }
                  className="pointer-events-auto absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl font-bold leading-none text-white/80 shadow-lg backdrop-blur-md transition hover:bg-white/20 hover:text-white"
                  aria-label="닫기"
                >
                  ×
                </button>

                <p className="text-[10px] font-black tracking-[0.35em] text-pink-300">
                  HAPPY BIRTHDAY
                </p>

                <p className="mt-2 text-3xl font-black sm:text-5xl">
                  {birthdayToday?.name}
                </p>

                <p className="mt-2 text-xs font-bold text-slate-400 sm:text-sm">
                  생일을 축하합니다
                </p>

                <div className="mt-3 text-xl tracking-[0.5em]">
                  ✦ ✦ ✦
                </div>

              </div>
            )}

          </div>
        </div>
      )}

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
              The Journey of HADES by.코코몽
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
                관리자 로그아웃
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const email =
                    window.prompt(
                      "관리자 이메일"
                    );

                  const password =
                    window.prompt(
                      "관리자 비밀번호"
                    );

                  if (
                    !email ||
                    !password
                  ) {
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
                🔐 관리자 로그인
              </button>
            )}

          </div>

          {user && (
            <button
              type="button"
              onClick={() =>
                setShowForm(
                  !showForm
                )
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

        <div className="mb-7 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] backdrop-blur-xl">

          <div className="p-5 sm:p-8">

            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                  THE JOURNEY
                </p>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  "From Hell to the Stage"
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
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

              <div className="hades-since-card rounded-2xl border border-cyan-300/50 bg-purple-500/10 p-5 text-center sm:min-w-[230px]">

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

              {birthdayData.map(
                (member) => (
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
                            ).padStart(
                              2,
                              "0"
                            )}
                          </p>
                        </>
                      )}

                    </div>

                  </div>
                )
              )}

            </div>
          </div>
        </div>

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

        {pinnedEvents.length > 0 && (
          <section className="mb-7">

            <div className="mb-4 flex items-end justify-between gap-3 px-1">

              <div>

                <p className="text-[10px] font-black tracking-[0.28em] text-yellow-300">
                  RECENT HIGHLIGHTS
                </p>

                <h2 className="mt-1 text-xl font-black sm:text-2xl">
                  HADES의 주요 순간
                </h2>

              </div>

              <span className="hidden text-[10px] font-bold text-slate-500 sm:block">
                고정된 기록에서 자동으로 표시됩니다
              </span>

            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

              {pinnedEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() =>
                    scrollToEvent(event.id)
                  }
                  className="group overflow-hidden rounded-2xl border border-yellow-400/15 bg-[#080b18]/75 text-left backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-yellow-400/30 hover:bg-yellow-400/[0.06]"
                >

                  <div className="border-b border-white/10 px-4 py-3">

                    <div className="flex items-center justify-between gap-2">

                      <span className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-2 py-1 text-[10px] font-black text-yellow-300">
                        📌 HIGHLIGHT
                      </span>

                      <span className="text-[10px] font-bold text-slate-500">
                        {event.date}
                      </span>

                    </div>

                  </div>

                  <div className="p-4">

                    <div className="mb-2 flex flex-wrap gap-1.5">

                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${categoryStyle[event.category]}`}
                      >
                        {event.category}
                      </span>

                      <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        {event.activityType}
                      </span>

                    </div>

                    <h3 className="break-words text-sm font-black leading-6 text-white transition group-hover:text-cyan-200">
                      {event.title}
                    </h3>

                    {event.description && (
                      <p className="mt-2 break-words text-xs leading-5 text-slate-500">
                        {event.description.length > 70
                          ? `${event.description.slice(0, 70)}...`
                          : event.description}
                      </p>
                    )}

                    <p className="mt-3 text-[10px] font-black text-cyan-400/70">
                      기록으로 이동 →
                    </p>

                  </div>

                </button>
              ))}

            </div>
          </section>
        )}

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
                    setDate(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
                />

                <input
                  type="time"
                  value={time}
                  onChange={(e) =>
                    setTime(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
                />

              </div>

              <input
                type="text"
                placeholder="기록 제목"
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
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
                className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 outline-none"
              />

              <div className="mt-5">

                <label className="mb-2 block text-xs font-black text-cyan-300">
                  카테고리
                </label>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

                  {categories.map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          setCategory(
                            item
                          )
                        }
                        className={`rounded-xl border px-4 py-3 text-sm font-black ${
                          category === item
                            ? categoryStyle[
                                item
                              ]
                            : "border-white/10 bg-white/5 text-slate-400"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

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
                      setActivityType(
                        "단체"
                      )
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-black ${
                      activityType ===
                      "단체"
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    👥 단체
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActivityType(
                        "개인"
                      )
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-black ${
                      activityType ===
                      "개인"
                        ? "border-pink-400/30 bg-pink-400/10 text-pink-300"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    👤 개인
                  </button>

                </div>
              </div>

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

                    e.target.value =
                      "";
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
                          editingId !==
                          null
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

                        setImagePreview(
                          ""
                        );

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
                  {editingId !==
                  null
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

        <div className="mb-4">

          <input
            type="text"
            placeholder="🔍 타임라인 검색..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-sm outline-none backdrop-blur-xl"
          />

        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">

          <div className="flex flex-wrap gap-2">

            {(
              [
                ["all", "전체"],
                ["pinned", "📌 고정"],
                [
                  "important",
                  "⭐ 중요",
                ],
                ["단체", "👥 단체"],
                ["개인", "👤 개인"],
              ] as [
                Filter,
                string
              ][]
            ).map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFilter(
                      value
                    )
                  }
                  className={`rounded-xl px-4 py-2 text-xs font-black ${
                    filter === value
                      ? "bg-white text-black"
                      : "bg-white/5 text-slate-400"
                  }`}
                >
                  {label}
                </button>
              )
            )}

            {categories.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setFilter(
                      item
                    )
                  }
                  className={`rounded-xl border px-4 py-2 text-xs font-black ${
                    filter === item
                      ? categoryStyle[
                          item
                        ]
                      : "border-transparent bg-white/5 text-slate-400"
                  }`}
                >
                  {item}
                </button>
              )
            )}

          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">

            <div className="flex items-center gap-2">

              <span className="text-xs font-bold text-slate-500">
                정렬
              </span>

              <button
                type="button"
                onClick={() =>
                  setSortOrder(
                    "newest"
                  )
                }
                className={`rounded-xl px-3 py-2 text-xs font-black ${
                  sortOrder ===
                  "newest"
                    ? "bg-white text-black"
                    : "bg-white/5 text-slate-400"
                }`}
              >
                최신순
              </button>

              <button
                type="button"
                onClick={() =>
                  setSortOrder(
                    "oldest"
                  )
                }
                className={`rounded-xl px-3 py-2 text-xs font-black ${
                  sortOrder ===
                  "oldest"
                    ? "bg-white text-black"
                    : "bg-white/5 text-slate-400"
                }`}
              >
                오래된순
              </button>

            </div>

            <div className="text-xs font-semibold text-slate-500">
              {
                filteredEvents.length
              }
              개의 기록
            </div>

          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] px-5 py-16 text-center">

            <div className="text-3xl">
              ⏳
            </div>

            <p className="mt-4 text-sm font-bold text-slate-400">
              기록을 불러오는 중...
            </p>

          </div>
        ) : filteredEvents.length ===
          0 ? (
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

            <div className="space-y-12 sm:space-y-10">

              {filteredEvents.map(
                (
                  event,
                  index
                ) => {
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
                    <div
                      key={
                        event.id
                      }
                      id={`event-${event.id}`}
                    >

                      {showMonth && (
                        <div className="relative mb-5 pl-6 sm:pl-9">

                          <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-300">
                            📅{" "}
                            {
                              currentMonth
                            }
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
                            ][
                              index %
                                5
                            ]
                          }`}
                        />

                        <div className="mb-4 flex flex-wrap items-center gap-1.5 sm:mb-3 sm:gap-2">

                          <span className="rounded-lg border border-cyan-400/15 bg-cyan-400/10 px-2 py-1 text-xs font-black text-cyan-300">
                            {
                              event.date
                            }
                          </span>

                          <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-slate-300">
                            🕐{" "}
                            {
                              event.time
                            }
                          </span>

                          <span
                            className={`rounded-lg border px-2.5 py-1 text-xs font-black ${categoryStyle[event.category]}`}
                          >
                            {
                              event.category
                            }
                          </span>

                          <span
                            className={`rounded-lg border px-2 py-1 text-xs font-black ${
                              event.activityType ===
                              "개인"
                                ? "border-pink-400/20 bg-pink-400/10 text-pink-300"
                                : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                            }`}
                          >
                            {event.activityType ===
                            "개인"
                              ? "👤 개인"
                              : "👥 단체"}
                          </span>

                          {event.important && (
                            <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-black text-amber-300">
                              ⭐ 중요
                            </span>
                          )}

                        </div>

                        <div
                          className={`overflow-hidden rounded-3xl border bg-[#080b18]/80 transition-all duration-500 ${
                            highlightedEventId === event.id
                              ? "border-cyan-300/70 ring-2 ring-cyan-400/40 shadow-[0_0_35px_rgba(34,211,238,0.22)]"
                              : event.important
                                ? "border-amber-400/30"
                                : "border-white/10"
                          }`}
                        >

                          <div className="p-4 sm:p-6">

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                              <h2 className="min-w-0 break-words text-[17px] font-black leading-[1.6] tracking-[-0.01em] sm:text-xl sm:leading-snug">
                                {
                                  event.title
                                }
                              </h2>

                              {user && (
                                <div className="flex shrink-0 flex-wrap gap-2">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      togglePinned(
                                        event
                                      )
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
                                      toggleImportant(
                                        event
                                      )
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
                                      startEdit(
                                        event
                                      )
                                    }
                                    className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300"
                                  >
                                    수정
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteEvent(
                                        event
                                      )
                                    }
                                    className="rounded-lg border border-pink-400/20 bg-pink-400/10 px-3 py-1.5 text-xs font-bold text-pink-300"
                                  >
                                    삭제
                                  </button>

                                </div>
                              )}

                            </div>

                            <div className="mt-5 h-px bg-gradient-to-r from-fuchsia-400/30 via-cyan-400/20 to-transparent" />

                            {event.description && (
                              <p className="mt-5 whitespace-pre-wrap break-words text-[14px] leading-[1.8] text-slate-300 sm:mt-4 sm:text-[15px] sm:leading-8">
                                {
                                  event.description
                                }
                              </p>
                            )}

                            {event.imageUrl && (
                              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/40">

                                <img
                                  src={
                                    event.imageUrl
                                  }
                                  alt={
                                    event.title
                                  }
                                  className="block max-h-[650px] w-full object-contain"
                                />

                                {user && (
                                  <div className="border-t border-white/10 p-3">

                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteEventImage(
                                          event
                                        )
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

                                  {playingVideoId ===
                                  youtubeId ? (
                                    <iframe
                                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1`}
                                      title={
                                        event.title
                                      }
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
                                        src={
                                          thumbnail
                                        }
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

          <p className="mt-2 text-[11px] leading-6 text-slate-600">
            본 페이지는 HADES의 활동과 순간들을 보기 편리하게 정리하기 위해 제작된 비공식 팬페이지입니다.
            <br />
            어떠한 수익 창출이나 상업적 목적 없이, HADES를 응원하고 기록하기 위해 운영됩니다.
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

      <style jsx>{`

        .hades-since-card {
          box-shadow:
            0 0 22px rgba(34, 211, 238, 0.28),
            0 0 45px rgba(34, 211, 238, 0.16),
            inset 0 0 18px rgba(34, 211, 238, 0.06);
          animation: hades-since-glow 3s ease-in-out infinite;
        }

        @keyframes hades-since-glow {
          0%,
          100% {
            box-shadow:
              0 0 22px rgba(34, 211, 238, 0.25),
              0 0 45px rgba(34, 211, 238, 0.13),
              inset 0 0 18px rgba(34, 211, 238, 0.05);
          }

          50% {
            box-shadow:
              0 0 30px rgba(34, 211, 238, 0.45),
              0 0 60px rgba(34, 211, 238, 0.25),
              inset 0 0 22px rgba(34, 211, 238, 0.10);
          }
        }

        .firework {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          animation: firework-burst 2.4s ease-out infinite;
        }

        .firework span {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 3px;
          height: 75px;
          border-radius: 9999px;
          transform-origin: 50% 0;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 1),
            rgba(168, 85, 247, 0)
          );
        }

        .firework span:nth-child(1) {
          transform: translate(-50%, 0) rotate(0deg);
        }

        .firework span:nth-child(2) {
          transform: translate(-50%, 0) rotate(30deg);
        }

        .firework span:nth-child(3) {
          transform: translate(-50%, 0) rotate(60deg);
        }

        .firework span:nth-child(4) {
          transform: translate(-50%, 0) rotate(90deg);
        }

        .firework span:nth-child(5) {
          transform: translate(-50%, 0) rotate(120deg);
        }

        .firework span:nth-child(6) {
          transform: translate(-50%, 0) rotate(150deg);
        }

        .firework span:nth-child(7) {
          transform: translate(-50%, 0) rotate(180deg);
        }

        .firework span:nth-child(8) {
          transform: translate(-50%, 0) rotate(210deg);
        }

        .firework span:nth-child(9) {
          transform: translate(-50%, 0) rotate(240deg);
        }

        .firework span:nth-child(10) {
          transform: translate(-50%, 0) rotate(270deg);
        }

        .firework span:nth-child(11) {
          transform: translate(-50%, 0) rotate(300deg);
        }

        .firework span:nth-child(12) {
          transform: translate(-50%, 0) rotate(330deg);
        }

        .firework-1 {
          left: 18%;
          top: 25%;
          animation-delay: 0s;
        }

        .firework-2 {
          right: 18%;
          top: 35%;
          animation-delay: 0.8s;
        }

        .firework-3 {
          left: 50%;
          top: 18%;
          animation-delay: 1.6s;
        }

        .firework-4 {
          left: 8%;
          top: 48%;
          animation-delay: 0.4s;
        }

        .firework-5 {
          right: 8%;
          top: 48%;
          animation-delay: 1.2s;
        }

        @keyframes firework-burst {
          0% {
            opacity: 0;
            transform: scale(0.15);
          }

          12% {
            opacity: 1;
          }

          55% {
            opacity: 1;
            transform: scale(1);
          }

          100% {
            opacity: 0;
            transform: scale(1.35);
          }
        }

        .anniversary-celebration {
          animation: anniversary-fade-in 0.45s ease-out forwards;
        }

        .anniversary-glow {
          background:
            radial-gradient(
              circle at 50% 45%,
              rgba(255,255,255,0.14),
              transparent 18%
            ),
            radial-gradient(
              circle at 50% 45%,
              rgba(34,211,238,0.14),
              transparent 42%
            ),
            radial-gradient(
              circle at 50% 45%,
              rgba(168,85,247,0.13),
              transparent 65%
            );
          animation: anniversary-glow-pulse 2.8s ease-in-out infinite;
        }

        .anniversary-light {
          box-shadow:
            0 0 40px 20px rgba(255,255,255,0.8),
            0 0 100px 50px rgba(34,211,238,0.45),
            0 0 180px 90px rgba(168,85,247,0.3);
          animation: anniversary-light-burst 1.8s ease-out forwards;
        }

        .anniversary-card-wrap {
          animation: anniversary-card-enter 0.9s cubic-bezier(.16,1,.3,1) forwards;
        }

        .anniversary-card {
          animation: anniversary-card-glow 2.5s ease-in-out infinite;
        }

        .anniversary-title {
          animation: anniversary-title-enter 0.8s cubic-bezier(.16,1,.3,1) both;
        }

        .anniversary-title-delay {
          animation-delay: 0.18s;
        }

        .anniversary-days {
          animation: anniversary-days-enter 1s cubic-bezier(.16,1,.3,1) 0.35s both;
        }

        .anniversary-crown {
          animation: anniversary-star-pop 1.2s ease-out 0.1s both;
          text-shadow:
            0 0 12px rgba(255,255,255,0.9),
            0 0 35px rgba(34,211,238,0.8);
        }

        .anniversary-star {
          animation: anniversary-star-float 1.8s ease-in-out infinite;
          text-shadow:
            0 0 10px rgba(255,255,255,0.9),
            0 0 25px rgba(34,211,238,0.7);
        }

        .anniversary-star-2 {
          animation-delay: 0.3s;
        }

        .anniversary-star-3 {
          animation-delay: 0.6s;
        }

        .anniversary-firework {
          animation-duration: 1.9s;
        }

        .anniversary-particle {
          position: absolute;
          left: 50%;
          top: 46%;
          width: 4px;
          height: 4px;
          border-radius: 9999px;
          background: white;
          box-shadow:
            0 0 8px rgba(255,255,255,0.9),
            0 0 18px rgba(34,211,238,0.7);
          animation:
            anniversary-particle-burst
            2.4s
            cubic-bezier(.16,1,.3,1)
            forwards;
        }

        .anniversary-particle:nth-child(3n) {
          width: 3px;
          height: 8px;
          border-radius: 2px;
        }

        .anniversary-particle:nth-child(4n) {
          width: 6px;
          height: 6px;
        }

        .anniversary-particle-1 { --x: -42vw; --y: -38vh; animation-delay: .05s; }
        .anniversary-particle-2 { --x: 39vw; --y: -32vh; animation-delay: .08s; }
        .anniversary-particle-3 { --x: -30vw; --y: -25vh; animation-delay: .11s; }
        .anniversary-particle-4 { --x: 27vw; --y: -39vh; animation-delay: .14s; }
        .anniversary-particle-5 { --x: -48vw; --y: -5vh; animation-delay: .17s; }
        .anniversary-particle-6 { --x: 47vw; --y: -8vh; animation-delay: .20s; }
        .anniversary-particle-7 { --x: -38vw; --y: 18vh; animation-delay: .23s; }
        .anniversary-particle-8 { --x: 42vw; --y: 21vh; animation-delay: .26s; }
        .anniversary-particle-9 { --x: -25vw; --y: 33vh; animation-delay: .29s; }
        .anniversary-particle-10 { --x: 30vw; --y: 34vh; animation-delay: .32s; }
        .anniversary-particle-11 { --x: -14vw; --y: -40vh; animation-delay: .35s; }
        .anniversary-particle-12 { --x: 15vw; --y: -37vh; animation-delay: .38s; }
        .anniversary-particle-13 { --x: -50vw; --y: 28vh; animation-delay: .41s; }
        .anniversary-particle-14 { --x: 50vw; --y: 29vh; animation-delay: .44s; }
        .anniversary-particle-15 { --x: -20vw; --y: 42vh; animation-delay: .47s; }
        .anniversary-particle-16 { --x: 19vw; --y: 43vh; animation-delay: .50s; }
        .anniversary-particle-17 { --x: -34vw; --y: 5vh; animation-delay: .53s; }
        .anniversary-particle-18 { --x: 35vw; --y: 7vh; animation-delay: .56s; }
        .anniversary-particle-19 { --x: -9vw; --y: -28vh; animation-delay: .59s; }
        .anniversary-particle-20 { --x: 9vw; --y: -30vh; animation-delay: .62s; }
        .anniversary-particle-21 { --x: -45vw; --y: -20vh; animation-delay: .65s; }
        .anniversary-particle-22 { --x: 45vw; --y: -19vh; animation-delay: .68s; }
        .anniversary-particle-23 { --x: -44vw; --y: 40vh; animation-delay: .71s; }
        .anniversary-particle-24 { --x: 43vw; --y: 39vh; animation-delay: .74s; }
        .anniversary-particle-25 { --x: -5vw; --y: 38vh; animation-delay: .77s; }
        .anniversary-particle-26 { --x: 6vw; --y: 40vh; animation-delay: .80s; }
        .anniversary-particle-27 { --x: -16vw; --y: 18vh; animation-delay: .83s; }
        .anniversary-particle-28 { --x: 17vw; --y: 20vh; animation-delay: .86s; }

        @keyframes anniversary-fade-in {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes anniversary-glow-pulse {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(0.95);
          }

          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        @keyframes anniversary-light-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.1);
          }

          15% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(28);
          }
        }

        @keyframes anniversary-card-enter {
          0% {
            opacity: 0;
            transform: translateY(35px) scale(0.72);
          }

          55% {
            opacity: 1;
            transform: translateY(-5px) scale(1.04);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes anniversary-card-glow {
          0%,
          100% {
            box-shadow:
              0 0 50px rgba(168,85,247,0.25),
              0 0 100px rgba(34,211,238,0.08);
          }

          50% {
            box-shadow:
              0 0 75px rgba(168,85,247,0.4),
              0 0 130px rgba(34,211,238,0.16);
          }
        }

        @keyframes anniversary-title-enter {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.88);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes anniversary-days-enter {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }

          65% {
            opacity: 1;
            transform: scale(1.08);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes anniversary-star-pop {
          0% {
            opacity: 0;
            transform: scale(0) rotate(-90deg);
          }

          70% {
            opacity: 1;
            transform: scale(1.25) rotate(10deg);
          }

          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes anniversary-star-float {
          0%,
          100% {
            opacity: 0.55;
            transform: translateY(0) scale(0.9);
          }

          50% {
            opacity: 1;
            transform: translateY(-5px) scale(1.2);
          }
        }

        @keyframes anniversary-particle-burst {
          0% {
            opacity: 0;
            transform:
              translate(-50%, -50%)
              scale(0);
          }

          15% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform:
              translate(
                calc(-50% + var(--x)),
                calc(-50% + var(--y))
              )
              scale(1);
          }
        }

        @media (max-width: 640px) {

          .firework span {
            width: 2px;
            height: 48px;
          }

          .firework-1 {
            left: 12%;
            top: 22%;
          }

          .firework-2 {
            right: 12%;
            top: 32%;
          }

          .firework-3 {
            left: 50%;
            top: 16%;
          }

          .firework-4 {
            left: 7%;
            top: 50%;
          }

          .firework-5 {
            right: 7%;
            top: 50%;
          }

          .anniversary-card {
            padding-left: 1.25rem;
            padding-right: 1.25rem;
          }

          .anniversary-particle {
            width: 3px;
            height: 3px;
          }
        }

      `}</style>

    </main>
  );
}