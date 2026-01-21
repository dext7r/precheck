"use client"

import { motion } from "framer-motion"
import { ExternalLink } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

interface TechStackSectionProps {
  dict: Dictionary
}

const stack = [
  {
    name: "Next.js 16",
    category: "Framework",
    url: "https://nextjs.org",
    icon: (
      <svg viewBox="0 0 180 180" fill="none" className="h-5 w-5">
        <mask
          id="mask0"
          style={{ maskType: "alpha" }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="180"
          height="180"
        >
          <circle cx="90" cy="90" r="90" fill="black" />
        </mask>
        <g mask="url(#mask0)">
          <circle cx="90" cy="90" r="87" fill="black" stroke="currentColor" strokeWidth="6" />
          <path
            d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z"
            fill="url(#paint0)"
          />
          <rect x="115" y="54" width="12" height="72" fill="url(#paint1)" />
        </g>
        <defs>
          <linearGradient
            id="paint0"
            x1="109"
            y1="116.5"
            x2="144.5"
            y2="160.5"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint1"
            x1="121"
            y1="54"
            x2="120.799"
            y2="106.875"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    name: "React 19",
    category: "UI Library",
    url: "https://react.dev",
    icon: (
      <svg viewBox="-11.5 -10.232 23 20.463" className="h-5 w-5 text-[#61DAFB]">
        <circle r="2.05" fill="currentColor" />
        <g stroke="currentColor" fill="none" strokeWidth="1">
          <ellipse rx="11" ry="4.2" />
          <ellipse rx="11" ry="4.2" transform="rotate(60)" />
          <ellipse rx="11" ry="4.2" transform="rotate(120)" />
        </g>
      </svg>
    ),
  },
  {
    name: "TypeScript",
    category: "Language",
    url: "https://typescriptlang.org",
    icon: (
      <svg viewBox="0 0 128 128" className="h-5 w-5">
        <rect fill="#3178c6" width="128" height="128" rx="6" />
        <path
          fill="#fff"
          d="M82.7 87.7V97c1.8.9 4 1.6 6.4 2.1 2.4.5 4.9.7 7.5.7 2.5 0 4.9-.3 7.2-.8 2.3-.5 4.3-1.4 6-2.5 1.7-1.2 3.1-2.7 4.1-4.6 1-1.9 1.5-4.2 1.5-6.9 0-2-.3-3.7-.9-5.2-.6-1.5-1.4-2.8-2.5-4-1.1-1.2-2.4-2.2-3.9-3.1-1.5-.9-3.2-1.8-5-2.6-1.4-.6-2.6-1.2-3.6-1.8-1-.6-1.9-1.2-2.6-1.8-.7-.6-1.2-1.3-1.6-2-.4-.7-.5-1.5-.5-2.4 0-.8.2-1.6.5-2.2.4-.7.9-1.2 1.5-1.7.7-.5 1.5-.8 2.4-1.1.9-.2 2-.4 3.1-.4 .8 0 1.6.1 2.5.2.9.1 1.7.3 2.6.5.8.3 1.6.7 2.3 1.2V51.6c-1.5-.6-3.1-1-4.9-1.3-1.8-.3-3.8-.4-6-.4-2.5 0-4.9.3-7.1.9-2.2.6-4.2 1.5-5.9 2.7-1.7 1.2-3 2.7-4 4.5-1 1.8-1.5 3.9-1.5 6.3 0 3.3.9 6.1 2.8 8.3 1.9 2.3 4.7 4.2 8.5 5.9 1.5.6 2.8 1.3 4.1 1.9 1.2.6 2.3 1.3 3.2 2 .9.7 1.6 1.4 2.1 2.2.5.8.7 1.7.7 2.7 0 .8-.2 1.5-.5 2.2-.3.6-.8 1.2-1.5 1.7-.6.5-1.4.8-2.4 1.1-1 .2-2.1.4-3.4.4-2.2 0-4.4-.4-6.5-1.2-2.1-.8-4-2-5.7-3.6zM49.3 55.4h13.9v-8.4H28.4v8.4h13.8V97h7.1V55.4z"
        />
      </svg>
    ),
  },
  {
    name: "Tailwind CSS",
    category: "Styling",
    url: "https://tailwindcss.com",
    icon: (
      <svg viewBox="0 0 54 33" className="h-5 w-5 text-[#38BDF8]">
        <path
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.514-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0zM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.514-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2z"
        />
      </svg>
    ),
  },
  {
    name: "shadcn/ui",
    category: "Components",
    url: "https://ui.shadcn.com",
    icon: (
      <svg viewBox="0 0 256 256" className="h-5 w-5">
        <rect width="256" height="256" fill="none" />
        <line
          x1="208"
          y1="128"
          x2="128"
          y2="208"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="16"
        />
        <line
          x1="192"
          y1="40"
          x2="40"
          y2="192"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="16"
        />
      </svg>
    ),
  },
  {
    name: "Framer Motion",
    category: "Animation",
    url: "https://www.framer.com/motion",
    icon: (
      <svg viewBox="0 0 14 21" className="h-5 w-5">
        <path d="M0 0h14v7H7zm0 7h7l7 7H7v7l-7-7z" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Lucide",
    category: "Icons",
    url: "https://lucide.dev",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 text-[#F56565]"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m4.93 4.93 4.24 4.24" />
        <path d="m14.83 9.17 4.24-4.24" />
        <path d="m14.83 14.83 4.24 4.24" />
        <path d="m9.17 14.83-4.24 4.24" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    name: "Prisma",
    category: "ORM",
    url: "https://prisma.io",
    icon: (
      <svg viewBox="0 0 159 194" className="h-5 w-5">
        <path
          fill="currentColor"
          d="M0 163.667L79.5 0l79.5 163.667-79.5 30.333z"
          fillRule="evenodd"
          clipRule="evenodd"
        />
        <path fill="hsl(var(--background))" d="M79.5 31.667L29 144.667l50.5 19.666 50.5-19.666z" />
      </svg>
    ),
  },
  {
    name: "PostgreSQL",
    category: "Database",
    url: "https://postgresql.org",
    icon: (
      <svg viewBox="0 0 128 128" className="h-5 w-5">
        <path
          fill="#336791"
          d="M117.5 59.8c-.8-.9-2-1.4-3.2-1.6-.8 0-1.6.2-2.4.5l-7.2 3c-.4.2-.8.2-1.2.1-.4-.1-.7-.4-.9-.7-2.8-5.2-6.4-10-10.5-14.2-2.4-2.5-5.1-4.7-8.1-6.4l-1.2-.7-.3-.2c.3-4.8.4-9.1-.2-11.5-1.5-6.3-4.1-10.3-8.3-12.8-3.7-2.2-8.1-2.4-12.7-2.4H59c-1.8 0-3.6.1-5.4.3-7.6.8-14.4 3.8-19.9 8.6-5.8 5.1-9.9 12.1-11.8 20.2-1.7 7.5-1.5 15 .6 22.3-2.9 3.7-5.3 7.8-7 12.1-2.7 6.6-3.8 13.6-3.5 20.5.3 6.6 2 12.8 5 18.3 3.3 6 8.1 10.8 14.1 13.8 5.2 2.6 11.1 3.6 17 2.9 4.1-.5 8.1-1.7 11.8-3.7 3.5 2.9 7.6 5.2 12 6.7 4.9 1.7 10.1 2.6 15.4 2.5h1c4.6-.1 9.2-.9 13.6-2.3 7.9-2.5 15-7.5 19.3-14.4 3.1-5 5.1-10.7 5.9-16.6.5-4.1.5-8.2 0-12.3l5.2-2.4c1-.5 1.9-1.2 2.5-2.2.9-1.5 1-3.3.2-4.9l-2.5-5.4c-.2-.4-.3-.9-.3-1.3 0-.5.1-.9.3-1.4l4.1-9.1c.6-1.4.6-2.9-.2-4.2zm-78.1 57.8c-5.1.6-10-.4-14.2-2.5-4.9-2.4-8.8-6.4-11.5-11.5-2.5-4.7-3.9-10.1-4.2-15.8-.3-6.1.7-12.3 3.1-18.2 1.4 4.6 3.8 9.1 6.5 13.2 2.8 4.2 6.2 8.1 10.2 11.4.7.6 1.1 1.5 1 2.4-.1 1-.6 2-1.5 2.8-1.7 1.6-3 3.5-3.9 5.7-1.5 3.4-1.9 7.2-1.3 10.9.6 4.1 2.5 7.8 5.4 10.8.5.5.9 1.1 1.4 1.6-2.2-.5-4.4-.5-6.4-.9zm39.9 4.8c-4.3.7-8.7.6-13-.2-3.7-.7-7.2-1.9-10.5-3.6-2.7-1.5-5.1-3.4-7.1-5.6 1.9-.1 3.7-.6 5.3-1.5 2.9-1.5 5.2-4 6.4-7 .3-.7.5-1.5.7-2.2.2-.8.3-1.6.4-2.4.1-1.3.1-2.5-.1-3.8-.2-1.3-.5-2.6-1-3.8-1.1-2.7-2.9-5-5.3-6.7-4.7-3.5-9.7-6.7-15-9.4l-.5-.3c-.6-.3-1.3-.5-2-.5-.7.1-1.3.4-1.7.9-.4.5-.6 1.2-.5 1.9.1.6.4 1.2.9 1.7l.2.2c4.9 4.8 9.6 10 13.7 15.5 1 1.4 1.6 3 1.8 4.7.1 1.1-.1 2.1-.5 3.1-.4.9-1.1 1.7-2 2.1-1.4.7-3 .7-4.5.4-.8-.2-1.6-.5-2.3-.9-.5-.3-1-.7-1.4-1.1-2.4-2.4-3.9-5.5-4.4-8.8-.5-3-.1-6.1 1.1-8.9.7-1.5 1.5-2.9 2.7-4.1.9-.9 1.2-2.3.8-3.5-.4-1.2-1.4-2.1-2.6-2.5-3.6-1.1-6.9-2.8-9.7-5.2-3.5-3-6.4-6.5-8.7-10.4-2.4-4-4.2-8.4-5.3-13-1.2-5-.9-10.4.9-15.3.8-2.4 2.1-4.7 3.6-6.7 1.6-2.1 3.5-4 5.6-5.5 1.9 8.5 4.1 16.2 9 22.9 4.1 5.6 9.8 9.7 16.3 12 .8.3 1.7.2 2.4-.3.7-.5 1.2-1.2 1.3-2.1.1-.9-.2-1.8-.8-2.4-.7-.6-1.5-1-2.4-1.1-5.3-1.8-9.8-5.3-13.1-9.9-4.5-6.2-6.1-13.3-8.2-22.8-.4-1.7-.8-3.4-1.2-5 1.9-1 4-1.8 6 0 0 0 0 0 0 0 0 0 0 0 0"
        />
      </svg>
    ),
  },
]

const demos = [
  { name: "Vercel", url: "https://next-starter-pro.vercel.app/" },
  { name: "Netlify", url: "https://next-starter-pro.netlify.app/" },
  { name: "Zeabur", url: "https://next-starter.zeabur.app/" },
  { name: "Fly.dev", url: "https://next-starter.fly.dev/" },
  { name: "Render", url: "https://next-starter-75xy.onrender.com/" },
]

const TechStackSection = ({ dict }: TechStackSectionProps) => {
  return (
    <section id="tech-stack" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center tracking-tight sm:text-4xl mb-16">
          {dict.techStack.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stack.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group relative p-4 bg-white rounded-lg shadow-md flex items-center space-x-4 hover:bg-primary/10 transition-colors duration-300"
              whileHover={{ scale: 1.05 }}
            >
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="absolute inset-0 rounded-lg animate-ping bg-primary/20" />
              </div>
              <div className="relative transition-transform duration-300 group-hover:scale-110 group-hover:text-primary">
                {item.icon}
              </div>
              <div className="relative">
                <h3 className="text-xl font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.category}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2"
                >
                  <span>{dict.techStack.visitWebsite}</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-4">{dict.techStack.liveDemos}</h3>
          <p className="text-gray-600 mb-8">{dict.techStack.liveDemosDescription}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {demos.map((demo) => (
              <motion.a
                key={demo.name}
                href={demo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <span className="font-medium">{demo.name}</span>
                <ExternalLink className="h-4 w-4" />
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export { TechStackSection }
export default TechStackSection
