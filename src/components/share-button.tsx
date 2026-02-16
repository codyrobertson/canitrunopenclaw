"use client";

import { useState } from "react";
import { Share2, Check, Link2 } from "lucide-react";

export function ShareButton({
  title,
  text,
  className = "",
}: {
  title: string;
  text?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    // Try native share API (mobile browsers)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // User cancelled or not supported, fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-ocean-200 px-3 py-2 text-xs font-medium text-navy-light hover:text-ocean-800 hover:bg-ocean-50 hover:border-ocean-300 transition-colors ${className}`}
      title="Share this page"
    >
      {copied ? (
        <>
          <Check size={14} className="text-verdict-great" />
          <span className="text-verdict-great">Copied!</span>
        </>
      ) : (
        <>
          <Share2 size={14} />
          <span className="hidden min-[400px]:inline">Share</span>
        </>
      )}
    </button>
  );
}

export function ShareRow({
  title,
  text,
}: {
  title: string;
  text?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function shareToX() {
    const url = encodeURIComponent(window.location.href);
    const t = encodeURIComponent(text ?? title);
    window.open(`https://x.com/intent/tweet?text=${t}&url=${url}`, "_blank", "noopener,noreferrer,width=550,height=420");
  }

  async function nativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text, url: window.location.href });
    } catch {
      // cancelled
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-lg border border-ocean-200 px-3 py-2 text-xs font-medium text-navy-light hover:text-ocean-800 hover:bg-ocean-50 transition-colors"
        title="Copy link"
      >
        {copied ? (
          <>
            <Check size={14} className="text-verdict-great" />
            <span className="text-verdict-great">Copied!</span>
          </>
        ) : (
          <>
            <Link2 size={14} />
            <span>Copy link</span>
          </>
        )}
      </button>
      <button
        onClick={shareToX}
        className="inline-flex items-center gap-1.5 rounded-lg border border-ocean-200 px-3 py-2 text-xs font-medium text-navy-light hover:text-ocean-800 hover:bg-ocean-50 transition-colors"
        title="Share on X"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span>Post</span>
      </button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          onClick={nativeShare}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ocean-200 px-3 py-2 text-xs font-medium text-navy-light hover:text-ocean-800 hover:bg-ocean-50 transition-colors md:hidden"
          title="Share"
        >
          <Share2 size={14} />
          <span>More</span>
        </button>
      )}
    </div>
  );
}
