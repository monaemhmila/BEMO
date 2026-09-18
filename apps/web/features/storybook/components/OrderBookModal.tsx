"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { trialUpdateEvent } from "@/hooks/use-trials";
import { BACKEND_URL } from "../../../app/config";

interface OrderSummary {
  id: string;
  orderNumber: string;
  storyId: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string | null;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
  story: {
    id: string;
    title: string;
    childName?: string | null;
    pdfUrl?: string | null;
  };
}

interface OrderBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  story: {
    id: string;
    title: string;
    childName?: string;
  };
}

interface FormState {
  customerName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

const EMPTY_FORM: FormState = {
  customerName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
};

const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

type Step = "form" | "summary" | "success";

function validateForm(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.customerName.trim().length < 2) {
    errors.customerName = "Please enter your full name.";
  }
  if (!PHONE_REGEX.test(form.phone.trim())) {
    errors.phone = "Please enter a valid phone number.";
  }
  if (form.address.trim().length < 5) {
    errors.address = "Please enter your delivery address.";
  }
  if (form.city.trim().length < 2) {
    errors.city = "Please enter your city.";
  }

  return errors;
}

export function OrderBookModal({ open, onOpenChange, story }: OrderBookModalProps) {
  const { getToken } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [price, setPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [priceLoading, setPriceLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);

  // Reset flow and load order config/pending order whenever the modal opens
  useEffect(() => {
    if (!open) return;

    setStep("form");
    setForm(EMPTY_FORM);
    setErrors({});
    setServerError(null);
    setOrder(null);

    let cancelled = false;

    const init = async () => {
      const token = await getToken?.();
      if (!token) return;

      setPriceLoading(true);

      try {
        const configRes = await axios.get(`${BACKEND_URL}/orders/config`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setPrice(configRes.data.price);
          setCurrency(configRes.data.currency || "USD");
        }
      } catch {
        // Non-fatal – backend remains authoritative for the price
      } finally {
        if (!cancelled) setPriceLoading(false);
      }

      try {
        const pendingRes = await axios.get(
          `${BACKEND_URL}/orders/pending/${story.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!cancelled && pendingRes.data?.order) {
          setOrder(pendingRes.data.order);
          setStep("success");
        }
      } catch {
        // Non-fatal
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [open, story.id, getToken]);

  const handleSubmitForm = (e?: React.FormEvent) => {
    e?.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setServerError(null);
      setStep("summary");
    }
  };

  const handleConfirm = useCallback(async () => {
    if (submitting) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const token = await getToken?.();
      if (!token) {
        setServerError("Please sign in to place your order.");
        return;
      }

      const res = await axios.post(
        `${BACKEND_URL}/orders`,
        {
          storyId: story.id,
          customerName: form.customerName.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postalCode: form.postalCode.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrder(res.data.order);
      setStep("success");
      // A printed book order grants one extra free story generation
      trialUpdateEvent.dispatchEvent(new CustomEvent("trialUpdate"));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const existing = error.response?.data?.order;

        // Duplicate submission – surface the existing confirmation
        if (status === 409 && existing) {
          setOrder(existing);
          setStep("success");
          return;
        }

        setServerError(
          error.response?.data?.message || "Something went wrong. Please try again."
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, story.id, form, getToken]);

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {serverError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Order My Book</DialogTitle>
              <DialogDescription>
                Have a printed copy of “{story.title}
                {story.childName ? ` starring ${story.childName}` : ""}” delivered to
                your door. Pay cash when it arrives.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitForm} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="customerName">Full name</Label>
                <Input
                  id="customerName"
                  placeholder="Parent or child’s full name"
                  value={form.customerName}
                  onChange={(e) => setField("customerName", e.target.value)}
                  aria-invalid={!!errors.customerName}
                />
                {errors.customerName && (
                  <p className="text-sm text-red-600">{errors.customerName}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Delivery address</Label>
                <Textarea
                  id="address"
                  placeholder="Street, building, apartment…"
                  rows={3}
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  aria-invalid={!!errors.address}
                />
                {errors.address && (
                  <p className="text-sm text-red-600">{errors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    aria-invalid={!!errors.city}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-600">{errors.city}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="postalCode">Postal code (optional)</Label>
                  <Input
                    id="postalCode"
                    placeholder="Postal / ZIP"
                    value={form.postalCode}
                    onChange={(e) => setField("postalCode", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  Cash on Delivery · No online payment
                </div>
                <div className="font-semibold text-stone-900">
                  {priceLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : price !== null ? (
                    formatMoney(price)
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </form>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" onClick={handleSubmitForm}>
                Continue to Summary
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "summary" && (
          <>
            <DialogHeader>
              <DialogTitle>Review Your Order</DialogTitle>
              <DialogDescription>
                Confirm your details and pay cash on delivery.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="rounded-lg border border-stone-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Package className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">{story.title}</p>
                    <p className="text-sm text-stone-500">
                      Hardcover storybook
                      {story.childName ? ` · For ${story.childName}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-sm">
                  <span className="text-stone-600">Price</span>
                  <span className="font-semibold text-stone-900">
                    {price !== null ? formatMoney(price) : "—"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-stone-200 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-stone-900">
                  <MapPin className="size-4 text-stone-500" />
                  Delivery details
                </div>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <dt className="text-stone-500">Name</dt>
                  <dd className="text-stone-800">{form.customerName.trim()}</dd>
                  <dt className="text-stone-500">Phone</dt>
                  <dd className="text-stone-800">{form.phone.trim()}</dd>
                  <dt className="text-stone-500">Address</dt>
                  <dd className="text-stone-800">{form.address.trim()}</dd>
                  <dt className="text-stone-500">City</dt>
                  <dd className="text-stone-800">
                    {form.city.trim()}
                    {form.postalCode.trim()
                      ? `, ${form.postalCode.trim()}`
                      : ""}
                  </dd>
                </dl>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <Truck className="size-4" />
                Payment method: Cash on Delivery
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setStep("form")}
                disabled={submitting}
              >
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Placing order…
                  </>
                ) : (
                  "Confirm Order"
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && order && (
          <>
            <DialogHeader>
              <div className="flex justify-center">
                <CheckCircle2 className="size-14 text-emerald-500" />
              </div>
              <DialogTitle className="text-center">
                Order Confirmed!
              </DialogTitle>
              <DialogDescription className="text-center">
                Your book is on its way to you. Pay cash when it arrives.
                You also unlocked 1 extra free story generation!
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="rounded-lg border border-stone-200 p-4 text-center">
                <p className="text-sm text-stone-500">Order number</p>
                <p className="mt-1 font-mono text-xl font-bold text-stone-900">
                  {order.orderNumber}
                </p>
              </div>

              <div className="rounded-lg border border-stone-200 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Book</span>
                  <span className="font-medium text-stone-900">
                    {order.story.title}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-stone-600">Total</span>
                  <span className="font-semibold text-stone-900">
                    {formatMoney(order.totalAmount)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-stone-600">Deliver to</span>
                  <span className="font-medium text-stone-900">
                    {order.city}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-stone-600">Payment</span>
                  <span className="font-medium text-emerald-700">
                    Cash on Delivery
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default OrderBookModal;