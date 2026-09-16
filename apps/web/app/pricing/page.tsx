"use client";

import { useState } from "react";
import { PlanType } from "../../types";
import { usePayment } from "../../hooks/usePayment";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Check, Star, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionPage() {
  const { handlePayment } = usePayment();
  const { isAuthenticated } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [billingLoading, setBillingLoading] = useState<PlanType | null>(null);

  const handlePlanSelect = async (plan: PlanType) => {
    if (!isAuthenticated) {
      // Redirect to login if needed, or show toast
      return;
    }
    setBillingLoading(plan);
    await handlePayment(plan);
    setBillingLoading(null);
  };

  const PLANS = [
    {
      type: PlanType.basic,
      name: "Starter",
      description: "Perfect for trying out the magic.",
      price: 19,
      credits: 200,
      popular: false,
      features: [
        "200 Credits / mo",
        "Train 1 Custom Character",
        "Create ~10 Stories",
        "Standard Speed",
        "Community Support",
      ],
    },
    {
      type: PlanType.premium,
      name: "Storyteller",
      description: "For parents who want infinite adventures.",
      price: 39,
      credits: 1000,
      popular: true,
      features: [
        "1000 Credits / mo",
        "Train 5 Custom Characters",
        "Create ~50 Stories",
        "Priority Generation (Fast)",
        "Export to PDF & Print Ready",
        "Priority Email Support",
      ],
    },
    {
      type: PlanType.premium, // Mapping to premium backend type for now, or add Enterprise type
      name: "Family Bundle",
      description: "The ultimate creative studio for families.",
      price: 99,
      credits: 3000,
      popular: false,
      features: [
        "3000 Credits / mo",
        "Train 15 Custom Characters",
        "Unlimited Stories",
        "Highest Speed (Flux Pro)",
        "Dedicated Account Manager",
        "Early Access to New Styles",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f6] pt-32 pb-20 px-4">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="outline" className="mb-4 border-amber-200 bg-amber-50 text-amber-700 px-3 py-1">
          <Sparkles className="w-3 h-3 mr-1" /> Simple, Transparent Pricing
        </Badge>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-6">
          Invest in a lifetime of imagination.
        </h1>
        <p className="text-lg text-stone-500">
          Turn your child into the hero of 1000+ stories. <br className="hidden md:block"/>
          Cancel anytime. No hidden fees.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mt-8 gap-4">
          <span className={`text-sm font-medium ${!annual ? "text-stone-900" : "text-stone-400"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`w-14 h-8 rounded-full p-1 transition-colors ${annual ? "bg-stone-900" : "bg-stone-200"}`}
          >
            <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${annual ? "translate-x-6" : "translate-x-0"}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? "text-stone-900" : "text-stone-400"}`}>
            Yearly <span className="text-amber-600 text-xs font-bold ml-1">(Save 20%)</span>
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative rounded-[2rem] p-8 border-2 flex flex-col h-full ${
              plan.popular 
                ? "bg-white border-amber-400 shadow-xl shadow-amber-100/50 scale-105 z-10" 
                : "bg-white border-stone-100 shadow-sm hover:border-stone-200"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                <Star className="w-3 h-3 fill-white" /> Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="font-serif text-2xl font-bold text-stone-900 mb-2">{plan.name}</h3>
              <p className="text-stone-500 text-sm h-10">{plan.description}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-stone-900">${annual ? Math.round(plan.price * 0.8) : plan.price}</span>
                <span className="text-stone-400">/month</span>
              </div>
              {annual && (
                <p className="text-xs text-emerald-600 font-medium mt-2">
                  Billed ${Math.round(plan.price * 0.8) * 12} yearly
                </p>
              )}
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-stone-600">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.popular ? "bg-amber-100 text-amber-600" : "bg-stone-100 text-stone-500"}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handlePlanSelect(plan.type)}
              disabled={billingLoading !== null}
              className={`w-full rounded-full h-12 font-semibold text-base ${
                plan.popular
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-white shadow-lg shadow-orange-200"
                  : "bg-stone-900 hover:bg-stone-800 text-white"
              }`}
            >
              {billingLoading === plan.type ? "Processing..." : "Get Started"}
            </Button>
            
            <p className="text-xs text-center text-stone-400 mt-4">
              7-day money-back guarantee
            </p>
          </motion.div>
        ))}
      </div>

      {/* FAQ / Trust Section */}
      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 border-t border-stone-200 pt-16">
        <div className="text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-stone-900">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-stone-900 mb-2">Secure Payments</h4>
          <p className="text-sm text-stone-500">Powered by Stripe & Razorpay. Your data is encrypted and safe.</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-stone-900">
            <Zap className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-stone-900 mb-2">Cancel Anytime</h4>
          <p className="text-sm text-stone-500">No lock-in contracts. Upgrade or downgrade whenever you want.</p>
        </div>
        <div className="text-center">
           <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-stone-900">
            <Star className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-stone-900 mb-2">Satisfaction Guarantee</h4>
          <p className="text-sm text-stone-500">Not happy with your first story? We&apos;ll refund you, no questions asked.</p>
        </div>
      </div>

    </div>
  );
}
