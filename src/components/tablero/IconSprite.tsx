// Sprite de íconos SVG calcado de mockup.html (los <symbol> del <defs>).
export default function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFC107" />
          <stop offset="45%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>

        <symbol id="i-instagram" viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="url(#ig-grad)" strokeWidth="2" />
          <circle cx="12" cy="12" r="5" fill="none" stroke="url(#ig-grad)" strokeWidth="2" />
          <circle cx="17.3" cy="6.7" r="1.4" fill="url(#ig-grad)" />
        </symbol>
        <symbol id="i-facebook" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#1877F2" />
          <path
            d="M13.6 21v-7.2h2.3l.35-2.8h-2.65V9.2c0-.8.2-1.35 1.35-1.35h1.42V5.7c-.25-.03-1.1-.1-2.1-.1-2.1 0-3.5 1.28-3.5 3.62v2.06H8.6v2.8h2.17V21z"
            fill="#fff"
          />
        </symbol>
        <symbol id="i-linkedin" viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" />
          <circle cx="7.6" cy="7.8" r="1.7" fill="#fff" />
          <rect x="6.3" y="10.4" width="2.6" height="7.7" fill="#fff" />
          <path
            d="M11.4 10.4h2.5v1.2h.04c.35-.65 1.2-1.4 2.5-1.4 2.68 0 3.17 1.73 3.17 3.98v4.9h-2.6v-4.34c0-1.04-.02-2.36-1.44-2.36-1.45 0-1.67 1.12-1.67 2.28v4.42h-2.6z"
            fill="#fff"
          />
        </symbol>
        <symbol id="i-youtube" viewBox="0 0 24 24">
          <rect x="1.2" y="5" width="21.6" height="14" rx="5" fill="#FF0000" />
          <path d="M10 8.7l6.2 3.3-6.2 3.3z" fill="#fff" />
        </symbol>
        <symbol id="i-tiktok" viewBox="0 0 24 24">
          <path
            d="M13.6 3v11.6a2.6 2.6 0 1 1-2.6-2.6c.18 0 .35.01.52.04V9.4a5.1 5.1 0 1 0 4.58 5.07V9.7c1.02.72 2.24 1.14 3.6 1.14V8.14c-2.05-.16-3.68-1.74-4.1-3.77z"
            fill="#010101"
            transform="translate(-0.6,0)"
          />
          <path
            d="M13 3v11.6a2.6 2.6 0 1 1-2.6-2.6c.18 0 .35.01.52.04V9.4a5.1 5.1 0 1 0 4.58 5.07"
            fill="none"
            stroke="#25F4EE"
            strokeWidth="0.7"
            opacity="0.85"
            transform="translate(-1.3,0.5)"
          />
          <path
            d="M13 3v11.6a2.6 2.6 0 1 1-2.6-2.6c.18 0 .35.01.52.04V9.4a5.1 5.1 0 1 0 4.58 5.07"
            fill="none"
            stroke="#FE2C55"
            strokeWidth="0.7"
            opacity="0.85"
            transform="translate(0.1,-0.5)"
          />
        </symbol>
        <symbol id="i-email" viewBox="0 0 24 24">
          <rect x="2" y="4.5" width="20" height="15" rx="3" fill="#6E6E73" />
          <path
            d="M3 6.5l9 6.2 9-6.2"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-newsletter" viewBox="0 0 24 24">
          <rect x="3" y="3" width="15" height="18" rx="2" fill="#5E5CE6" />
          <rect x="6.5" y="7" width="8" height="1.6" rx="0.8" fill="#fff" />
          <rect x="6.5" y="10.4" width="8" height="1.6" rx="0.8" fill="#fff" />
          <rect x="6.5" y="13.8" width="5" height="1.6" rx="0.8" fill="#fff" />
        </symbol>
        <symbol id="i-copy" viewBox="0 0 24 24">
          <path d="M6 4h9l3 3v13H6z" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" />
        </symbol>
        <symbol id="i-material" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M8 5v14M16 5v14M3 9h5M3 15h5M16 9h5M16 15h5" stroke="currentColor" strokeWidth="2" />
        </symbol>
        <symbol id="i-portada" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
          <path d="M21 16l-5.5-5.5L5 20" fill="none" stroke="currentColor" strokeWidth="2" />
        </symbol>
        <symbol id="i-notas" viewBox="0 0 24 24">
          <path d="M4 4h13l3 3v13H4z" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M17 4v3h3" fill="none" stroke="currentColor" strokeWidth="2" />
        </symbol>
        <symbol id="i-publicado" viewBox="0 0 24 24">
          <path d="M10 14L21 3M21 3h-6M21 3v6" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </symbol>
        <symbol id="i-chevron" viewBox="0 0 24 24">
          <path
            d="M9 5l7 7-7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-chevron-left" viewBox="0 0 24 24">
          <path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-plus" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </symbol>
        <symbol id="i-filter" viewBox="0 0 24 24">
          <path
            d="M4 5h16l-6 7.5V19l-4 2v-8.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-download" viewBox="0 0 24 24">
          <path
            d="M12 4v11M7 10l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M4 18h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </symbol>
        <symbol id="i-upload" viewBox="0 0 24 24">
          <path
            d="M12 15V4M7 9l5-5 5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M4 18h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </symbol>
        <symbol id="i-trash" viewBox="0 0 24 24">
          <path
            d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </symbol>
        <symbol id="i-duplicate" viewBox="0 0 24 24">
          <rect x="8" y="8" width="13" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </symbol>
        <symbol id="i-save" viewBox="0 0 24 24">
          <path d="M5 4h11l3 3v13H5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 4v6h7V4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 20v-6h8v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-open" viewBox="0 0 24 24">
          <path
            d="M9 15L20 4M20 4h-6M20 4v6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </symbol>
      </defs>
    </svg>
  );
}
