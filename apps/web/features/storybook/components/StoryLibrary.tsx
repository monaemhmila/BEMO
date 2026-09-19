"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  BookOpen,
  Sparkles,
  Filter,
  Search,
  Download,
  Star,
  Clock,
  Loader2,
  Play,
  Trash2,
  MoreVertical,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import { handleImageError } from "@/components/ui/image-fallback";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { BACKEND_URL } from "../../../app/config";

interface Story {
  id: string;
  title: string;
  status: "Pending" | "Generating" | "Completed" | "Failed";
  createdAt: string;
  childName?: string;
  progress?: number;
  model: {
    name: string;
    thumbnail?: string;
  };
  pages: {
    imageUrl?: string;
    status: string;
  }[];
}

const STATUS_FILTERS: (Story["status"] | "All")[] = ["All", "Completed", "Generating", "Failed"];

const STATUS_COLORS = {
  Pending: "bg-muted text-muted-foreground",
  Generating: "bg-buttercup/20 text-violet-deep",
  Completed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-red-100 text-red-700",
};

export function StoryLibrary() {
  const router = useRouter();
  const { getToken } = useAuth();
  
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Story["status"] | "All">("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const token = await getToken?.();
        if (!token) return;

        const res = await axios.get(`${BACKEND_URL}/story/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStories(res.data.stories);
      } catch (error) {
        console.error("Failed to fetch stories", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();

    // Load favorites from localStorage
    const saved = typeof window !== "undefined" 
      ? localStorage.getItem("favoriteStories") 
      : null;
    if (saved) setFavorites(JSON.parse(saved));
  }, [getToken]);

  // Save favorites to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("favoriteStories", JSON.stringify(favorites));
    }
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this story?")) return;

    setDeleting(id);
    try {
      const token = await getToken?.();
      await axios.delete(`${BACKEND_URL}/story/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStories((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete story", error);
    } finally {
      setDeleting(null);
    }
  };

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const matchesSearch = story.title
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || story.status === statusFilter;
      const matchesFavorite = !showFavorites || favorites.includes(story.id);
      return matchesSearch && matchesStatus && matchesFavorite;
    });
  }, [stories, search, statusFilter, showFavorites, favorites]);

  const getStoryPreviewImage = (story: Story) => {
    const firstCompletedPage = story.pages.find(
      (p) => p.status === "Generated" && p.imageUrl
    );
    return firstCompletedPage?.imageUrl;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-violet-deep mb-2">
            Story Library
          </h1>
          <p className="text-muted-foreground">
            Your collection of personalized adventures
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/create-custom">
            <Button variant="outline" className="rounded-full gap-2">
              <PenLine className="w-4 h-4" /> Write Your Own Story
            </Button>
          </Link>
          <Link href="/storybook/create">
            <Button className="bg-primary text-white rounded-full gap-2">
              <Sparkles className="w-4 h-4" /> Create New Story
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted-foreground/15"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <Button
          variant={showFavorites ? "default" : "outline"}
          size="sm"
          className="rounded-full"
          onClick={() => setShowFavorites(!showFavorites)}
        >
          <Star
            className={`w-4 h-4 mr-1 ${showFavorites ? "fill-current" : ""}`}
          />
          Favorites
        </Button>

        <div className="relative flex-1 max-w-xs ml-auto">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stories..."
            className="pl-10"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </Card>

      {/* Stories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-96 bg-muted rounded-3xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-foreground/40 mx-auto mb-4" />
          <h3 className="text-2xl font-display text-violet-deep mb-2">
            {stories.length === 0 ? "No stories yet" : "No matching stories"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {stories.length === 0
              ? "Create your first AI-powered storybook"
              : "Try adjusting your filters"}
          </p>
          {stories.length === 0 && (
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/storybook/create">
                <Button className="rounded-full bg-primary text-white">
                  <Sparkles className="w-4 h-4 mr-2" /> Create Story
                </Button>
              </Link>
              <Link href="/create-custom">
                <Button variant="outline" className="rounded-full">
                  <PenLine className="w-4 h-4 mr-2" /> Write My Own Story
                </Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story) => (
            <div key={story.id} className="animate-in fade-in">
              <Card className="overflow-hidden border-border hover:shadow-xl transition-all group">
                {/* Preview Image */}
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {getStoryPreviewImage(story) ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={getStoryPreviewImage(story)}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-buttercup/15 to-blush/40">
                      {story.status === "Generating" ? (
                        <Loader2 className="w-12 h-12 text-buttercup animate-spin" />
                      ) : (
                        <span className="text-6xl">✨</span>
                      )}
                    </div>
                  )}

                  {/* Status badge */}
                  <div
                    className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium ${
                      STATUS_COLORS[story.status]
                    }`}
                  >
                    {story.status === "Generating" && (
                      <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                    )}
                    {story.status}
                    {story.progress !== undefined &&
                      story.status === "Generating" &&
                      ` ${story.progress}%`}
                  </div>

                  {/* Favorite button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(story.id);
                    }}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      favorites.includes(story.id)
                        ? "bg-buttercup text-white"
                        : "bg-white/80 text-muted-foreground hover:bg-white"
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        favorites.includes(story.id) ? "fill-current" : ""
                      }`}
                    />
                  </button>

                  {/* Play overlay for completed stories */}
                  {story.status === "Completed" && (
                    <Link
                      href={`/stories/${story.id}`}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-100 scale-75">
                        <Play className="w-6 h-6 text-violet-deep ml-1" />
                      </div>
                    </Link>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-display text-xl text-violet-deep mb-1 truncate">
                    {story.title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(story.createdAt).toLocaleDateString()}
                    {story.childName && ` • Starring ${story.childName}`}
                  </p>

                  <div className="flex gap-2 mt-4">
                    <Link href={`/stories/${story.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={
                          story.status === "Pending" ||
                          story.status === "Generating"
                        }
                      >
                        {story.status === "Generating" ? "Generating..." : "Read"}
                      </Button>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/stories/${story.id}`)}
                        >
                          <Play className="w-4 h-4 mr-2" /> Open
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(story.id)}
                          disabled={deleting === story.id}
                        >
                          {deleting === story.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StoryLibrary;

