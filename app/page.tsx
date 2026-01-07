"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInButton } from "@clerk/nextjs";
import RecommendationCard, { Recommendation } from "@/components/RecommendationCard";
import Link from "next/link";
import { Authenticated, Unauthenticated } from "convex/react";

export default function Home() {
  const latestRecs = useQuery(api.recommendations.listLatest, { limit: 5 });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-x-0 border-t-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold gradient-text">
            HypeShelf
          </Link>
          <div className="flex items-center gap-4">
            <Authenticated>
              <Link href="/dashboard" className="btn-primary text-sm">
                Post Your Hype
              </Link>
            </Authenticated>
            <Unauthenticated>
              <SignInButton mode="modal">
                <button className="btn-primary text-sm">
                  Sign in to add yours
                </button>
              </SignInButton>
            </Unauthenticated>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">HypeShelf</span>
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary mb-8">
            Collect and share the stuff you&apos;re hyped about.
          </p>
          <Unauthenticated>
            <SignInButton mode="modal">
              <button className="btn-primary text-lg px-8 py-4 pulse-glow">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start Sharing
              </button>
            </SignInButton>
          </Unauthenticated>
          <Authenticated>
            <Link href="/dashboard" className="btn-primary text-lg px-8 py-4 inline-flex pulse-glow">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Post Your Hype
            </Link>
          </Authenticated>
        </div>
      </section>

      {/* Latest Recommendations */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Latest Recommendations
            </h2>
            <span className="text-sm text-text-muted">
              From the community
            </span>
          </div>

          {latestRecs === undefined ? (
            // Loading skeleton
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-card p-5">
                  <div className="skeleton h-6 w-48 mb-3" />
                  <div className="skeleton h-4 w-24 mb-3" />
                  <div className="skeleton h-4 w-full mb-2" />
                  <div className="skeleton h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : latestRecs.length === 0 ? (
            // Empty state
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">No recommendations yet</h3>
              <p className="text-text-muted mb-6">
                Be the first to share something you&apos;re hyped about!
              </p>
              <Unauthenticated>
                <SignInButton mode="modal">
                  <button className="btn-primary">
                    Sign in to add yours
                  </button>
                </SignInButton>
              </Unauthenticated>
              <Authenticated>
                <Link href="/dashboard" className="btn-primary inline-flex">
                  Add Recommendation
                </Link>
              </Authenticated>
            </div>
          ) : (
            // Recommendations list
            <div className="space-y-4">
              {latestRecs.map((rec) => (
                <RecommendationCard
                  key={rec._id}
                  recommendation={rec as Recommendation}
                  showActions={false}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-card-border py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-text-muted text-sm">
          <p>Built with Next.js, Clerk, and Convex</p>
        </div>
      </footer>
    </div>
  );
}
