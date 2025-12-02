'use client';

import { VariantSwitch } from './VariantSwitch';
import { useAdventDay } from './AdventDayContext';

interface HeaderProps {
  onAboutClick: () => void;
}

function AboutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.3899 13.8503C7.66233 13.8503 6.95592 13.7063 6.29181 13.4236C5.6497 13.1503 5.07356 12.7594 4.57863 12.2613C4.08371 11.7631 3.69456 11.1833 3.42384 10.5369C3.14296 9.86763 3 9.15745 3 8.42513C3 7.6928 3.14298 6.98177 3.42384 6.31332C3.69541 5.66701 4.08373 5.08711 4.57863 4.58895C5.07356 4.09079 5.64967 3.6991 6.29181 3.42661C6.95676 3.1439 7.66233 3 8.3899 3C9.11747 3 9.82388 3.14391 10.488 3.42661C11.1301 3.69995 11.7062 4.09081 12.2012 4.58895C12.6961 5.08709 13.0852 5.66699 13.356 6.31332C13.6368 6.98262 13.7798 7.6928 13.7798 8.42513C13.7798 9.15745 13.6368 9.86848 13.356 10.5369C13.0844 11.1832 12.6961 11.7631 12.2012 12.2613C11.7062 12.7595 11.1301 13.1512 10.488 13.4236C9.82388 13.7064 9.11747 13.8503 8.3899 13.8503ZM8.3899 3.50845C5.69784 3.50845 3.50673 5.71388 3.50673 8.42354C3.50673 11.1332 5.69784 13.3386 8.3899 13.3386C11.082 13.3386 13.2731 11.1332 13.2731 8.42354C13.2739 5.71388 11.0837 3.50845 8.3899 3.50845Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.94875 6.21672C7.81597 6.164 7.74189 6.03381 7.78414 5.92739L7.92343 5.57654C7.96568 5.47013 8.10888 5.42619 8.24166 5.4789C8.37444 5.53161 8.44852 5.66181 8.40627 5.76823L8.26698 6.11908C8.22448 6.22614 8.08153 6.26943 7.94875 6.21672Z"
        fill="currentColor"
      />
      <path
        d="M7.56983 7C6.48985 9.56245 6.76001 12.9791 9.99988 9.56245"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Header({ onAboutClick }: HeaderProps) {
  const { variant } = useAdventDay();

  return (
    <header className="flex flex-col md:grid grid-cols-3 md:items-center justify-between px-6 py-4 md:py-8 gap-8">
      <h1
        className={`text-5xl md:text-6xl font-light italic font-title select-none ${
          variant === 'light' ? 'text-zinc-900' : 'text-white'
        }`}
        onDoubleClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
        style={{
          textShadow: '0px .5px 0px currentColor, 0.5px 0px 0px currentColor',
        }}
      >
        <span
          style={{
            textShadow: '0px 1px 0px currentColor',
          }}
        >
          Adven
        </span>
        <span
          style={{
            textShadow: '0px 1px 0px currentColor, 1px 0px 0px currentColor',
          }}
        >
          TOZ
        </span>
      </h1>

      <VariantSwitch />

      <button
        onClick={onAboutClick}
        className={`text-sm font-medium transition-colors mr-4 cursor-pointer absolute top-6 right-4 md:static  justify-self-end ${
          variant === 'light'
            ? 'text-zinc-600 hover:text-zinc-900'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        <AboutIcon className="w-8 h-8" />
      </button>
    </header>
  );
}
