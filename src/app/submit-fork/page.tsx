"use client";

import { useState } from "react";
import Link from "next/link";
import { GitFork, Github, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { submitFork } from "@/app/actions";
import { authClient } from "@/lib/auth-client";

export default function SubmitForkPage() {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;

  const [name, setName] = useState("");
  const [githubUrl, setGithubUrl] = useState("https://github.com/");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Fork name is required"); return; }
    if (!githubUrl.startsWith("https://github.com/") || githubUrl.length < 25) {
      setError("A valid GitHub repository URL is required");
      return;
    }

    setSubmitting(true);
    try {
      await submitFork(name, githubUrl, description, language);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (session.isPending) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="h-64 rounded-xl bg-ocean-50 animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="rounded-xl border border-ocean-200 bg-white p-8 sm:p-12">
          <GitFork size={40} className="text-ocean-400 mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold text-navy mb-2">Submit a Fork</h1>
          <p className="text-navy-light mb-6">
            Sign in to submit your OpenClaw fork for review and benchmarking.
          </p>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center gap-2 rounded-lg bg-ocean-800 px-6 py-3 text-sm font-semibold text-white hover:bg-ocean-700 transition-colors"
          >
            Sign in to continue
          </Link>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="rounded-xl border border-ocean-200 bg-white p-8 sm:p-12">
          <CheckCircle2 size={48} className="text-verdict-great mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold text-navy mb-2">Fork Submitted!</h1>
          <p className="text-navy-light mb-6">
            Your fork has been submitted for review. We&apos;ll verify the repository
            and add it to the directory once approved. You can track the status from your profile.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-ocean-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ocean-700 transition-colors"
            >
              View in Profile
            </Link>
            <Link
              href="/forks"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-ocean-200 px-5 py-2.5 text-sm font-medium text-navy hover:bg-ocean-50 transition-colors"
            >
              Browse Forks
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-12">
      <Link
        href="/forks"
        className="inline-flex items-center gap-1 text-sm text-ocean-600 hover:text-ocean-800 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Forks
      </Link>

      <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-ocean-50">
            <GitFork size={20} className="text-ocean-600" />
          </div>
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-navy">Submit a Fork</h1>
            <p className="text-sm text-navy-light">Add your OpenClaw fork to the directory</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fork name */}
          <div>
            <label htmlFor="fork-name" className="block text-sm font-medium text-navy mb-1.5">
              Fork Name <span className="text-verdict-wont">*</span>
            </label>
            <input
              id="fork-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MiniClaw, NanoClaw, CloudClaw"
              maxLength={100}
              required
              className="w-full rounded-lg border border-ocean-200 px-4 py-2.5 text-sm text-navy placeholder:text-ocean-400 focus:border-ocean-400 focus:outline-none focus:ring-1 focus:ring-ocean-400"
            />
          </div>

          {/* GitHub URL */}
          <div>
            <label htmlFor="github-url" className="block text-sm font-medium text-navy mb-1.5">
              GitHub Repository <span className="text-verdict-wont">*</span>
            </label>
            <div className="relative">
              <Github size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-400" />
              <input
                id="github-url"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/your-org/your-fork"
                maxLength={500}
                required
                className="w-full rounded-lg border border-ocean-200 px-4 py-2.5 pl-10 text-sm text-navy placeholder:text-ocean-400 focus:border-ocean-400 focus:outline-none focus:ring-1 focus:ring-ocean-400"
              />
            </div>
            <p className="mt-1 text-xs text-navy-light">
              Must be a public GitHub repository
            </p>
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-navy mb-1.5">
              Primary Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-ocean-200 px-4 py-2.5 text-sm text-navy focus:border-ocean-400 focus:outline-none focus:ring-1 focus:ring-ocean-400 bg-white"
            >
              <option value="">Select language...</option>
              <option value="TypeScript">TypeScript</option>
              <option value="Python">Python</option>
              <option value="Rust">Rust</option>
              <option value="Go">Go</option>
              <option value="C">C</option>
              <option value="C++">C++</option>
              <option value="Swift">Swift</option>
              <option value="Elixir">Elixir</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-navy mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your fork — what makes it unique, target hardware, etc."
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg border border-ocean-200 px-4 py-2.5 text-sm text-navy placeholder:text-ocean-400 focus:border-ocean-400 focus:outline-none focus:ring-1 focus:ring-ocean-400 resize-none"
            />
            <p className="mt-1 text-xs text-navy-light text-right">
              {description.length}/1000
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-ocean-800 py-3 text-sm font-semibold text-white hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Fork for Review"}
          </button>

          <p className="text-xs text-navy-light text-center">
            Submissions are reviewed by the team. Approved forks will be added
            to the directory and queued for ClawBench benchmarking.
          </p>
        </form>
      </div>
    </main>
  );
}
