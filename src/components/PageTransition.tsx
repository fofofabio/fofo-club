"use client";

import { motion } from "framer-motion";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration: 1,
          ease: [0.2, 0.8, 0.2, 1],
          when: "beforeChildren",
          staggerChildren: 0.1, // subtle stagger of inner motion elements
        },
      }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] } }}
    >
      {children}
    </motion.div>
  );
}
