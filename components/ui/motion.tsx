"use client"

import { motion, type HTMLMotionProps } from "framer-motion"
import type { ReactNode } from "react"

type MotionDivProps = HTMLMotionProps<"div"> & {
  children: ReactNode
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function FadeIn({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function FadeInStagger({ children, ...props }: MotionDivProps) {
  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} {...props}>
      {children}
    </motion.div>
  )
}

export function FadeInStaggerItem({ children, ...props }: MotionDivProps) {
  return (
    <motion.div variants={staggerItem} {...props}>
      {children}
    </motion.div>
  )
}

export function ScaleIn({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function SlideIn({
  children,
  direction = "left",
  ...props
}: MotionDivProps & { direction?: "left" | "right" | "up" | "down" }) {
  const directionOffset = {
    left: { x: -30, y: 0 },
    right: { x: 30, y: 0 },
    up: { x: 0, y: -30 },
    down: { x: 0, y: 30 },
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
}

export { motion }
