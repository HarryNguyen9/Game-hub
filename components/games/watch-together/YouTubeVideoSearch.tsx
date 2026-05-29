"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Play, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractYouTubeVideoId } from "@/lib/games/watch-together/utils";

type Tab = "url" | "search";

interface SearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface OembedResult {
  title: string;
  thumbnail: string;
}

export function YouTubeVideoSearch({ onSelect }: { onSelect: (videoId: string) => void }) {
  const [tab, setTab] = useState<Tab>("url");

  // URL tab state
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlPreview, setUrlPreview] = useState<OembedResult | null>(null);
  const [urlPreviewVideoId, setUrlPreviewVideoId] = useState<string | null>(null);
  const [urlPreviewLoading, setUrlPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Auto-fetch oembed preview with debounce when a valid video ID is detected
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const videoId = extractYouTubeVideoId(urlInput);
    if (!videoId) {
      setUrlPreview(null);
      setUrlPreviewVideoId(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setUrlPreviewLoading(true);
      setUrlPreview(null);
      try {
        const res = await fetch(`/api/youtube/oembed?videoId=${encodeURIComponent(videoId)}`);
        if (res.ok) {
          const data: OembedResult = await res.json();
          setUrlPreview(data);
          setUrlPreviewVideoId(videoId);
        } else {
          setUrlPreview(null);
          setUrlPreviewVideoId(null);
        }
      } catch {
        setUrlPreview(null);
        setUrlPreviewVideoId(null);
      } finally {
        setUrlPreviewLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [urlInput]);

  function handleLoadUrl() {
    const videoId = extractYouTubeVideoId(urlInput);
    if (!videoId) {
      setUrlError("Invalid YouTube URL or video ID.");
      return;
    }
    setUrlError(null);
    onSelect(videoId);
  }

  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSearchError((err as { error?: string }).error ?? "Search failed.");
        return;
      }
      const data: { items: SearchResult[] } = await res.json();
      setSearchResults(data.items ?? []);
    } catch {
      setSearchError("Network error. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      {/* Tab switcher */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-black transition-all ${
            tab === "url"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Link size={14} /> URL
        </button>
        <button
          type="button"
          onClick={() => setTab("search")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-black transition-all ${
            tab === "search"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Search size={14} /> Search
        </button>
      </div>

      {/* URL tab */}
      {tab === "url" && (
        <div className="grid gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleLoadUrl(); }}
              placeholder="YouTube URL or video ID"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
            <Button onClick={handleLoadUrl} disabled={!urlInput.trim()}>
              <Play size={16} /> Load
            </Button>
          </div>
          {urlError && <p className="text-sm font-bold text-red-500">{urlError}</p>}
          {urlPreviewLoading && (
            <p className="text-xs font-semibold text-slate-400">Loading preview...</p>
          )}
          {urlPreview && urlPreviewVideoId && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlPreview.thumbnail}
                alt={urlPreview.title}
                className="h-16 w-28 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-black text-slate-800">{urlPreview.title}</p>
              </div>
              <Button
                onClick={() => onSelect(urlPreviewVideoId)}
                className="shrink-0"
              >
                <Play size={14} /> Play
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Search tab */}
      {tab === "search" && (
        <div className="grid gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="Search YouTube videos..."
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
            <Button onClick={handleSearch} disabled={!searchQuery.trim() || searchLoading}>
              <Search size={16} /> {searchLoading ? "..." : "Search"}
            </Button>
          </div>
          {searchError && <p className="text-sm font-bold text-red-500">{searchError}</p>}
          {searchResults.length > 0 && (
            <div className="grid max-h-64 gap-2 overflow-y-auto">
              {searchResults.map((item) => (
                <button
                  key={item.videoId}
                  type="button"
                  onClick={() => onSelect(item.videoId)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2 text-left transition-colors hover:bg-slate-50 hover:border-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="h-14 w-24 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-black text-slate-800">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{item.channelTitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!searchLoading && !searchError && searchResults.length === 0 && searchQuery.trim() && (
            <p className="text-xs font-semibold text-slate-400">No results yet. Press Search to find videos.</p>
          )}
        </div>
      )}
    </div>
  );
}
