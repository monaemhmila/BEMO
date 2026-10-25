"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  BookOpen,
  Loader2,
  Sparkles,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  PenLine,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { BACKEND_URL } from "../../config";

interface StorySummary {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  childName?: string;
  pageCount?: number;
  heroName?: string;
  coverImage?: string | null;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  subtotalAmount: number;
  quantity: number;
  discountPercent: number;
  gameDiscountPercent?: number;
  currency: string;
  city: string;
  createdAt: string;
  story: {
    id: string;
    title: string;
    childName?: string | null;
  };
}

const ORDER_STEPS = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

const ORDER_LABELS: Record<string, string> = {
  PENDING: "Order received",
  PROCESSING: "Being prepared",
  SHIPPED: "On the way",
  DELIVERED: "Delivered",
};

function orderStatusIcon(status: string) {
  if (status === "DELIVERED") return <CheckCircle2 className="w-3.5 h-3.5" />;
  if (status === "SHIPPED") return <Truck className="w-3.5 h-3.5" />;
  if (status === "PROCESSING") return <Package className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
}

/** Visual progress of an order: received → preparing → shipped → delivered. */
function OrderProgress({ status }: { status: string }) {
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
        <XCircle className="h-4 w-4" /> Cancelled
      </span>
    );
  }

  const current = ORDER_STEPS.indexOf(status as (typeof ORDER_STEPS)[number]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        {ORDER_STEPS.map((step, i) => (
          <div key={step} className="flex items-center">
            <div
              className={`h-4 w-4 rounded-full transition-colors ${
                i <= current ? "bg-buttercup/100" : "bg-muted"
              } ${i === current ? "ring-4 ring-buttercup/40" : ""}`}
            />
            {i < ORDER_STEPS.length - 1 && (
              <div className={`h-1 w-10 rounded ${i < current ? "bg-buttercup" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>
      <span className="inline-flex items-center gap-2 text-sm font-bold text-violet-deep">
        {orderStatusIcon(status)}
        {ORDER_LABELS[status] ?? status}
      </span>
    </div>
  );
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
  Pending: "bg-muted text-muted-foreground",
  Generating: "bg-buttercup/20 text-violet-deep",
  Completed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-red-100 text-red-700",
};

export default function StorybookDashboardPage() {
  const { getToken, user } = useAuth();
  const [stats, setStats] = useState<StorybookStats>(EMPTY_STATS);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken?.();
        if (!token) return;

        const [statsResponse, ordersResponse] = await Promise.allSettled([
          axios.get(`${BACKEND_URL}/storybook/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BACKEND_URL}/orders`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        // Independent handling: a failing orders call shouldn't hide the stats.
        if (statsResponse.status === "fulfilled") {
          setStats(statsResponse.value.data);
        } else {
          console.warn("Storybook stats failed", statsResponse.reason);
          setStats(EMPTY_STATS);
        }

        if (ordersResponse.status === "fulfilled") {
          setOrders(ordersResponse.value.data.orders || []);
        } else {
          console.warn("Orders failed to load", ordersResponse.reason);
          setOrders([]);
        }
      } catch (error) {
        console.error("Unable to load storybook stats", error);
        setStats(EMPTY_STATS);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [getToken, user]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-violet-deep">
          My Books
        </h1>
      </header>

      {/* My Orders */}
      <section>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-white via-blush/20 to-buttercup/15 p-0 shadow-lg shadow-primary/5">
          <div className="mb-6 bg-gradient-to-r from-violet-deep via-primary to-violet-ink p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/25">
                <Package className="h-8 w-8 text-buttercup" />
              </div>
              <div>
                <h2 className="font-display text-3xl font-bold">My Orders</h2>
                <p className="mt-2 text-base text-white/80">
                  See every printed book order, its status, and delivery progress in one place.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="mx-6 mb-6 rounded-2xl border-2 border-dashed border-primary/25 bg-white/70 py-10 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-primary" />
              <p className="text-muted-foreground font-medium">No orders yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Open a finished story and order your printed book.
              </p>
            </div>
          ) : (
            <div className="space-y-5 px-6 pb-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-5 rounded-3xl border border-primary/15 bg-gradient-to-r from-white to-blush/25 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md sm:flex-row sm:items-center"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-buttercup/40 shadow-sm ring-1 ring-primary/15">
                    <Package className="h-8 w-8 text-violet-deep" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="truncate text-lg font-bold text-violet-deep">{order.story.title}</h4>
                      <span className="font-mono text-xs text-muted-foreground">
                        {order.orderNumber}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-base text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleDateString()}
                      {` • ${order.quantity} ${order.quantity === 1 ? "copy" : "copies"} • ${order.currency} ${order.totalAmount.toFixed(2)}`}
                      {order.city ? ` • ${order.city}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <OrderProgress status={order.status} />
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          order.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {order.paymentStatus === "PAID" ? "Paid" : "Cash on Delivery"}
                      </span>
                      <Link href={`/stories/${order.story.id}`}>
                        <Button variant="outline" size="default" className="rounded-full border-primary/30 bg-white px-5 text-sm font-bold text-violet-deep hover:bg-buttercup/20">
                          View Book
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* My Stories */}
      <section id="recent-stories" className="scroll-mt-32">
        <Card className="p-6 border-border">
          <h2 className="font-display text-2xl font-bold text-violet-deep mb-6">
            My Stories
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stats.stories.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-paper/50 py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground/80 mb-2">
                No stories yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first personalized storybook!
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/storybook/create">
                  <Button className="bg-primary text-white rounded-full">
                    <Sparkles className="w-4 h-4 mr-2" /> Create Story
                  </Button>
                </Link>
                <Link href="/create-custom">
                  <Button variant="outline" className="rounded-full">
                    <PenLine className="w-4 h-4 mr-2" /> Write My Own Story
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {stats.stories.map((story) => (
                <article
                  key={story.id}
                  className="relative flex flex-col overflow-hidden rounded-3xl border border-border bg-paper shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <Link href={`/stories/${story.id}`} className="block">
                  <div className="aspect-square w-full overflow-hidden bg-gradient-to-br from-buttercup/20 to-blush/40">
                    {story.coverImage ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={story.coverImage}
                        alt={story.title}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : (
                      <BookOpen className="mx-auto mt-[42%] h-16 w-16 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 p-5">
                    <h4 className="line-clamp-2 font-display text-xl font-bold text-violet-deep">
                      {story.title}
                    </h4>
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(story.createdAt).toLocaleDateString()}
                      {story.childName && ` • ${story.childName}`}
                      {story.pageCount && ` • ${story.pageCount} pages`}
                    </p>
                  </div>
                  </Link>
                  <span
                    className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-medium ${
                      STATUS_COLORS[story.status] || STATUS_COLORS.Pending
                    }`}
                  >
                    {story.status}
                  </span>
                  <Link href={`/stories/${story.id}`} className="px-5 pb-5">
                    <Button className="w-full rounded-full bg-violet-deep text-white hover:bg-violet-ink">
                      View Preview
                    </Button>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
