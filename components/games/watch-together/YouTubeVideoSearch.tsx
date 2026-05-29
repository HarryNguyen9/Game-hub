"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Search, Link, Play, X } from "lucide-react";
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

  // Search modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-fetch oembed preview with debounce
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [urlInput]);

  // Focus search input when modal opens
  useEffect(() => {
    if (modalOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [modalOpen]);

  function handleLoadUrl() {
    const videoId = extractYouTubeVideoId(urlInput);
    if (!videoId) { setUrlError("Invalid YouTube URL or video ID."); return; }
    setUrlError(null);
    onSelect(videoId);
  }

  function openSearchModal() {
    setSelectedResult(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedResult(null);
  }

  function confirmSelected() {
    if (!selectedResult) return;
    onSelect(selectedResult.videoId);
    closeModal();
  }

  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedResult(null);
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

  const inputClass = "min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100";

  return (
    <>
      {/* Tab switcher */}
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          <button type="button" onClick={() => setTab("url")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-black transition-all ${tab === "url" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <Link size={14} /> URL
          </button>
          <button type="button" onClick={() => setTab("search")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-black transition-all ${tab === "search" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <Search size={14} /> Search
          </button>
        </div>

        {/* URL tab inline */}
        {tab === "url" && (
          <div className="grid gap-2">
            <div className="flex gap-2">
              <input type="text" value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleLoadUrl(); }}
                placeholder="YouTube URL or video ID"
                className={inputClass}
              />
              <Button onClick={handleLoadUrl} disabled={!urlInput.trim()}>
                <Play size={16} /> Load
              </Button>
            </div>
            {urlError && <p className="text-sm font-bold text-red-500">{urlError}</p>}
            {urlPreviewLoading && <p className="text-xs font-semibold text-slate-400">Loading preview...</p>}
            {urlPreview && urlPreviewVideoId && (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlPreview.thumbnail} alt={urlPreview.title} className="h-16 w-28 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-black text-slate-800">{urlPreview.title}</p>
                </div>
                <Button onClick={() => onSelect(urlPreviewVideoId)} className="shrink-0">
                  <Play size={14} /> Play
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Search tab — just a button to reopen modal */}
        {tab === "search" && (
          <button type="button" onClick={openSearchModal}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 hover:border-rose-200 hover:text-slate-600 transition">
            <Search size={15} />
            {searchResults.length > 0 ? `${searchResults.length} results — click to search again` : "Click to search YouTube..."}
          </button>
        )}
      </div>

      {/* Search modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">

            {/* Modal header */}
            <div className="shrink-0 border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-[#ff7a90]">Watch Together</p>
                  <h2 className="text-2xl font-black text-slate-900">Search YouTube</h2>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button type="button" onClick={closeModal} aria-label="Close"
                    className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                    <X size={14} />
                  </button>
                  <button type="button" onClick={confirmSelected} disabled={!selectedResult}
                    aria-label="Confirm selection"
                    className="grid size-7 place-items-center rounded-full bg-[#ff7a90] text-white shadow-sm transition hover:bg-[#ff6070] disabled:cursor-not-allowed disabled:opacity-40">
                    <Check size={14} />
                  </button>
                </div>
              </div>

              {/* Search bar inside modal */}
              <div className="mt-4 flex gap-2">
                <input ref={searchInputRef} type="text" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                  placeholder="Search YouTube videos..."
                  className={inputClass}
                />
                <Button onClick={handleSearch} disabled={!searchQuery.trim() || searchLoading}>
                  <Search size={16} /> {searchLoading ? "..." : "Search"}
                </Button>
              </div>
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto p-3">
              {searchError && <p className="px-2 py-3 text-sm font-bold text-red-500">{searchError}</p>}
              {searchLoading && (
                <div className="grid gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2 animate-pulse">
                      <div className="h-14 w-24 shrink-0 rounded-xl bg-slate-200" />
                      <div className="flex-1 grid gap-2">
                        <div className="h-3 rounded-full bg-slate-200 w-3/4" />
                        <div className="h-2 rounded-full bg-slate-100 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!searchLoading && searchResults.length > 0 && (
                <div className="grid gap-1">
                  {searchResults.map((item) => {
                    const isSelected = selectedResult?.videoId === item.videoId;
                    return (
                      <button key={item.videoId} type="button"
                        onClick={() => setSelectedResult(isSelected ? null : item)}
                        className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors ${isSelected ? "bg-rose-50 ring-1 ring-rose-200" : "hover:bg-slate-50"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbnail} alt={item.title} className="h-14 w-24 shrink-0 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-black text-slate-800">{item.title}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-400">{item.channelTitle}</p>
                        </div>
                        {isSelected && (
                          <span className="shrink-0 grid size-6 place-items-center rounded-full bg-[#ff7a90] text-white">
                            <Check size={12} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {!searchLoading && !searchError && searchResults.length === 0 && (
                <p className="py-8 text-center text-sm font-semibold text-slate-400">
                  {searchQuery.trim() ? "No results found." : "Search for a YouTube video above."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
