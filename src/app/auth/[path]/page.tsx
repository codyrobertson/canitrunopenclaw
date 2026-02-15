import { AuthView } from "@neondatabase/auth/react";
import type { Metadata } from "next";

import { createMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ path: "sign-in" }, { path: "sign-up" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string }>;
}): Promise<Metadata> {
  const { path } = await params;
  const mode = path === "sign-up" ? "Sign Up" : "Sign In";

  return createMetadata({
    title: mode,
    description: `${mode} to Can it run OpenClaw?.`,
    canonicalPath: `/auth/${path}`,
    indexable: false,
  });
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return (
    <main className="auth-page relative min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Ocean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-ocean-900 via-ocean-700 to-ocean-400" />

      {/* Deep water overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/30 via-transparent to-ocean-800/20" />

      {/* Underwater light rays */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.06]">
        <div className="absolute top-0 left-1/4 w-[2px] h-full bg-gradient-to-b from-white via-white/50 to-transparent rotate-[15deg] origin-top" />
        <div className="absolute top-0 left-1/2 w-[3px] h-full bg-gradient-to-b from-white via-white/40 to-transparent rotate-[-5deg] origin-top" />
        <div className="absolute top-0 right-1/4 w-[2px] h-[90%] bg-gradient-to-b from-white via-white/40 to-transparent rotate-[-8deg] origin-top" />
      </div>

      {/* Floating bubbles */}
      <div className="absolute bottom-[20%] left-[15%] w-3 h-3 rounded-full bg-white/10 animate-float" style={{ animationDelay: "0s", animationDuration: "4s" }} />
      <div className="absolute bottom-[40%] left-[25%] w-2 h-2 rounded-full bg-white/15 animate-float" style={{ animationDelay: "1.5s", animationDuration: "5s" }} />
      <div className="absolute bottom-[30%] right-[20%] w-4 h-4 rounded-full bg-white/8 animate-float" style={{ animationDelay: "0.8s", animationDuration: "6s" }} />
      <div className="absolute bottom-[50%] right-[30%] w-2 h-2 rounded-full bg-white/12 animate-float" style={{ animationDelay: "2.5s", animationDuration: "4.5s" }} />

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 w-full" style={{ height: "120px" }}>
        <svg
          className="absolute bottom-0 w-[110%] -left-[5%]"
          style={{ height: "120px", animation: "sway 10s ease-in-out infinite" }}
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 C200,90 380,30 580,65 C780,100 900,40 1100,55 C1300,70 1400,50 1440,50 L1440,120 L0,120 Z"
            fill="#CAF0F8"
            opacity="0.3"
          />
        </svg>
        <svg
          className="absolute bottom-0 w-[105%] -left-[2.5%]"
          style={{ height: "80px" }}
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
        >
          <path
            d="M0,35 C180,55 420,15 660,40 C900,65 1140,20 1440,38 L1440,80 L0,80 Z"
            fill="#F8F9FA"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/canitrunopenclawlogo.svg"
              alt="Can it run OpenClaw?"
              className="h-14 w-auto drop-shadow-lg mx-auto"
            />
            <h1 className="mt-4 font-heading text-3xl font-bold text-white drop-shadow-md">
              {path === "sign-up" ? "Join the crew" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-ocean-200/90">
              {path === "sign-up"
                ? "Create an account to rate devices and submit reports"
                : "Sign in to rate devices and submit compatibility reports"}
            </p>
          </div>
          <AuthView path={path} />
        </div>
      </div>
    </main>
  );
}
