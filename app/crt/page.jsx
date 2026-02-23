"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import CheckAuth from "../../lib/CheckAuth";
import { CRT_PROGRAMS_DATA, CRT_COMMON_200HR, CRT_TECHNICAL_200HR } from "../../lib/crtProgramsData";
import {
  CodeBracketIcon,
  CpuChipIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";

const ICON_MAP = { code: CodeBracketIcon, cpu: CpuChipIcon };

const CRT_PROGRAMS = CRT_PROGRAMS_DATA.map((p) => ({
  ...p,
  icon: ICON_MAP[p.iconKey] || CodeBracketIcon,
}));

export default function CRTPage() {
  const router = useRouter();
  const [imageErrors, setImageErrors] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  return (
    <CheckAuth>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 pt-16">
        {/* Hero – CRT Banner image */}
        <div className="relative mt-[-80px] min-h-[280px] sm:min-h-[320px] md:min-h-[380px] text-white py-12 sm:py-16 px-4 sm:px-6 shadow-xl overflow-hidden">
          <Image
            src="/CRTImages/CRT Banner.jpg"
            alt="CRT Programmes"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-blue-900/40" aria-hidden="true" />
          <div className="relative max-w-4xl  text-black mx-auto text-center z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-2 text-sm font-medium mb-5 border border-white/20">
              <AcademicCapIcon className="w-4 h-4" />
              Campus Recruitment Training
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl  font-bold tracking-tight mb-4 drop-shadow-sm"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              Programmes
            </h1>
            {/* <p className=" text-black text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-3">
              Join well-planned courses that help you clear coding exams and technical interviews and get a job.
            </p> */}
            {/* <p className="text-black text-sm mt-14 font-semibold">
              400 hr programme • 200 hr Aptitude, Reasoning & Soft Skills + 200 hr Technical
            </p> */}
          </div>
        </div>

        {/* Program blocks */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8 sm:space-y-10">
          {CRT_PROGRAMS.map((program) => {
            const Icon = program.icon;
            const technicalCourses = CRT_TECHNICAL_200HR[program.id] || [];
            const showCourses = expandedId === program.id;

            return (
              <div
                key={program.id}
                className="group flex flex-col md:flex-row gap-0 bg-white rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60 border border-slate-200/80"
              >
                {/* Image / Courses area – always left */}
                <div
                  className="relative w-full md:w-[55%] aspect-[16/10] md:aspect-[2/1] shrink-0 overflow-hidden md:order-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedId((prev) => (prev === program.id ? null : program.id));
                  }}
                >
                  <div className="absolute inset-3 md:inset-4 rounded-2xl md:rounded-3xl overflow-hidden shadow-inner">
                    {/* Image */}
                    <div
                      className={`absolute inset-0 transition-all duration-400 ${
                        showCourses ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 group-hover:opacity-0 group-hover:scale-105"
                      }`}
                    >
                      <Image
                        src={imageErrors[program.id] ? "/LmsImg.jpg" : program.image}
                        alt={program.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 55vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={() => setImageErrors((prev) => ({ ...prev, [program.id]: true }))}
                      />
                    </div>
                    {/* Course list overlay: 200 hr common + 200 hr technical */}
                    <div
                      className={`absolute inset-0 flex flex-col justify-center p-5 md:p-6 transition-all duration-400 rounded-2xl md:rounded-3xl overflow-y-auto ${
                        showCourses
                          ? "opacity-100 bg-gradient-to-br from-[#1a5796] to-[#0d3a6e]"
                          : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:bg-gradient-to-br group-hover:from-[#1a5796] group-hover:to-[#0d3a6e]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                          <BookOpenIcon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white/95 font-semibold text-sm uppercase tracking-wider">400 hr programme</span>
                      </div>
                      {/* 200 hr – Aptitude, Reasoning, Soft Skills */}
                      <p className="text-white/90 text-xs font-semibold uppercase tracking-wider mb-2">200 hr – Aptitude, Reasoning & Soft Skills</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {CRT_COMMON_200HR.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/20 text-white text-xs font-medium border border-white/15"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                      {/* 200 hr – Technical */}
                      <p className="text-white/90 text-xs font-semibold uppercase tracking-wider mb-2">200 hr – Technical</p>
                      <div className="flex flex-wrap gap-1.5">
                        {technicalCourses.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/15 text-white text-xs font-medium backdrop-blur-sm border border-white/10"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 text-white/70 text-xs">
                        {showCourses ? "Tap again to show image" : "Hover or tap to see courses"}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Description – always right */}
                <div
                  className="flex-1 flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 md:py-12 md:order-2 md:pl-4"
                  onClick={() => router.push(`/crt/${program.id}`)}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl ${program.iconBg} ${program.iconColor} flex items-center justify-center shrink-0 shadow-sm`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{program.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className={`inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md ${program.bg} ${program.iconColor}`}>
                        {program.duration}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">400 hr programme</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-6 max-w-lg text-sm sm:text-base">
                      {program.description}
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00448a] hover:bg-[#003a76] text-white font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-[#00448a]/25 transition-all duration-200"
                    >
                      View Programme
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CheckAuth>
  );
}
