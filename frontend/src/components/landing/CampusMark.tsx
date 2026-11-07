/** Original UBC Ver. campus motif: an open arch, shared horizon, and stream.
 * Not the UBC crest or an official University of British Columbia mark. */
export function CampusMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 48" fill="none" aria-hidden="true">
      <path d="M6 23V14C6 8.5 13.2 4 22 4s16 4.5 16 10v9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11 23V15c0-3.7 4.9-6.6 11-6.6S33 11.3 33 15v8M4 27h36M17 27v12m10-12v12M12 43h20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 14h2l-1 6 5 2-5 2-1 5-1-5-5-2 5-2 1-6Z" fill="currentColor" />
    </svg>
  )
}
