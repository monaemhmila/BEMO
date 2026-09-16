import { TPack } from "./PackCard";
import axios from "axios";
import { PacksClient } from "./PacksClient";
import { BACKEND_URL } from "../app/config";

async function getPacks(): Promise<TPack[]> {
    const baseurl = BACKEND_URL;

  const res = await axios.get(`${baseurl}/pack/bulk`);
  return res.data.packs ?? [];
}

export async function Packs() {
  const packs = await getPacks();

  return <PacksClient packs={packs} />;
}