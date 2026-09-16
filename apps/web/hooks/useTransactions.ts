import { Transaction } from "../types";
import axios, { AxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { BACKEND_URL } from "../app/config";

export const useTransactions = () => {
  const { getToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    const token = await getToken();
    const baseurl = BACKEND_URL;

    if (!token) return;

    try {
      const response = await axios.get(`${baseurl}/payment/transactions`,{
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = response.data;
      setTransactions(data.transactions);
    } catch (error) {
      if (error instanceof AxiosError) {
        setError(error.response?.data.message || error.message);
      } else if (error instanceof Error) {
        setError(error.message || "An error occurred");
      } else {
        setError("An error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, isLoading, error };
};