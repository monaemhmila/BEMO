"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  BookOpen,
  Loader2,
  Sparkles,
  Clock,
  ArrowRight,
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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold">
        <XCircle className="w-3.5 h-3.5" /> Cancelled
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
              className={`w-3 h-3 rounded-full transition-colors ${
                i <= current ? "bg-buttercup/100" : "bg-muted"
              } ${i === current ? "ring-4 ring-buttercup/40" : ""}`}
            />
            {i < ORDER_STEPS.length - 1 && (
              <div className={`w-7 h-0.5 rounded ${i < current ? "bg-buttercup" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-deep">
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

      {/* Quick Actions */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6 border-border bg-gradient-to-br from-buttercup/15 to-blush/40">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-violet-deep">
                Create a New Story
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Turn your child into the hero of a personalized adventure.
              </p>
              <Link href="/books">
                <Button className="mt-4 bg-primary text-white rounded-full">
                  Start Creating <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-gradient-to-br from-violet-50 to-fuchsia-50">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm">
              <PenLine className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-violet-deep">
                Write Your Own Story
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Describe any idea and watch it become a unique illustrated book.
              </p>
              <Link href="/create-custom">
                <Button className="mt-4 bg-violet-deep text-white rounded-full">
                  No Template <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-violet-deep">
                Order a Printed Book
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Turn any finished story into a hardcover book - each order also
                unlocks 1 extra free story.
              </p>
              <Button asChild variant="outline" className="mt-4 rounded-full border-border">
                <a href="#recent-stories">
                  Choose a Story <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* My Orders */}
      <section>
        <Card className="p-6 border-border">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-violet-deep">My Orders</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Track your printed storybooks from order to delivery.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-paper/50 py-10 text-center">
              <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">No orders yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Open a finished story and order your printed book.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-paper border border-border hover:bg-muted/70 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-buttercup/20 to-blush/40 flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-violet-deep truncate">{order.story.title}</h4>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {order.orderNumber}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleDateString()}
                      {` • ${order.currency} ${order.totalAmount.toFixed(2)}`}
                      {order.city ? ` • ${order.city}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <OrderProgress status={order.status} />
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          order.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {order.paymentStatus === "PAID" ? "Paid" : "Cash on Delivery"}
                      </span>
                      <Link href={`/stories/${order.story.id}`}>
                        <Button variant="ghost" size="sm" className="rounded-full text-xs">
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

      {/* Recent Stories */}
      <section id="recent-stories" className="scroll-mt-32">
        <Card className="p-6 border-border">
          <h2 className="font-display text-2xl font-bold text-violet-deep mb-6">
            Recent Stories
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
            <div className="space-y-3">
              {stats.stories.map((story) => (
                <div
                  key={story.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-paper hover:bg-muted transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-buttercup/20 to-blush/40 flex items-center justify-center shrink-0">
                    {story.coverImage ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={story.coverImage}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-violet-deep truncate">
                      {story.title}
                    </h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
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
