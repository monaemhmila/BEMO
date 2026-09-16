"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  BookOpen,
  Loader2,
  Download,
  Images,
  Volume2,
  Sparkles,
  Clock,
  ArrowRight,
  TrendingUp,
  Coins,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/use-credits";
import { BACKEND_URL } from "../../config";

interface StorySummary {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  childName?: string;
  pageCount?: number;
  heroName?: string;
}

interface StorybookStats {
  totalStories: number;
  completedStories: number;
  pagesRendered: number;
  audioNarrations: number;
  stories: StorySummary[];
}

const EMPTY_STATS: StorybookStats = {
  totalStories: 0,
  completedStories: 0,
  pagesRendered: 0,
  audioNarrations: 0,
  stories: [],
};

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-stone-100 text-stone-600",
  Generating: "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-red-100 text-red-700",
};

export default function StorybookDashboardPage() {
  const { getToken, user } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const [stats, setStats] = useState<StorybookStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken?.();
        if (!token) return;

        const { data } = await axios.get(`${BACKEND_URL}/storybook/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(data);
      } catch (error) {
        console.error("Unable to load storybook stats", error);
        setStats(EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [getToken, user]);

  const summaryCards = [
    {
      label: "Total Stories",
      value: stats.totalStories,
      icon: BookOpen,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      label: "Completed",
      value: stats.completedStories,
      icon: Images,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Pages Created",
      value: stats.pagesRendered,
      icon: Download,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Audio Narrations",
      value: stats.audioNarrations,
      icon: Volume2,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-amber-500">
              Dashboard
            </p>
            <h1 className="font-serif text-4xl font-bold text-stone-900 mt-1">
              My Storybook Studio
            </h1>
            <p className="text-stone-500 mt-2">
              Track your creations and start new adventures.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Credits Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full border border-amber-200">
              <Coins className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-amber-700">
                {creditsLoading ? "..." : credits}
              </span>
              <span className="text-amber-600 text-sm">credits</span>
            </div>
            <Link href="/storybook/create">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg shadow-amber-200 gap-2">
                <Sparkles className="w-4 h-4" />
                New Story
              </Button>
            </Link>
            <Link href="/stories">
              <Button variant="outline" className="rounded-full">
                View Library
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-5 border-stone-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">{card.label}</p>
                <div className={`p-2 rounded-xl ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-stone-900">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
                ) : (
                  card.value
                )}
              </p>
            </Card>
        ))}
      </section>

      {/* Quick Actions */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 border-stone-100 bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Create a New Story
              </h3>
              <p className="text-stone-600 text-sm mt-1">
                Turn your child into the hero of a personalized adventure.
              </p>
              <Link href="/storybook/create">
                <Button className="mt-4 bg-stone-900 text-white rounded-full">
                  Start Creating <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-stone-100 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Train a New Hero
              </h3>
              <p className="text-stone-600 text-sm mt-1">
                Upload photos to create a new character model.
              </p>
              <Link href="/train">
                <Button
                  variant="outline"
                  className="mt-4 rounded-full border-stone-300"
                >
                  Train Model <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* Recent Stories */}
      <section>
        <Card className="p-6 border-stone-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Recent Stories
            </h2>
            <Link
              href="/stories"
              className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : stats.stories.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-stone-300 mb-4" />
              <h3 className="text-lg font-medium text-stone-700 mb-2">
                No stories yet
              </h3>
              <p className="text-stone-500 mb-4">
                Create your first personalized storybook!
              </p>
              <Link href="/storybook/create">
                <Button className="bg-stone-900 text-white rounded-full">
                  <Sparkles className="w-4 h-4 mr-2" /> Create Story
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.stories.map((story) => (
                <div
                  key={story.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-stone-900 truncate">
                      {story.title}
                    </h4>
                    <p className="text-sm text-stone-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(story.createdAt).toLocaleDateString()}
                      {story.childName && ` • ${story.childName}`}
                      {story.pageCount && ` • ${story.pageCount} pages`}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      STATUS_COLORS[story.status] || STATUS_COLORS.Pending
                    }`}
                  >
                    {story.status}
                  </span>
                  <Link href={`/stories/${story.id}`}>
                    <Button variant="ghost" size="sm" className="rounded-full">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
