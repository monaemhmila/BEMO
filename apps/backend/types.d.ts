declare namespace Express {
    interface Request {
        userId?: string;
    }
}

declare module "arabic-reshaper" {
    const arabicReshaper: {
        convertArabic(value: string): string;
    };
    export = arabicReshaper;
}
