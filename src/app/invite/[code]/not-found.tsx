import Link from "next/link";
import { CeremonyIllustration } from "@/components/CeremonyIllustration";

export default function InviteNotFound() {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#1f1b16] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[460px] rounded-2xl p-2 bg-[#fdfbf7] border border-[#1f1b16]/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
        <div className="rounded-lg border border-[#1f1b16]/10 px-8 py-10 text-center flex flex-col items-center">
          <CeremonyIllustration
            kind="crest"
            accentColor="#a63429"
            inkColor="#1f1b16"
            className="w-20 h-20 mb-5"
          />
          <p className="text-[12px] font-mono-tabular text-[#7b7266] mb-2">
            Invitation lookup
          </p>
          <h1 className="font-serif-display text-[28px] leading-[1.15] font-normal mb-2">
            Invitation code not found
          </h1>
          <p className="text-[14px] text-[#5e554a] leading-relaxed mb-6">
            This personal invitation link may have been mistyped or removed by the host family. Please check the link sent to you on WhatsApp.
          </p>
          <Link
            href="/"
            className="h-9 px-4 rounded-lg inline-flex items-center justify-center text-[13px] font-medium bg-[#efe9df] border border-[#1f1b16]/10 text-[#1f1b16] hover:bg-[#e7dfd2] transition-colors duration-150"
          >
            Host dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
