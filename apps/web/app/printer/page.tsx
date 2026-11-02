"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Loader2, Printer, RefreshCw } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { BACKEND_URL } from "../config";

interface QueueOrder {
  id: string;
  orderNumber: string;
  printedAt?: string | null;
  pdfReady: boolean;
  story: { id: string; title: string };
}

interface AuditLog {
  id: string;
  orderNumber: string;
  title: string;
  action: string;
  reason?: string | null;
  actorName: string;
  createdAt: string;
}

async function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PrinterPage() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const [ready, setReady] = useState<QueueOrder[]>([]);
  const [printed, setPrinted] = useState<QueueOrder[]>([]);
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [view, setView] = useState<"ready" | "printed">("ready");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const knownReadyIds = useRef<Set<string> | null>(null);

  const headers = useCallback(async () => ({ Authorization: `Bearer ${await getToken()}` }), [getToken]);

  const load = useCallback(async (quiet = false) => {
    try {
      const auth = await headers();
      const [readyResponse, printedResponse, historyResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/printer/queue?view=ready`, { headers: auth }),
        axios.get(`${BACKEND_URL}/printer/queue?view=printed`, { headers: auth }),
        axios.get(`${BACKEND_URL}/printer/history`, { headers: auth }),
      ]);
      const nextReady = readyResponse.data.orders || [];
      setReady(nextReady);
      setPrinted(printedResponse.data.orders || []);
      setHistory(historyResponse.data.logs || []);
      setLastRefresh(new Date());

      const previous = knownReadyIds.current;
      const current = new Set<string>(nextReady.map((order: QueueOrder) => order.id));
      if (previous && [...current].some((id) => !previous.has(id))) {
        toast.success("A new confirmed order is ready to print.");
      }
      knownReadyIds.current = current;
    } catch (error) {
      if (!quiet) {
        const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
        toast.error(message || "Could not load the printer queue.");
      }
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    void load();
    const timer = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(timer);
  }, [isLoaded, user, load]);

  const downloadPdf = async (order: QueueOrder, openToPrint = false) => {
    setWorkingId(order.id);
    try {
      const auth = await headers();
      const response = await axios.get(`${BACKEND_URL}/printer/orders/${order.id}/pdf`, { headers: auth, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      if (openToPrint) {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        await saveBlob(new Blob([response.data], { type: "application/pdf" }), `${order.orderNumber}-${order.story.title.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
      }
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(message || "This PDF is not ready yet.");
    } finally {
      setWorkingId(null);
    }
  };

  const downloadAll = async () => {
    const printable = ready.filter((order) => order.pdfReady);
    for (const order of printable) await downloadPdf(order);
    if (!printable.length) toast.error("There are no print-ready PDFs.");
  };

  const markPrinted = async (order: QueueOrder) => {
    if (!order.pdfReady) {
      toast.error("Wait until the PDF is print-ready.");
      return;
    }
    if (!confirm(`Mark ${order.orderNumber} as printed?`)) return;
    setWorkingId(order.id);
    try {
      const auth = await headers();
      await axios.post(`${BACKEND_URL}/printer/orders/${order.id}/print`, { action: "PRINTED" }, { headers: auth });
      toast.success("Order marked as printed.");
      await load(true);
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(message || "Could not mark the order printed.");
    } finally {
      setWorkingId(null);
    }
  };

  const requestReprint = async (order: QueueOrder) => {
    const reason = window.prompt("Why does this order need to be reprinted?");
    if (!reason?.trim()) return;
    setWorkingId(order.id);
    try {
      const auth = await headers();
      await axios.post(`${BACKEND_URL}/printer/orders/${order.id}/print`, { action: "REPRINT_REQUESTED", reason: reason.trim() }, { headers: auth });
      toast.success("Reprint request added to the queue.");
      await load(true);
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(message || "Could not request a reprint.");
    } finally {
      setWorkingId(null);
    }
  };

  if (isLoaded && !user) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">Please sign in to access the printer portal.</main>;
  }

  const visible = view === "ready" ? ready : printed;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600"><Printer className="h-6 w-6" /></div>
            <div><h1 className="text-xl font-bold">Print queue</h1><p className="text-xs text-white/45">Signed in as {user?.primaryEmailAddress?.emailAddress}</p></div>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/45">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Online</span>
            <span>{lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Checking…"}</span>
            <button onClick={() => void load()} className="rounded-lg bg-white/10 p-2 hover:bg-white/15" aria-label="Refresh queue"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button onClick={() => setView("ready")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === "ready" ? "bg-purple-600" : "bg-white/10 text-white/60"}`}>Ready ({ready.length})</button>
            <button onClick={() => setView("printed")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === "printed" ? "bg-purple-600" : "bg-white/10 text-white/60"}`}>Printed ({printed.length})</button>
          </div>
          {view === "ready" && <button onClick={() => void downloadAll()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"><Download className="h-4 w-4" /> Download all ready PDFs</button>}
        </div>

        <section className="space-y-3">
          {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-white/35">{view === "ready" ? "No confirmed orders are waiting to print." : "No printed orders yet."}</div> : visible.map((order) => (
            <article key={order.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="font-mono text-xs font-bold text-purple-300">{order.orderNumber}</p><h2 className="mt-1 truncate font-bold text-white">{order.story.title}</h2>{view === "ready" && <p className={`mt-1 text-xs ${order.pdfReady ? "text-emerald-300" : "text-amber-300"}`}>{order.pdfReady ? "PDF ready" : "PDF still generating"}</p>}</div>
              <div className="flex flex-wrap gap-2">
                <button disabled={workingId === order.id || (view === "ready" && !order.pdfReady)} onClick={() => void downloadPdf(order)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-4 w-4" /> Download PDF</button>
                {view === "ready" ? <><button disabled={workingId === order.id || !order.pdfReady} onClick={() => void downloadPdf(order, true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold disabled:opacity-40"><ExternalLink className="h-4 w-4" /> Open to print</button><button disabled={workingId === order.id} onClick={() => void markPrinted(order)} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold disabled:opacity-40">{workingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Done</button></> : <button disabled={workingId === order.id} onClick={() => void requestReprint(order)} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold disabled:opacity-40">Request reprint</button>}
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 font-bold">Print history</h2>
          <div className="space-y-2 text-xs text-white/55">{history.length === 0 ? <p>No print activity yet.</p> : history.slice(0, 20).map((log) => <div key={log.id} className="flex flex-wrap gap-x-2 gap-y-1 border-b border-white/5 pb-2"><span className="font-mono text-purple-300">{log.orderNumber}</span><span>{log.title}</span><span className="text-white/35">{log.action.replaceAll("_", " ")}</span>{log.reason && <span className="text-amber-300/70">— {log.reason}</span>}<span className="ml-auto text-white/30">{new Date(log.createdAt).toLocaleString()}</span></div>)}</div>
        </section>
      </div>
    </main>
  );
}
