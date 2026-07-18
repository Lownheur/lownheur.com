import type { ResourceName } from "@/server/domain/resources";

export function ResourceIllustration({
  resource,
  className = "resource-illustration"
}: {
  resource: ResourceName;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 240 160",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true
  } as const;

  if (resource === "categories") {
    return (
      <svg {...common}>
        <path className="illustration-fill-soft" d="M35 48c0-9 7-16 16-16h45l14 16h79c9 0 16 7 16 16v63c0 9-7 16-16 16H51c-9 0-16-7-16-16V48Z" />
        <path className="illustration-fill" d="M35 67h170v60c0 9-7 16-16 16H51c-9 0-16-7-16-16V67Z" />
        <path className="illustration-stroke" d="M35 67h170M67 99h60M67 116h92" />
        <circle className="illustration-accent" cx="174" cy="101" r="18" />
        <path className="illustration-accent-stroke" d="m166 101 6 6 11-13" />
      </svg>
    );
  }

  if (resource === "events") {
    return (
      <svg {...common}>
        <rect className="illustration-fill" x="43" y="31" width="154" height="113" rx="18" />
        <path className="illustration-stroke" d="M43 67h154M78 23v25M162 23v25" />
        <circle className="illustration-accent" cx="83" cy="99" r="19" />
        <path className="illustration-accent-stroke" d="M83 88v12l8 5" />
        <path className="illustration-stroke" d="M119 93h49M119 110h37" />
        <circle className="illustration-dot" cx="181" cy="43" r="20" />
        <path className="illustration-dot-stroke" d="m181 31 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8Z" />
      </svg>
    );
  }

  if (resource === "goals") {
    return (
      <svg {...common}>
        <circle className="illustration-fill" cx="113" cy="84" r="57" />
        <circle className="illustration-fill-soft" cx="113" cy="84" r="36" />
        <circle className="illustration-accent" cx="113" cy="84" r="16" />
        <path className="illustration-stroke" d="M57 138 169 26" />
        <path className="illustration-dot" d="m165 22 27-5-5 27-14 3-5 14-16-16 13-5V22Z" />
        <path className="illustration-accent-stroke" d="m104 84 7 7 14-17" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect className="illustration-fill" x="43" y="29" width="154" height="116" rx="18" />
      <path className="illustration-stroke" d="M43 65h154M77 21v24M163 21v24" />
      <path className="illustration-fill-soft" d="M65 83h28v22H65zM105 83h28v22h-28zM145 83h28v22h-28zM65 115h28v18H65zM105 115h28v18h-28z" />
      <circle className="illustration-accent" cx="166" cy="124" r="25" />
      <path className="illustration-accent-stroke" d="M166 110v15l10 6" />
    </svg>
  );
}
