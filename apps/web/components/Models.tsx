"use client";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { BACKEND_URL } from "../app/config";
import { Button } from "./ui/button";
import { handleImageError } from "./ui/image-fallback";

interface TModel {
  id: string;
  thumbnail: string | null;
  name: string;
  trainingStatus: "Generated" | "Pending" | "Failed";
  open?: boolean;
}

export function SelectModel({
  setSelectedModel,
  selectedModel,
}: {
  setSelectedModel: (model: string) => void;
  selectedModel?: string;
}) {
  const { getToken, isSignedIn } = useAuth();
  const [modelLoading, setModelLoading] = useState(true);
  const [models, setModels] = useState<TModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);
  const hasAutoSelected = useRef(false);

  const fetchModels = async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return;
    }

    if (!isSignedIn) {
      setModelLoading(false);
      return;
    }

    try {
      fetchingRef.current = true;
      setModelLoading(true);
      setError(null);

      const token = await getToken();

      if (!token) {
        setError("Authentication required. Please sign in.");
        setModelLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/models`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!isMounted.current) return;

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError("Authentication failed. Please sign in again.");
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.message || "Failed to load models");
        }
        return;
      }

      const data = await response.json();
      const fetchedModels = data.models || [];
      setModels(fetchedModels);

      // Auto-select first generated model if none selected (only once)
      if (!hasAutoSelected.current && !selectedModel && fetchedModels.length > 0) {
        const generatedModels = fetchedModels.filter(
          (m: TModel) => m.trainingStatus === "Generated"
        );
        if (generatedModels.length > 0) {
          hasAutoSelected.current = true;
          setSelectedModel(generatedModels[0].id);
        }
      }
    } catch {
      if (!isMounted.current) return;
      setError("Network error. Please check your connection.");
    } finally {
      fetchingRef.current = false;
      if (isMounted.current) {
        setModelLoading(false);
      }
    }
  };

  const fetchModelsRef = useRef(fetchModels);
  fetchModelsRef.current = fetchModels;

  useEffect(() => {
    isMounted.current = true;

    // Only fetch if signed in
    if (!isSignedIn) {
      setModelLoading(false);
      return;
    }

    fetchModelsRef.current();

    return () => {
      isMounted.current = false;
    };
  }, [isSignedIn]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // Show error state with retry button
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center p-12 rounded-lg border border-dashed border-red-200 bg-red-50/50">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-red-600 font-medium mb-2">Failed to load models</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchModels}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="md:space-y-1">
          <h2 className="md:text-2xl text-xl font-semibold tracking-tight">
            Select Model
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose an AI model to generate your images
          </p>
        </div>
        {models.find((x) => x.trainingStatus !== "Generated") && (
          <Badge variant="secondary" className="animate-pulse">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Training in progress
          </Badge>
        )}
      </div>

      {modelLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((_, i) => (
            <Card key={i} className="h-[220px] animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {models
            .filter((model) => model.trainingStatus === "Generated")
            .map((model) => (
              <motion.div key={model.id} variants={item}>
                <Card
                  className={cn(
                    "group relative max-w-96 overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer",
                    selectedModel === model.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedModel(model.id)}
                >
                  <div className="relative aspect-square">
                    {model.thumbnail ? (
                      <Image
                        src={model.thumbnail}
                        alt={`Thumbnail for ${model.name}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
                        <span className="text-4xl font-bold text-amber-600">
                          {model.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">
                          {model.name}
                        </h3>
                        {model.open && (
                          <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                            Public
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
        </motion.div>
      )}

      {!modelLoading && models.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center p-12 rounded-lg border border-dashed"
        >
          <Sparkles className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No models available</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Start by training a new model or check if your models have &quot;Generated&quot; status
          </p>
        </motion.div>
      )}
      
    </div>
  );
}