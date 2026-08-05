"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function EnterPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const t = useTranslations("enter");

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const proceed = () => router.push("/choose-face");
    const onKey = () => proceed();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <main
      className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 cursor-pointer px-6 text-center"
      onClick={() => router.push("/choose-face")}
    >
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        className="font-chrome text-white text-lg sm:text-2xl tracking-wide max-w-xl"
      >
        YOU DIDN&apos;T FIND THIS. YOU WERE PULLED HERE.
      </motion.p>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 1, delay: 1.8 }}
        className="font-body text-white/60 text-sm"
      >
        {t("proceed")}
      </motion.span>
    </main>
  );
}
