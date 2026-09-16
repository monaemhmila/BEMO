import { env } from "../config/env";

class CleanLogger {
  info(msgOrObj: any, msg?: string) {
    this.log("INFO", msgOrObj, msg);
  }

  warn(msgOrObj: any, msg?: string) {
    this.log("WARN", msgOrObj, msg);
  }

  error(msgOrObj: any, msg?: string) {
    this.log("ERROR", msgOrObj, msg);
  }

  debug(msgOrObj: any, msg?: string) {
    if (env.LOG_LEVEL === "debug") {
      this.log("DEBUG", msgOrObj, msg);
    }
  }

  trace(msgOrObj: any, msg?: string) {
    if (env.LOG_LEVEL === "trace") {
      this.log("TRACE", msgOrObj, msg);
    }
  }

  fatal(msgOrObj: any, msg?: string) {
    this.log("FATAL", msgOrObj, msg);
  }

  private log(level: string, msgOrObj: any, msg?: string) {
    if (env.NODE_ENV === "test") return;

    let text = "";
    let extra = "";

    if (typeof msgOrObj === "string") {
      text = msgOrObj;
    } else if (msg) {
      text = msg;
      if (msgOrObj && typeof msgOrObj === "object") {
        const cleanObj = { ...msgOrObj };
        delete cleanObj.req;
        delete cleanObj.res;
        if (Object.keys(cleanObj).length > 0) {
          extra = ` ${JSON.stringify(cleanObj)}`;
        }
      }
    } else {
      text = JSON.stringify(msgOrObj);
    }

    const prefix = level === "ERROR" || level === "FATAL" ? "❌" : level === "WARN" ? "⚠️" : "ℹ️";
    console.log(`${prefix} [${level}] ${text}${extra}`);
  }
}

export const logger = new CleanLogger() as any;
export type Logger = typeof logger;


